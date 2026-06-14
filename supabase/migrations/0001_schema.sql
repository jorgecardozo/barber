-- =============================================================================
-- 0001_schema.sql  —  Flow Site / App de turnos
-- Esquema de producción: extensiones, enums, tablas, constraints e índices.
--
-- Decisiones fijas (ver docs/PLAN-etapa2-turnos.md §4, §6, §7, §15, §16):
--   - Dinero en CENTAVOS (integer). Nada de floats para plata.
--   - Tiempo en timestamptz (UTC). La lógica de slots/grilla/"hoy" se computa
--     con la zona IANA 'America/Argentina/Buenos_Aires' en la app/RPC.
--   - PK uuid default gen_random_uuid() (IDs no predecibles).
--   - Anti-doble-reserva en la DB, no en la app: EXCLUDE USING gist sobre
--     (barber_id, tstzrange) — el constraint ES el lock.
--   - Seña (snapshot al reservar): deposit_cents = max(piso, ceil(price*pct/100))
--     con tope <= price_cents. Piso configurable (default $1000 = 100000 centavos).
--     SIN exención por umbral de precio.
--   - Hold TTL 12 min; horizonte 14 días; granularidad 15 min; lead 60 min;
--     buffer post-servicio 5 min.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- Extensiones
-- -----------------------------------------------------------------------------
-- btree_gist: permite combinar tipos escalares (uuid '=') con rangos ('&&') en
-- un mismo índice GiST, requisito del EXCLUDE constraint anti-doble-reserva.
create extension if not exists btree_gist;

-- gen_random_uuid() vive en pgcrypto en algunas versiones; en Supabase ya está
-- disponible, pero lo aseguramos para entornos limpios.
create extension if not exists pgcrypto;

-- pg_cron / pg_net se habilitan desde el dashboard de Supabase (Database >
-- Extensions) y se usan en 0003_functions.sql para expiración/reconciliación/
-- heartbeat. Se documentan en docs/SUPABASE-SETUP.md.

-- -----------------------------------------------------------------------------
-- Enums
-- -----------------------------------------------------------------------------
create type user_role as enum (
  'cliente',
  'barbero',
  'admin'
);

-- Estado del turno. Máquina de estados documentada en PLAN §8:
--   hold -> confirmada   (webhook pago approved, o directo si deposit_cents=0)
--   hold -> expirada     (TTL vencido sin pago; cron/lazy)
--   hold -> cancelada    (usuario cancela el hold antes de pagar)
--   confirmada -> completada | no_show   (panel/cron)
--   confirmada -> cancelada              (cliente >4h, admin, o refund/chargeback)
create type appointment_status as enum (
  'hold',
  'confirmada',
  'completada',
  'no_show',
  'cancelada',
  'expirada'
);

-- Estados de pago alineados con MercadoPago.
create type payment_status as enum (
  'pending',
  'in_process',
  'approved',
  'rejected',
  'refunded',
  'cancelled',
  'charged_back'
);

-- -----------------------------------------------------------------------------
-- Helper de updated_at (trigger genérico)
-- -----------------------------------------------------------------------------
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- -----------------------------------------------------------------------------
-- profiles  —  PK = FK a auth.users (patrón canónico Supabase)
-- -----------------------------------------------------------------------------
create table public.profiles (
  id                  uuid primary key references auth.users(id) on delete cascade,
  role                user_role not null default 'cliente',
  full_name           text not null,
  phone               text,                 -- E.164 normalizado (canal WhatsApp)
  phone_confirmed_at  timestamptz,          -- confirmación visual/OTP del número
  email               text,
  tos_version         text,                 -- versión de T&C aceptada (§15)
  tos_accepted_at     timestamptz,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);

create trigger trg_profiles_updated_at
  before update on public.profiles
  for each row execute function public.set_updated_at();

-- Anti auto-promoción de rol: el privilegio se controla a nivel COLUMNA (no con
-- un subselect frágil en la RLS). 'authenticated' no puede tocar la columna role.
-- Se aplica en 0002_rls.sql junto con las políticas (REVOKE/GRANT por columna).

