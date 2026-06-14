-- =============================================================================
-- 0003_functions.sql  —  RPCs (security definer), trigger de auth, y crons.
--
-- Contenido:
--   1. handle_new_user()        — crea profiles al registrarse (auth.users).
--   2. calc_deposit_cents()     — seña con piso $1.000, tope <= price, sin exención.
--   3. crear_hold(...)          — RPC: inserta el hold respetando el EXCLUDE;
--                                 captura 23P01 -> error claro; hold anónimo o auth.
--   4. slots_publicos(...)      — RPC: disponibilidad pública derivada al vuelo.
--   5. expire_holds()           — barre holds vencidos (cron 1 min).
--   6. heartbeat helper + recomendación de pg_cron (expirar / reconciliar / latido).
--
-- Parámetros del motor (app_settings, defaults del PLAN §6):
--   TZ='America/Argentina/Buenos_Aires', GRANULARITY=15, BUFFER_AFTER=5,
--   HOLD_TTL=12, HORIZON=14d, MIN_LEAD=60, deposit_floor=100000, cancel_window=4h.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1. handle_new_user  —  al insertarse una fila en auth.users, crea su profile.
-- Toma full_name/phone de raw_user_meta_data si vienen del signUp.
-- security definer para escribir en public.profiles bajo RLS.
-- -----------------------------------------------------------------------------
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, full_name, email, phone)
  values (
    new.id,
    coalesce(nullif(new.raw_user_meta_data ->> 'full_name', ''), new.email, 'Cliente'),
    new.email,
    nullif(new.raw_user_meta_data ->> 'phone', '')
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- -----------------------------------------------------------------------------
-- 2. calc_deposit_cents  —  seña = max(piso, ceil(price*pct/100)), tope <= price.
-- SIN exención por umbral de precio. deposit_pct=0 => seña 0 (servicio sin seña).
-- Piso configurable vía app_settings('deposit_floor_cents'); default $1.000.
-- -----------------------------------------------------------------------------
create or replace function public.calc_deposit_cents(p_price_cents int, p_deposit_pct smallint)
returns int
language plpgsql
stable
set search_path = ''
as $$
declare
  v_floor int;
  v_pct   int;
begin
  if p_deposit_pct = 0 then
    return 0;  -- servicio sin seña (decisión explícita del admin)
  end if;

  select coalesce((value #>> '{}')::int, 100000)
    into v_floor
    from public.app_settings
    where key = 'deposit_floor_cents';
  v_floor := coalesce(v_floor, 100000);

  -- ceil(price * pct / 100) con aritmética entera.
  v_pct := ((p_price_cents::bigint * p_deposit_pct) + 99) / 100;

  -- max(piso, pct) y tope <= price.
  return least(p_price_cents, greatest(v_floor, v_pct));
end;
$$;

-- -----------------------------------------------------------------------------
-- 3. crear_hold  —  CORAZÓN anti-doble-reserva.
-- Inserta un appointment en estado 'hold'. El EXCLUDE no_double_booking serializa
-- inserts concurrentes: uno gana, el otro recibe 23P01 que acá capturamos y
-- re-lanzamos como un error de aplicación claro y estable.
--
-- Identidad del hold (uno u otro, no ambos):
--   - autenticado:  p_customer_id = auth.uid()  (o lo pasa el server con la sesión)
--   - anónimo:      p_anon_session_id (pre-auth). customer_id queda NULL.
--
-- security definer: es la ÚNICA vía para insertar en appointments (la RLS niega
-- el insert directo). Por eso valida todo server-side: slot, lead, horizonte,
-- buffer, working_hours, time_off, y recalcula price/deposit desde la DB
-- (el cliente NUNCA envía montos).
--
-- Devuelve la fila del appointment creado (incluye deposit_cents para el pago).
-- -----------------------------------------------------------------------------
create or replace function public.crear_hold(
  p_service_id      uuid,
  p_barber_id       uuid,
  p_starts_at       timestamptz,
  p_customer_id     uuid    default null,
  p_anon_session_id text    default null,
  p_customer_notes  text    default null
)
returns public.appointments
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_tz             text;
  v_granularity    int;
  v_buffer         int;
  v_hold_ttl       int;
  v_horizon_days   int;
  v_min_lead       int;
  v_service        public.services;
  v_barber         public.barbers;
  v_ends_at        timestamptz;
  v_weekday        smallint;
  v_start_min      int;
  v_occupied_min   int;
  v_deposit        int;
  v_existing       int;
  v_row            public.appointments;
begin
  -- Exactamente una identidad.
  if (p_customer_id is null) = (p_anon_session_id is null) then
    raise exception 'hold_identity_invalid'
      using detail = 'Debe especificarse customer_id O anon_session_id, no ambos ni ninguno.';
  end if;

  -- Cargar parámetros del motor.
  select coalesce((value #>> '{}'), 'America/Argentina/Buenos_Aires') into v_tz
    from public.app_settings where key = 'timezone';
  v_tz := coalesce(v_tz, 'America/Argentina/Buenos_Aires');

  select coalesce((value #>> '{}')::int, 15)  into v_granularity  from public.app_settings where key = 'granularity_min';
  select coalesce((value #>> '{}')::int, 5)   into v_buffer       from public.app_settings where key = 'buffer_after_min';
  select coalesce((value #>> '{}')::int, 12)  into v_hold_ttl     from public.app_settings where key = 'hold_ttl_min';
  select coalesce((value #>> '{}')::int, 14)  into v_horizon_days from public.app_settings where key = 'horizon_days';
  select coalesce((value #>> '{}')::int, 60)  into v_min_lead     from public.app_settings where key = 'min_lead_min';
  v_granularity  := coalesce(v_granularity, 15);
  v_buffer       := coalesce(v_buffer, 5);
  v_hold_ttl     := coalesce(v_hold_ttl, 12);
  v_horizon_days := coalesce(v_horizon_days, 14);
  v_min_lead     := coalesce(v_min_lead, 60);

  -- Servicio y barbero válidos y activos.
  select * into v_service from public.services where id = p_service_id and is_active;
  if not found then
    raise exception 'service_unavailable' using detail = 'Servicio inexistente o inactivo.';
  end if;

  select * into v_barber from public.barbers where id = p_barber_id and is_active;
  if not found then
    raise exception 'barber_unavailable' using detail = 'Barbero inexistente o inactivo.';
  end if;

  -- El barbero hace ese servicio.
  if not exists (
    select 1 from public.barber_services
    where barber_id = p_barber_id and service_id = p_service_id
  ) then
    raise exception 'barber_service_mismatch' using detail = 'Ese barbero no realiza ese servicio.';
  end if;

  -- Duración ocupada = duración + buffer. ends_at incluye el buffer.
  v_occupied_min := v_service.duration_min + v_buffer;
  v_ends_at := p_starts_at + make_interval(mins => v_occupied_min);

  -- El inicio debe caer en la grilla de granularidad (en TZ AR).
  v_start_min := extract(hour   from (p_starts_at at time zone v_tz)) * 60
               + extract(minute from (p_starts_at at time zone v_tz));
  if (v_start_min % v_granularity) <> 0
     or extract(second from (p_starts_at at time zone v_tz)) <> 0 then
    raise exception 'slot_misaligned'
      using detail = 'El inicio no respeta la granularidad de ' || v_granularity || ' minutos.';
  end if;

  -- Lead mínimo y horizonte.
  if p_starts_at < now() + make_interval(mins => v_min_lead) then
    raise exception 'slot_too_soon'
      using detail = 'El turno debe reservarse con al menos ' || v_min_lead || ' minutos de anticipación.';
  end if;
  if p_starts_at > now() + make_interval(days => v_horizon_days) then
    raise exception 'slot_out_of_horizon'
      using detail = 'Fuera del horizonte de ' || v_horizon_days || ' días.';
  end if;

  -- weekday calculado EN TZ AR (0=domingo).
  v_weekday := extract(dow from (p_starts_at at time zone v_tz))::smallint;

  -- El [start, end) debe caer COMPLETO dentro de alguna franja de working_hours
  -- de ese día/barbero. duracionOcupada <= end_min (misma regla que generarSlots).
  if not exists (
    select 1
    from public.working_hours wh
    where wh.barber_id = p_barber_id
      and wh.weekday = v_weekday
      and wh.is_active
      and v_start_min >= wh.start_min
      and (v_start_min + v_occupied_min) <= wh.end_min
  ) then
    raise exception 'outside_working_hours'
      using detail = 'El horario solicitado está fuera del horario de atención.';
  end if;

  -- No debe solaparse con un bloqueo (time_off del barbero o de todo el local).
  if exists (
    select 1
    from public.time_off t
    where (t.barber_id = p_barber_id or t.barber_id is null)
      and tstzrange(t.starts_at, t.ends_at, '[)') && tstzrange(p_starts_at, v_ends_at, '[)')
  ) then
    raise exception 'slot_blocked'
      using detail = 'El horario solicitado está bloqueado.';
  end if;

  -- Anti-duplicado del propio usuario: máximo 1 hold vivo por identidad.
  if p_customer_id is not null then
    select count(*) into v_existing
      from public.appointments
      where customer_id = p_customer_id
        and status = 'hold'
        and hold_expires_at > now();
  else
    select count(*) into v_existing
      from public.appointments
      where anon_session_id = p_anon_session_id
        and status = 'hold'
        and hold_expires_at > now();
  end if;
  if v_existing > 0 then
    raise exception 'hold_already_exists'
      using detail = 'Ya tenés una reserva en proceso. Completala o esperá a que expire.';
  end if;

  -- Seña (server-side, snapshot).
  v_deposit := public.calc_deposit_cents(v_service.price_cents, v_service.deposit_pct);

  -- INSERT que dispara el EXCLUDE. Si choca con un hold/confirmada solapado del
  -- mismo barbero => 23P01, capturado abajo.
  begin
    insert into public.appointments (
      customer_id, anon_session_id,
      barber_id, service_id,
      service_name_snapshot, duration_min_snapshot,
      starts_at, ends_at,
      status, price_cents, deposit_cents,
      hold_expires_at, customer_notes
    ) values (
      p_customer_id, p_anon_session_id,
      p_barber_id, p_service_id,
      v_service.name, v_service.duration_min,
      p_starts_at, v_ends_at,
      'hold', v_service.price_cents, v_deposit,
      now() + make_interval(mins => v_hold_ttl), p_customer_notes
    )
    returning * into v_row;
  exception
    when exclusion_violation then  -- SQLSTATE 23P01
      raise exception 'slot_taken'
        using detail = 'Ese horario se acaba de ocupar. Elegí otro.';
  end;

  return v_row;
end;
$$;

-- anon y authenticated pueden ejecutar la RPC (es la única vía de alta).
grant execute on function public.crear_hold(uuid, uuid, timestamptz, uuid, text, text)
  to anon, authenticated;

-- -----------------------------------------------------------------------------
-- 4. slots_publicos  —  disponibilidad pública derivada al vuelo para un
-- (barbero, servicio, día). Devuelve los inicios de slot ofrecibles.
--
-- Modelo derivado: NO hay tabla de slots. Se generan las franjas de
-- working_hours del día (en TZ AR), se cortan en granularidad, y se descartan
-- los que: caen antes de now+MIN_LEAD, exceden el horizonte, solapan time_off,
-- o solapan un appointment ocupante (hold vivo / confirmada / completada / no_show).
--
-- Es security definer porque lee time_off (sin lectura pública) sin exponer
-- 'reason'. Solo retorna timestamps libres.
--
-- p_day: fecha local AR ('2026-06-20'). Se interpreta en TZ AR.
-- -----------------------------------------------------------------------------
create or replace function public.slots_publicos(
  p_barber_id  uuid,
  p_service_id uuid,
  p_day        date
)
returns table (slot_start timestamptz)
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_tz           text;
  v_granularity  int;
  v_buffer       int;
  v_min_lead     int;
  v_horizon_days int;
  v_service      public.services;
  v_weekday      smallint;
  v_occupied_min int;
begin
  select coalesce((value #>> '{}'), 'America/Argentina/Buenos_Aires') into v_tz
    from public.app_settings where key = 'timezone';
  v_tz := coalesce(v_tz, 'America/Argentina/Buenos_Aires');

  select coalesce((value #>> '{}')::int, 15) into v_granularity  from public.app_settings where key = 'granularity_min';
  select coalesce((value #>> '{}')::int, 5)  into v_buffer       from public.app_settings where key = 'buffer_after_min';
  select coalesce((value #>> '{}')::int, 60) into v_min_lead     from public.app_settings where key = 'min_lead_min';
  select coalesce((value #>> '{}')::int, 14) into v_horizon_days from public.app_settings where key = 'horizon_days';
  v_granularity  := coalesce(v_granularity, 15);
  v_buffer       := coalesce(v_buffer, 5);
  v_min_lead     := coalesce(v_min_lead, 60);
  v_horizon_days := coalesce(v_horizon_days, 14);

  select * into v_service from public.services where id = p_service_id and is_active;
  if not found then
    return;  -- servicio inactivo => sin slots
  end if;
  if not exists (
    select 1 from public.barbers where id = p_barber_id and is_active
  ) then
    return;
  end if;
  if not exists (
    select 1 from public.barber_services
    where barber_id = p_barber_id and service_id = p_service_id
  ) then
    return;
  end if;

  v_occupied_min := v_service.duration_min + v_buffer;
  -- p_day ya es la fecha CALENDARIA local AR; su dow se extrae directo de la
  -- fecha (NO via timezone, que podría correrlo al día previo/siguiente).
  v_weekday := extract(dow from p_day)::smallint;

  return query
  with grid as (
    -- Inicios candidatos: cada franja de working_hours cortada en granularidad.
    -- El inicio local (minutos) se reconstruye como timestamptz en TZ AR.
    select
      ((p_day::text || ' 00:00')::timestamp + make_interval(mins => m.start_min))
        at time zone v_tz as slot_ts,
      m.start_min,
      wh.end_min
    from public.working_hours wh
    cross join lateral generate_series(
      wh.start_min,
      wh.end_min - v_occupied_min,
      v_granularity
    ) as m(start_min)
    where wh.barber_id = p_barber_id
      and wh.weekday = v_weekday
      and wh.is_active
  )
  select g.slot_ts
  from grid g
  where
    -- lead mínimo y horizonte
    g.slot_ts >= now() + make_interval(mins => v_min_lead)
    and g.slot_ts <= now() + make_interval(days => v_horizon_days)
    -- no solapa bloqueos
    and not exists (
      select 1 from public.time_off t
      where (t.barber_id = p_barber_id or t.barber_id is null)
        and tstzrange(t.starts_at, t.ends_at, '[)')
            && tstzrange(g.slot_ts, g.slot_ts + make_interval(mins => v_occupied_min), '[)')
    )
    -- no solapa un turno ocupante (hold vivo, confirmada, completada, no_show)
    and not exists (
      select 1 from public.appointments a
      where a.barber_id = p_barber_id
        and a.status in ('hold', 'confirmada', 'completada', 'no_show')
        and (a.status <> 'hold' or a.hold_expires_at > now())
        and a.time_range
            && tstzrange(g.slot_ts, g.slot_ts + make_interval(mins => v_occupied_min), '[)')
    )
  order by g.slot_ts;
end;
$$;

grant execute on function public.slots_publicos(uuid, uuid, date) to anon, authenticated;

-- -----------------------------------------------------------------------------
-- 5. expire_holds  —  barre holds vencidos. Lo corre pg_cron cada 1 min.
-- Regla anti-carrera webhook↔cron: NO expira un hold que tenga un payment vivo
-- (pending/in_process/approved) — el webhook puede estar por confirmarlo.
-- Emite heartbeat en cron_health.
-- -----------------------------------------------------------------------------
create or replace function public.expire_holds()
returns int
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_count int;
begin
  update public.appointments a
     set status = 'expirada'
   where a.status = 'hold'
     and a.hold_expires_at <= now()
     and not exists (
       select 1 from public.payments p
       where p.appointment_id = a.id
         and p.status in ('pending', 'in_process', 'approved')
     );
  get diagnostics v_count = row_count;

  insert into public.cron_health (job_name, last_run_at, last_status, last_detail, runs_total)
  values ('expire_holds', now(), 'ok', 'expirados=' || v_count, 1)
  on conflict (job_name) do update
    set last_run_at = now(),
        last_status = 'ok',
        last_detail = 'expirados=' || v_count,
        runs_total  = public.cron_health.runs_total + 1;

  return v_count;
end;
$$;

-- -----------------------------------------------------------------------------
-- 6. heartbeat  —  helper para que los crons server-side (reconciliador de pagos,
-- dispatcher de notificaciones) registren su latido. Lo invoca el código del
-- Route Handler /api/cron/* con service_role, o un pg_cron que llame a pg_net.
-- -----------------------------------------------------------------------------
create or replace function public.cron_heartbeat(
  p_job_name text,
  p_status   text default 'ok',
  p_detail   text default null
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.cron_health (job_name, last_run_at, last_status, last_detail, runs_total)
  values (p_job_name, now(), p_status, p_detail, 1)
  on conflict (job_name) do update
    set last_run_at = now(),
        last_status = p_status,
        last_detail = p_detail,
        runs_total  = public.cron_health.runs_total + 1;
end;
$$;

-- =============================================================================
-- RECOMENDACIÓN: programación con pg_cron
-- =============================================================================
-- pg_cron y pg_net se habilitan desde el dashboard de Supabase
-- (Database > Extensions). Una vez habilitados, registrar los jobs.
-- Ejecutar el bloque de abajo como postgres/owner (NO se corre automáticamente
-- en esta migración para no fallar en entornos sin pg_cron; ver SUPABASE-SETUP.md).
--
--   -- (a) Expirar holds vencidos cada 1 minuto (barato, sin lock; ventana de
--   --     "slot fantasma" <= 1 min, aceptable para el volumen actual).
--   select cron.schedule(
--     'flow-expire-holds',
--     '* * * * *',
--     $$ select public.expire_holds(); $$
--   );
--
--   -- (b) Reconciliador de pagos: llama al Route Handler /api/cron/reconciliar
--   --     (que consulta /v1/payments/search en MP para holds 'pending' sin
--   --     webhook) usando pg_net + CRON_SECRET. Cada 5 min.
--   select cron.schedule(
--     'flow-reconcile-payments',
--     '*/5 * * * *',
--     $$
--       select net.http_post(
--         url     := current_setting('app.base_url') || '/api/cron/reconciliar',
--         headers := jsonb_build_object(
--                      'Content-Type', 'application/json',
--                      'Authorization', 'Bearer ' || current_setting('app.cron_secret')
--                    ),
--         body    := '{}'::jsonb
--       );
--     $$
--   );
--
--   -- (c) Heartbeat-check: alerta si un cron no latió. Llama a /api/cron/heartbeat
--   --     que revisa cron_health y notifica ALERTS_WEBHOOK_URL. Cada 5 min.
--   select cron.schedule(
--     'flow-heartbeat-check',
--     '*/5 * * * *',
--     $$
--       select net.http_post(
--         url     := current_setting('app.base_url') || '/api/cron/heartbeat',
--         headers := jsonb_build_object(
--                      'Content-Type', 'application/json',
--                      'Authorization', 'Bearer ' || current_setting('app.cron_secret')
--                    ),
--         body    := '{}'::jsonb
--       );
--     $$
--   );
--
--   -- (d) Recordatorio diario a barberos (M2): resumen del día siguiente ~20:00 AR
--   --     (= 23:00 UTC aprox.; ajustar por DST si aplica). Cada día.
--   --   select cron.schedule('flow-daily-reminder', '0 23 * * *',
--   --     $$ select net.http_post( url := current_setting('app.base_url')
--   --        || '/api/cron/recordatorios', ...); $$);
--
-- Las GUC current_setting('app.base_url') / current_setting('app.cron_secret')
-- se setean con:  alter database postgres set app.base_url = 'https://...';
-- (ver SUPABASE-SETUP.md). Alternativa sin pg_cron: Vercel Cron pegándole a los
-- mismos Route Handlers /api/cron/* (PLAN §14 P6).
--
-- NOTA sobre advisory lock (PLAN §6): por defecto NO se usa
-- pg_advisory_xact_lock en crear_hold (sobre-diseño para el volumen actual). El
-- EXCLUDE + expire_holds cada 1 min son suficientes en v1. Si aparece la métrica
-- de "slot fantasma", activar el lock como opt-in (variante *_xact_lock, segura
-- en transaction pooling) al inicio de crear_hold.
-- =============================================================================
