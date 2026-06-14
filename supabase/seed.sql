-- =============================================================================
-- seed.sql  —  Datos sembrados (SIMULADOS pero realistas) para Flow Site.
--
-- ⚠️ Estos datos son una BASE realista derivada de lib/data.ts, NO los datos
--    reales del cliente. Antes de producción, reemplazar por los inputs reales
--    (PLAN §13): nombres/fotos/teléfonos de barberos, precios, duraciones,
--    matriz barbero↔servicio, horarios reales por barbero, WhatsApp real.
--
-- Convenciones:
--   - Precios en CENTAVOS. $6.000 => 600000.
--   - deposit_pct = 40 en todos los servicios pagos (decisión fija).
--   - Horarios: minutos desde medianoche en TZ AR. 10:00=600, 13:00=780,
--     14:00=840, 20:00=1200.  weekday: 0=dom .. 6=sáb.
--   - Idempotente: usa ON CONFLICT por slug / claves naturales para poder
--     re-correr el seed sin duplicar.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- SERVICIOS  (los 6 actuales de lib/data.ts, con precios en centavos)
-- Seña ejemplo (piso $1.000, 40%, tope <= precio):
--   Corte clásico  $6.000  -> max(1000, 2400) = $2.400
--   Corte + Barba  $8.500  -> max(1000, 3400) = $3.400
--   Degradado      $7.000  -> max(1000, 2800) = $2.800
--   Color/Platinado $15.000 -> max(1000, 6000) = $6.000
--   Diseño/Líneas  $2.000  -> max(1000, 800)  = $1.000  (gana el piso)
--   Corte niños    $5.000  -> max(1000, 2000) = $2.000
-- -----------------------------------------------------------------------------
insert into public.services
  (slug, name, description, price_cents, duration_min, deposit_pct, is_featured, is_active, sort_order)
values
  ('corte-clasico',   'Corte clásico',   'Corte a máquina y tijera, terminación prolija.',         600000, 30, 40, false, true, 1),
  ('corte-barba',     'Corte + Barba',   'El combo completo: corte, perfilado y arreglo de barba.', 850000, 45, 40, true,  true, 2),
  ('degradado-fade',  'Degradado (Fade)','Degradado a piel con diseño y definición.',               700000, 40, 40, false, true, 3),
  ('color-platinado', 'Color / Platinado','Decoloración y color al tono que quieras.',             1500000, 90, 40, false, true, 4),
  ('diseno-lineas',   'Diseño / Líneas', 'Líneas y diseños freestyle a navaja.',                    200000, 15, 40, false, true, 5),
  ('corte-ninos',     'Corte niños',     'Para los más chicos, con paciencia y flow.',              500000, 30, 40, false, true, 6)
on conflict (slug) do update set
  name         = excluded.name,
  description  = excluded.description,
  price_cents  = excluded.price_cents,
  duration_min = excluded.duration_min,
  deposit_pct  = excluded.deposit_pct,
  is_featured  = excluded.is_featured,
  is_active    = excluded.is_active,
  sort_order   = excluded.sort_order;

-- -----------------------------------------------------------------------------
-- BARBEROS  (3: Gavazz co-founder + Thiago + Lucio)
-- ⚠️ Teléfonos E.164 de ejemplo — reemplazar por los reales (Telegram/WhatsApp).
-- profile_id queda NULL hasta que se cree la cuenta de staff vía auth.admin
-- (ver SUPABASE-SETUP.md) y se vincule.
-- -----------------------------------------------------------------------------
insert into public.barbers (name, role_label, specialty, img_url, tel, is_active, sort_order)
values
  ('Gavazz', 'Co-founder & Barbero', 'Fades & diseños',     '/barbers/br1.jpg', '5491100000001', true, 1),
  ('Thiago', 'Barbero',              'Clásicos & barba',    '/barbers/br2.jpg', '5491100000002', true, 2),
  ('Lucio',  'Barbero',              'Color & platinados',  '/barbers/br3.jpg', '5491100000003', true, 3)
on conflict do nothing;

-- -----------------------------------------------------------------------------
-- BARBER_SERVICES  —  full cross: cada barbero hace todos los servicios.
-- (specialty es decorativa, no restrictiva — PLAN §2.)
-- -----------------------------------------------------------------------------
insert into public.barber_services (barber_id, service_id)
select b.id, s.id
from public.barbers b
cross join public.services s
on conflict (barber_id, service_id) do nothing;