-- -----------------------------------------------------------------------------
-- barbers
-- -----------------------------------------------------------------------------
create table public.barbers (
  id          uuid primary key default gen_random_uuid(),
  profile_id  uuid unique references public.profiles(id) on delete set null,
  name        text not null,
  role_label  text not null default 'Barbero',
  specialty   text,
  img_url     text,
  tel         text,                          -- E.164 para Telegram/WhatsApp
  is_active   boolean not null default true,
  sort_order  smallint not null default 0,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create trigger trg_barbers_updated_at
  before update on public.barbers
  for each row execute function public.set_updated_at();

create index barbers_active_idx on public.barbers (is_active, sort_order);

-- -----------------------------------------------------------------------------
-- services
-- -----------------------------------------------------------------------------
create table public.services (
  id           uuid primary key default gen_random_uuid(),
  slug         text unique not null,                  -- contrato de URL ('corte-barba')
  name         text not null,
  description  text,
  price_cents  int not null check (price_cents >= 0),
  duration_min int not null check (duration_min > 0),
  -- deposit_pct: porcentaje de seña. 0 => servicio sin seña (decisión EXPLÍCITA
  -- del admin; el turno nace 'confirmada'). No hay exención automática por precio.
  deposit_pct  smallint not null default 40 check (deposit_pct between 0 and 100),
  is_featured  boolean not null default false,
  is_active    boolean not null default true,
  sort_order   smallint not null default 0,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

create trigger trg_services_updated_at
  before update on public.services
  for each row execute function public.set_updated_at();

create index services_active_idx on public.services (is_active, sort_order);

-- -----------------------------------------------------------------------------
-- barber_services  —  matriz N:M (qué barbero hace qué servicio)
-- -----------------------------------------------------------------------------
create table public.barber_services (
  barber_id  uuid not null references public.barbers(id)  on delete cascade,
  service_id uuid not null references public.services(id) on delete cascade,
  primary key (barber_id, service_id)
);

create index barber_services_service_idx on public.barber_services (service_id);

-- -----------------------------------------------------------------------------
-- working_hours  —  horario recurrente por barbero y día.
-- Varias filas para el mismo (barber, weekday) modelan el corte de mediodía
-- (p.ej. 10:00-13:00 y 14:00-20:00). Minutos desde medianoche en TZ AR.
-- weekday: 0=domingo .. 6=sábado  (consistente con extract(dow) calculado en TZ AR).
-- -----------------------------------------------------------------------------
create table public.working_hours (
  id         uuid primary key default gen_random_uuid(),
  barber_id  uuid not null references public.barbers(id) on delete cascade,
  weekday    smallint not null check (weekday between 0 and 6),
  start_min  int not null check (start_min between 0 and 1440),
  end_min    int not null check (end_min   between 0 and 1440),
  is_active  boolean not null default true,
  check (end_min > start_min)
);

create index working_hours_barber_idx on public.working_hours (barber_id, weekday) where is_active;

-- -----------------------------------------------------------------------------
-- time_off  —  feriados / vacaciones / bloqueos puntuales.
-- barber_id NULL => cierre de todo el local. 'reason' NO es público.
-- -----------------------------------------------------------------------------
create table public.time_off (
  id         uuid primary key default gen_random_uuid(),
  barber_id  uuid references public.barbers(id) on delete cascade,  -- null = todo el local
  starts_at  timestamptz not null,
  ends_at    timestamptz not null,
  reason     text,
  created_at timestamptz not null default now(),
  check (ends_at > starts_at)
);

-- Índice GiST para solape rápido contra rangos de bloqueo en el motor de slots.
create index time_off_range_idx on public.time_off
  using gist (barber_id, tstzrange(starts_at, ends_at, '[)'));

-- -----------------------------------------------------------------------------
-- appointments  —  el corazón. start/end como timestamptz + rango generado.
-- -----------------------------------------------------------------------------
create table public.appointments (
  id                      uuid primary key default gen_random_uuid(),

  -- customer_id nullable: walk-in (M4) y hold anónimo transitorio (pre-auth).
  customer_id             uuid references public.profiles(id) on delete set null,
  anon_session_id         text,                                  -- hold anónimo pre-auth
  customer_name_snapshot  text,                                  -- walk-in (M4) / anonimización
  customer_phone_snapshot text,

  barber_id               uuid not null references public.barbers(id)  on delete restrict,
  service_id              uuid not null references public.services(id) on delete restrict,
  service_name_snapshot   text not null,                         -- renombrar servicio no muta histórico
  duration_min_snapshot   int  not null check (duration_min_snapshot > 0),

  starts_at               timestamptz not null,
  ends_at                 timestamptz not null,
  -- Rango generado [inicio, fin) usado por el EXCLUDE. STORED para indexarlo.
  time_range              tstzrange generated always as
                            (tstzrange(starts_at, ends_at, '[)')) stored,

  status                  appointment_status not null default 'hold',

  price_cents             int not null check (price_cents >= 0),
  -- Snapshot de la seña al momento de reservar: cambiar deposit_pct después NO
  -- altera turnos existentes. deposit_cents <= price_cents (validado en RPC).
  deposit_cents           int not null check (deposit_cents >= 0),

  -- NOT NULL con default: evita el slot-zombie (hold sin expiración).
  hold_expires_at         timestamptz not null default (now() + interval '12 minutes'),

  cancelled_at            timestamptz,
  cancelled_by            uuid references public.profiles(id),
  cancellation_reason     text,
  customer_notes          text,

  created_at              timestamptz not null default now(),
  updated_at              timestamptz not null default now(),

  check (ends_at > starts_at),
  check (deposit_cents <= price_cents)
);

create trigger trg_appointments_updated_at
  before update on public.appointments
  for each row execute function public.set_updated_at();

-- -----------------------------------------------------------------------------
-- EL CONSTRAINT CRÍTICO  —  anti-solape por RANGO, no por instante.
-- Dos turnos del MISMO barbero no pueden solaparse mientras estén en un estado
-- que "ocupa" la agenda. Postgres serializa inserts concurrentes: uno gana, el
-- otro recibe 23P01 (exclusion_violation), que la app traduce a "ese horario se
-- acaba de ocupar". Estados que ocupan: hold, confirmada, completada, no_show
-- (un no_show sigue habiendo ocupado la franja; no se debe re-vender históricamente).
-- 'cancelada' y 'expirada' NO ocupan => la franja queda libre de inmediato.
-- -----------------------------------------------------------------------------
alter table public.appointments
  add constraint no_double_booking
  exclude using gist (barber_id with =, time_range with &&)
  where (status in ('hold', 'confirmada', 'completada', 'no_show'));

-- Índices de soporte.
create index appointments_barber_start_idx  on public.appointments (barber_id, starts_at);
create index appointments_customer_idx      on public.appointments (customer_id);
create index appointments_status_idx        on public.appointments (status);
-- Hold anónimo por session (lookup al transferir el hold al autenticar).
create index appointments_anon_session_idx  on public.appointments (anon_session_id)
  where status = 'hold';
-- Barrido de holds vencidos por el cron de expiración.
create index appointments_hold_expiry_idx   on public.appointments (hold_expires_at)
  where status = 'hold';

-- -----------------------------------------------------------------------------
-- payments  —  un appointment puede tener varios pagos (reintentos); is_current
-- marca la preference vigente. mp_payment_id UNIQUE = idempotencia a nivel pago.
-- -----------------------------------------------------------------------------
create table public.payments (
  id              uuid primary key default gen_random_uuid(),
  appointment_id  uuid not null references public.appointments(id) on delete cascade,
  mp_preference_id text,
  mp_payment_id   text unique,                          -- idempotencia a nivel pago
  mp_external_ref text,                                 -- = appointment_id (anti-tamper)
  amount_cents    int not null check (amount_cents >= 0),
  status          payment_status not null default 'pending',
  status_detail   text,
  is_current      boolean not null default true,        -- preference vigente en reintentos
  raw_payload     jsonb,
  paid_at         timestamptz,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

create trigger trg_payments_updated_at
  before update on public.payments
  for each row execute function public.set_updated_at();

create index payments_appointment_idx on public.payments (appointment_id);
-- A lo sumo una preference vigente por appointment.
create unique index payments_one_current_idx on public.payments (appointment_id)
  where is_current;

-- -----------------------------------------------------------------------------
-- webhook_events  —  idempotencia a nivel EVENTO entrante (red de seguridad
-- para eventos cuyo payment_id aún no resuelve a una fila de payments).
-- Es el primer gate barato: INSERT ... ON CONFLICT DO NOTHING antes de llamar a MP.
-- -----------------------------------------------------------------------------
create table public.webhook_events (
  provider     text not null default 'mercadopago',
  event_key    text not null,                          -- 'payment:'||data.id
  processed_at timestamptz not null default now(),
  primary key (provider, event_key)
);

-- -----------------------------------------------------------------------------
-- notification  —  cola común driver-agnóstica.
-- En M1-M2 se usa como REGISTRO (POST directo + log), no como cola con claim/lock.
-- La maquinaria de cola (SKIP LOCKED, locked_at, dedupe_key, 3-estados) recién
-- se ejercita en M4 con la WhatsApp Cloud API.
-- -----------------------------------------------------------------------------
create table public.notification (
  id             uuid primary key default gen_random_uuid(),
  appointment_id uuid not null references public.appointments(id) on delete cascade,
  channel        text not null,                        -- 'telegram' | 'whatsapp' | 'email'
  kind           text not null,                        -- 'aviso_barbero' | 'recordatorio' | ...
  to_phone       text,
  template       text,
  payload        jsonb not null,
  scheduled_at   timestamptz not null,
  sent_at        timestamptz,
  status         text not null default 'pendiente'     -- pendiente|enviando|enviado|fallido|cancelado
                   check (status in ('pendiente','enviando','enviado','fallido','cancelado')),
  attempts       int not null default 0,
  locked_at      timestamptz,                          -- inerte hasta M4 (claim/lock)
  wa_message_id  text,
  last_error     text,
  dedupe_key     text unique,                          -- tolera reprogramación
  created_at     timestamptz not null default now()
);

create index notification_pending_idx on public.notification (status, scheduled_at)
  where status in ('pendiente', 'enviando');

-- -----------------------------------------------------------------------------
-- tos_acceptances  —  bitácora histórica de consentimientos (append-only).
-- profiles guarda la versión vigente; esta tabla guarda el rastro completo para
-- prueba ante chargebacks (§15). Una fila por aceptación.
-- -----------------------------------------------------------------------------
create table public.tos_acceptances (
  id             uuid primary key default gen_random_uuid(),
  profile_id     uuid references public.profiles(id) on delete set null,
  appointment_id uuid references public.appointments(id) on delete set null,
  tos_version    text not null,
  accepted_at    timestamptz not null default now(),
  ip             inet,
  user_agent     text
);

create index tos_acceptances_profile_idx on public.tos_acceptances (profile_id);

-- -----------------------------------------------------------------------------
-- cron_health  —  heartbeat de los crons (§17). Una fila por job; cada corrida
-- actualiza last_run_at. Un check externo alerta si un job no late en N intervalos.
-- -----------------------------------------------------------------------------
create table public.cron_health (
  job_name     text primary key,                       -- 'expire_holds' | 'reconcile_payments' | ...
  last_run_at  timestamptz not null default now(),
  last_status  text,                                   -- 'ok' | 'error'
  last_detail  text,
  runs_total   bigint not null default 0
);

-- -----------------------------------------------------------------------------
-- app_settings  —  parámetros del motor de reservas, editables sin redeploy.
-- key/value (jsonb). Defaults del plan (§6). La app/RPC los lee.
-- -----------------------------------------------------------------------------
create table public.app_settings (
  key         text primary key,
  value       jsonb not null,
  updated_at  timestamptz not null default now()
);

create trigger trg_app_settings_updated_at
  before update on public.app_settings
  for each row execute function public.set_updated_at();

insert into public.app_settings (key, value) values
  ('timezone',          '"America/Argentina/Buenos_Aires"'::jsonb),
  ('granularity_min',   '15'::jsonb),
  ('buffer_after_min',  '5'::jsonb),
  ('hold_ttl_min',      '12'::jsonb),
  ('horizon_days',      '14'::jsonb),
  ('min_lead_min',      '60'::jsonb),
  ('deposit_floor_cents','100000'::jsonb),     -- piso de seña: $1.000
  ('cancel_window_hours','4'::jsonb);          -- cancelación hasta 4hs antes
