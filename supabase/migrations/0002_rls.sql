-- =============================================================================
-- 0002_rls.sql  —  Row Level Security
--
-- Modelo (PLAN §3, §4):
--   - anon / authenticated  : roles del cliente vía API pública (anon/publishable
--     key). La RLS es la defensa real.
--   - service_role          : webhook de pagos + crons + admin.createUser.
--     BYPASSA RLS por diseño (Supabase desactiva RLS para service_role).
--   - cliente               : ve/escribe SOLO lo suyo (customer_id = auth.uid()).
--   - staff (admin/barbero) : ve todo (helper is_staff()).
--   - lectura pública        : services/barbers ACTIVOS (catálogo de la landing).
--
-- Claves:
--   - El INSERT de appointments NO es directo: el hold (anónimo o autenticado)
--     se crea SOLO vía RPC crear_hold security definer (0003_functions.sql).
--     Por eso NO hay policy INSERT para appointments en anon/authenticated.
--   - payments: cliente solo LEE los de sus turnos; SOLO service_role escribe.
--   - time_off: SIN lectura pública (oculta 'reason'); el cálculo de slots es
--     una RPC security definer, única superficie pública.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- Helper: is_staff()  —  ¿el usuario actual es admin o barbero?
-- security definer + search_path vacío (no se deja resolver a esquemas atacables).
-- STABLE: cacheable dentro de la query.
-- -----------------------------------------------------------------------------
create or replace function public.is_staff()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.profiles p
    where p.id = (select auth.uid())
      and p.role in ('admin', 'barbero')
  );
$$;

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.profiles p
    where p.id = (select auth.uid())
      and p.role = 'admin'
  );
$$;

-- -----------------------------------------------------------------------------
-- Habilitar RLS en TODAS las tablas de datos.
-- (service_role bypassa; el resto cae bajo las policies de abajo.)
-- -----------------------------------------------------------------------------
alter table public.profiles         enable row level security;
alter table public.barbers          enable row level security;
alter table public.services         enable row level security;
alter table public.barber_services  enable row level security;
alter table public.working_hours    enable row level security;
alter table public.time_off         enable row level security;
alter table public.appointments     enable row level security;
alter table public.payments         enable row level security;
alter table public.webhook_events   enable row level security;
alter table public.notification     enable row level security;
alter table public.tos_acceptances  enable row level security;
alter table public.cron_health      enable row level security;
alter table public.app_settings     enable row level security;

-- Forzar RLS también para el dueño de las tablas (defensa en profundidad).
-- service_role sigue exento por ser BYPASSRLS.
alter table public.appointments    force row level security;
alter table public.payments        force row level security;
alter table public.profiles        force row level security;

-- -----------------------------------------------------------------------------
-- GRANTs de privilegio a nivel TABLA para los roles de la API.
--
-- IMPORTANTE: RLS solo FILTRA filas; primero hace falta el privilegio SQL base
-- (GRANT) o el acceso se deniega con "permission denied for table" ANTES de que
-- la policy corra. Supabase normalmente concede estos privilegios por default,
-- pero los explicitamos para que las migraciones sean correctas en cualquier
-- entorno y no dependan del bootstrap implícito.
--
-- El alcance fino (qué fila ve/escribe cada rol) lo imponen las POLICIES de
-- abajo; acá solo damos el privilegio base. service_role recibe todo (bypassa
-- RLS). El INSERT de appointments NO se concede a anon/authenticated (el hold
-- pasa por la RPC security definer); por eso aquí solo SELECT/UPDATE.
-- -----------------------------------------------------------------------------
grant usage on schema public to anon, authenticated, service_role;

-- service_role: acceso total (lo usan webhook y crons; bypassa RLS igual).
grant all on all tables    in schema public to service_role;
grant all on all sequences in schema public to service_role;
grant all on all functions in schema public to service_role;

-- Lectura pública del catálogo + parámetros (RLS recorta a "activos").
grant select on
  public.barbers, public.services, public.barber_services,
  public.working_hours, public.app_settings
  to anon, authenticated;

-- authenticated (cliente logueado): lee lo suyo; el UPDATE de columnas de
-- profiles ya se acota por columna en este archivo; appointments solo
-- SELECT/UPDATE (el INSERT va por la RPC).
grant select on public.profiles, public.tos_acceptances, public.notification,
                public.cron_health
  to authenticated;
grant select, update on public.appointments to authenticated;
grant select on public.payments to authenticated;
-- (profiles UPDATE por-columna se concede explícitamente más abajo.)

-- =============================================================================
-- profiles
-- =============================================================================
-- Cliente: ve y actualiza SOLO su fila. (La columna role se protege por privilegio
-- de columna más abajo, no acá.)
create policy profiles_select_own on public.profiles
  for select to authenticated
  using ( id = (select auth.uid()) or public.is_staff() );

create policy profiles_update_own on public.profiles
  for update to authenticated
  using ( id = (select auth.uid()) )
  with check ( id = (select auth.uid()) );

-- El INSERT del perfil lo hace un trigger on auth.users (handle_new_user en
-- 0003_functions.sql) corriendo como definer, o el admin vía service_role.
-- No se expone INSERT directo a authenticated.

-- Staff (admin) gestiona perfiles ajenos.
create policy profiles_admin_all on public.profiles
  for all to authenticated
  using ( public.is_admin() )
  with check ( public.is_admin() );