-- -----------------------------------------------------------------------------
-- WORKING_HOURS  —  10:00–20:00 con corte de mediodía 13:00–14:00.
-- Modelado como DOS franjas por día: [600,780) y [840,1200).
-- Días: Gavazz y Thiago trabajan mar–dom (cerrado lunes).
--       Lucio trabaja mié–dom (cerrado lunes y martes).
-- weekday: 0=dom 1=lun 2=mar 3=mié 4=jue 5=vie 6=sáb.
-- -----------------------------------------------------------------------------

-- Gavazz: martes(2) a domingo(0) — cerrado lunes(1).
insert into public.working_hours (barber_id, weekday, start_min, end_min, is_active)
select b.id, d.weekday, f.start_min, f.end_min, true
from public.barbers b
cross join (values (2),(3),(4),(5),(6),(0)) as d(weekday)
cross join (values (600, 780), (840, 1200)) as f(start_min, end_min)
where b.name = 'Gavazz'
on conflict do nothing;

-- Thiago: martes(2) a domingo(0) — cerrado lunes(1).
insert into public.working_hours (barber_id, weekday, start_min, end_min, is_active)
select b.id, d.weekday, f.start_min, f.end_min, true
from public.barbers b
cross join (values (2),(3),(4),(5),(6),(0)) as d(weekday)
cross join (values (600, 780), (840, 1200)) as f(start_min, end_min)
where b.name = 'Thiago'
on conflict do nothing;

-- Lucio: miércoles(3) a domingo(0) — cerrado lunes(1) y martes(2).
insert into public.working_hours (barber_id, weekday, start_min, end_min, is_active)
select b.id, d.weekday, f.start_min, f.end_min, true
from public.barbers b
cross join (values (3),(4),(5),(6),(0)) as d(weekday)
cross join (values (600, 780), (840, 1200)) as f(start_min, end_min)
where b.name = 'Lucio'
on conflict do nothing;

-- -----------------------------------------------------------------------------
-- TIME_OFF  —  vacío por defecto. El cliente carga feriados/cierres reales (§13.5)
-- o se gestionan desde el panel (M3). Ejemplo comentado:
--   insert into public.time_off (barber_id, starts_at, ends_at, reason)
--   values (null, '2026-12-25 00:00-03', '2026-12-26 00:00-03', 'Navidad');
-- -----------------------------------------------------------------------------

-- -----------------------------------------------------------------------------
-- ADMIN inicial.
-- El usuario en auth.users se crea con auth.admin.createUser (service_role) o
-- desde el dashboard de Supabase (Authentication > Add user). El trigger
-- handle_new_user crea su profile con role='cliente'; luego se promueve a admin.
--
-- ⚠️ Reemplazar el email por el real del admin antes de correr.
-- Este UPDATE promueve a admin SI la cuenta ya existe (id resuelto por email).
-- Si la cuenta aún no existe, crearla primero (ver SUPABASE-SETUP.md) y re-correr.
-- -----------------------------------------------------------------------------
do $$
declare
  v_admin_email text := 'admin@flowsite.com';   -- ⚠️ CAMBIAR por el real
  v_uid uuid;
begin
  select id into v_uid from auth.users where email = v_admin_email;
  if v_uid is not null then
    update public.profiles
       set role = 'admin', full_name = coalesce(nullif(full_name, ''), 'Admin Flow')
     where id = v_uid;
    raise notice 'Admin promovido: %', v_admin_email;
  else
    raise notice 'No existe auth.users con email %. Creá la cuenta y re-corré el seed.', v_admin_email;
  end if;
end $$;

-- -----------------------------------------------------------------------------
-- T&C  —  versión inicial. La versión vigente vive en env (TOS_VERSION) y se
-- referencia desde profiles.tos_version / tos_acceptances.tos_version.
-- El TEXTO de la política es input del cliente (§13.8); acá solo registramos la
-- versión activa en app_settings para que la app la lea.
-- -----------------------------------------------------------------------------
insert into public.app_settings (key, value)
values ('tos_version', '"v1"'::jsonb)
on conflict (key) do update set value = excluded.value, updated_at = now();