-- Anti auto-promoción de rol: a nivel COLUMNA. 'authenticated' puede tocar solo
-- estas columnas; NO 'role'. (El UPDATE de perfil ajeno por admin va por
-- service_role / is_admin, que no está sujeto a estos grants de columna del
-- rol authenticated cuando se usa la service key.)
revoke update on public.profiles from authenticated;
grant update (full_name, phone, phone_confirmed_at, email, tos_version, tos_accepted_at, updated_at)
  on public.profiles to authenticated;

-- =============================================================================
-- barbers  —  lectura pública de ACTIVOS; escritura staff/admin.
-- =============================================================================
create policy barbers_public_read on public.barbers
  for select to anon, authenticated
  using ( is_active or public.is_staff() );

create policy barbers_staff_write on public.barbers
  for all to authenticated
  using ( public.is_admin() )
  with check ( public.is_admin() );

-- =============================================================================
-- services  —  lectura pública de ACTIVOS; escritura admin.
-- =============================================================================
create policy services_public_read on public.services
  for select to anon, authenticated
  using ( is_active or public.is_staff() );

create policy services_admin_write on public.services
  for all to authenticated
  using ( public.is_admin() )
  with check ( public.is_admin() );

-- =============================================================================
-- barber_services  —  lectura pública (matriz para armar el wizard); escritura admin.
-- =============================================================================
create policy barber_services_public_read on public.barber_services
  for select to anon, authenticated
  using ( true );

create policy barber_services_admin_write on public.barber_services
  for all to authenticated
  using ( public.is_admin() )
  with check ( public.is_admin() );

-- =============================================================================
-- working_hours  —  lectura pública (input del motor de slots); escritura staff.
-- No expone datos sensibles (solo franjas horarias).
-- =============================================================================
create policy working_hours_public_read on public.working_hours
  for select to anon, authenticated
  using ( true );

create policy working_hours_staff_write on public.working_hours
  for all to authenticated
  using ( public.is_staff() )
  with check ( public.is_staff() );

-- =============================================================================
-- time_off  —  SIN lectura pública (oculta 'reason'). Solo staff lee/escribe.
-- El público "ve" los bloqueos únicamente a través de la RPC slots_publicos
-- (security definer), que no expone el motivo.
-- =============================================================================
create policy time_off_staff_all on public.time_off
  for all to authenticated
  using ( public.is_staff() )
  with check ( public.is_staff() );

-- =============================================================================
-- appointments
--   - INSERT: NINGUNA policy para anon/authenticated. El hold se crea SOLO vía
--     RPC crear_hold (security definer). Insert directo => denegado por RLS.
--   - SELECT: cliente ve los suyos (por customer_id); staff ve todo.
--   - UPDATE: cliente puede cancelar los suyos (la lógica fina —ventana 4hs,
--     transiciones válidas— vive en Server Actions / RPC). Staff actualiza todo.
--   - La transición a 'confirmada' la hace el webhook como service_role (bypass).
-- =============================================================================
create policy appointments_select_own on public.appointments
  for select to authenticated
  using ( customer_id = (select auth.uid()) or public.is_staff() );

create policy appointments_update_own on public.appointments
  for update to authenticated
  using ( customer_id = (select auth.uid()) or public.is_staff() )
  with check ( customer_id = (select auth.uid()) or public.is_staff() );

-- (Sin policy INSERT ni DELETE para roles públicos: el alta pasa por la RPC y no
-- hay borrado físico — el ciclo de vida es por 'status'.)

-- =============================================================================
-- payments  —  cliente LEE los pagos de SUS turnos; SOLO service_role escribe.
-- =============================================================================
create policy payments_select_own on public.payments
  for select to authenticated
  using (
    public.is_staff()
    or exists (
      select 1 from public.appointments a
      where a.id = payments.appointment_id
        and a.customer_id = (select auth.uid())
    )
  );

-- (Sin policy INSERT/UPDATE/DELETE para anon/authenticated => escritura
-- exclusiva de service_role, que bypassa RLS. Webhook y reconciliador la usan.)

-- =============================================================================
-- webhook_events  —  uso exclusivo del webhook (service_role). Sin policies =>
-- ningún rol público lee/escribe.
-- =============================================================================
-- (intencionalmente sin policies)

-- =============================================================================
-- notification  —  staff lee la cola; escritura por service_role (crons/webhook).
-- =============================================================================
create policy notification_staff_read on public.notification
  for select to authenticated
  using ( public.is_staff() );

-- =============================================================================
-- tos_acceptances  —  cliente lee las suyas; admin lee todo. Inserta el flujo de
-- consentimiento vía RPC/Server Action (security definer) o service_role.
-- =============================================================================
create policy tos_acceptances_select_own on public.tos_acceptances
  for select to authenticated
  using ( profile_id = (select auth.uid()) or public.is_admin() );

-- =============================================================================
-- cron_health / app_settings  —  staff lee; escritura por service_role.
-- app_settings: lectura pública opcional para que la landing/RPC lean parámetros.
-- =============================================================================
create policy cron_health_staff_read on public.cron_health
  for select to authenticated
  using ( public.is_staff() );

create policy app_settings_public_read on public.app_settings
  for select to anon, authenticated
  using ( true );

create policy app_settings_admin_write on public.app_settings
  for all to authenticated
  using ( public.is_admin() )
  with check ( public.is_admin() );
