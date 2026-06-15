# Supabase setup — Flow Site (app de turnos)

Guía para parar la base de datos de producción de la app de reservas: crear el
proyecto, correr las migraciones, sembrar datos, configurar variables de entorno,
habilitar extensiones, programar los crons y conectar la app cuando se reemplace
el backend simulado.

Referencia de diseño: `docs/PLAN-etapa2-turnos.md` (§4 modelo de datos, §6
disponibilidad/holds, §7 pagos, §15 T&C, §16 rate-limit, §17 observabilidad).

> Las migraciones son SQL plano de Postgres/Supabase y se pueden correr con el
> CLI de Supabase, con `psql`, o pegándolas en el SQL Editor del dashboard.

---

## ✅ Estado: la app YA está cableada a Supabase

La app **ya no usa el backend simulado**: `lib/store.ts` y `lib/auth.ts` consultan
Supabase real. Verificado contra Supabase **local** (login real, reserva end-to-end,
dashboard/cola/mis-turnos con datos reales y RLS).

**Cómo está cableado**
- `lib/supabase/server.ts` / `client.ts` — clientes SSR (sesión por cookies).
- `lib/supabase/admin.ts` — cliente `service_role` (server-only) que usa `lib/store.ts`
  para las operaciones de datos. La **autorización** la imponen las server actions
  (`requireStaff`/`getSessionUser`); la **RLS** protege la API pública (anon key).
- `lib/auth.ts` — sesión con Supabase Auth → `profiles` → tipo `User` (rol, `barberId`).
- `middleware.ts` — refresca la sesión en cada request.
- `0004_app_bridge.sql` — puente app↔esquema: estado `en_curso`, `profiles.avatar_url`,
  `payments.kind`/`method` (cobros efectivo/saldo del panel).
- Reservas: insert directo protegido por el `EXCLUDE` (`23P01` → "horario tomado").
  Las RPC `crear_hold`/`slots_publicos` quedan disponibles para el futuro path anónimo.

**Variables** (`.env.local`, ver §5): `NEXT_PUBLIC_SUPABASE_URL`,
`NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`. Plantilla en
`.env.local.example`.

### Desarrollo local (con Docker)
```bash
npx supabase start              # levanta Postgres+Auth+Studio (aplica migraciones+seed)
npx supabase status -o env      # imprime API URL + anon + service_role → pegar en .env.local
node scripts/seed-dev.mjs       # crea usuarios de auth (admin/barberos/cliente) + turnos demo
npm run dev                     # la app corre contra el Supabase local
npx supabase stop               # frenar (los datos persisten)
```
Studio: http://127.0.0.1:54323 · El SQL `seed.sql` NO crea usuarios de `auth`
(eso lo hace `scripts/seed-dev.mjs` o el dashboard).

### Ir a la NUBE (producción)
1. Crear el proyecto (§1) y `npx supabase link --project-ref <ref>`.
2. `npx supabase db push` (aplica `0001`→`0004`). Correr `seed.sql` (datos reales, §4).
3. Crear el admin/barberos reales (Authentication → Add user) y promover roles (§4).
4. Pegar las keys del proyecto cloud en las env del hosting (Vercel/Cloudflare).

### ⏳ Lo que falta para producción
- **MercadoPago real**: hoy `/reservar/pago` es SIMULADO (`payDepositMercadoPago` marca
  pagado sin cobro). Falta: preference + Checkout + webhook (`/api/webhooks/mp`) que
  confirme y escriba `payments` con `service_role`.
- **Google OAuth**: `loginGoogleAction` ya llama a `signInWithOAuth`, pero falta
  habilitar el provider en Supabase y un route handler `/auth/callback` que intercambie
  el code. Sin eso, el botón de Google no completa.
- **Crons** (§7): `expire_holds`, reconciliación de pagos, recordatorios (pg_cron o Vercel Cron).
- **Contenido real**: fotos/precios/horarios/teléfonos reales (reemplazar `seed.sql`).

---

## 0. Orden de archivos

```
supabase/
  migrations/
    0001_schema.sql      # extensiones, enums, tablas, EXCLUDE constraint, índices
    0002_rls.sql         # RLS en todas las tablas + helpers is_staff/is_admin
    0003_functions.sql   # RPC crear_hold / slots_publicos, trigger de auth, crons
  seed.sql               # datos sembrados (servicios, barberos, horarios, admin)
```

Correr **en este orden**: `0001` → `0002` → `0003` → `seed`.

---

## 1. Crear el proyecto

1. En <https://supabase.com/dashboard> → **New project**.
   - Región: la más cercana a Argentina (p.ej. `sa-east-1` São Paulo).
   - Guardar la **Database password** (la vas a necesitar para `psql`/CLI).
2. Anotar del proyecto (Settings → API):
   - **Project URL** → `NEXT_PUBLIC_SUPABASE_URL`
   - **publishable / anon key** → `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`
   - **service_role key** → `SUPABASE_SERVICE_ROLE_KEY` (⚠️ secreta, server-only)

**Entornos:** crear al menos **dev** y **prod** (idealmente también **staging**).
La migración destructiva de precios `string → centavos` de `lib/data.ts` se prueba
primero en staging con un snapshot restaurable (PLAN §11, M0).

---

## 2. Habilitar extensiones

`0001_schema.sql` ya hace `create extension if not exists btree_gist` y `pgcrypto`.

`pg_cron` y `pg_net` **se habilitan desde el dashboard** (no por la migración, para
no romper en entornos donde no estén disponibles):

- Dashboard → **Database → Extensions** → habilitar **`pg_cron`** y **`pg_net`**.

Estas dos hacen falta para los crons de expiración de holds, reconciliación de
pagos y heartbeat (§7 de esta guía). Si tu plan de Supabase no las ofrece, usar
**Vercel Cron** como fallback pegándole a los Route Handlers `/api/cron/*`
(PLAN §14 P6).

---

## 3. Correr las migraciones

### Opción A — Supabase CLI (recomendado)

```bash
# instalar CLI (si no lo tenés): npm i -g supabase  (o brew install supabase/tap/supabase)
supabase login
supabase link --project-ref <project-ref>      # el ref está en la URL del dashboard

# aplicar todas las migraciones de supabase/migrations en orden
supabase db push

# sembrar datos
psql "$DATABASE_URL" -f supabase/seed.sql
```

> El CLI toma los archivos de `supabase/migrations` por orden de nombre
> (`0001_…`, `0002_…`, `0003_…`).

### Opción B — psql directo

```bash
export DATABASE_URL="postgresql://postgres:<password>@db.<ref>.supabase.co:5432/postgres"

psql "$DATABASE_URL" -f supabase/migrations/0001_schema.sql
psql "$DATABASE_URL" -f supabase/migrations/0002_rls.sql
psql "$DATABASE_URL" -f supabase/migrations/0003_functions.sql
psql "$DATABASE_URL" -f supabase/seed.sql
```

### Opción C — SQL Editor del dashboard

Pegar el contenido de cada archivo, **en orden**, y ejecutar.

---

## 4. Sembrar datos y crear el admin

`seed.sql` carga los 6 servicios, 3 barberos (Gavazz, Thiago, Lucio), la matriz
barbero↔servicio full-cross, los horarios (10:00–20:00 con corte 13–14, días
cerrados según barbero) y la versión de T&C `v1`. Es **idempotente** (se puede
re-correr).

> ⚠️ Los datos del seed son **simulados pero realistas**. Antes de producción,
> reemplazá precios, nombres/fotos/teléfonos de barberos y horarios por los
> reales del cliente (PLAN §13).

**Crear el admin** (el seed solo promueve una cuenta ya existente):

1. Crear la cuenta de auth:
   - Dashboard → **Authentication → Users → Add user** (email + password), **o**
   - vía service_role: `supabase.auth.admin.createUser({ email, password, email_confirm: true })`.
2. Editar `seed.sql` y poner el email real en `v_admin_email`.
3. Re-correr `seed.sql`: el bloque `DO` promueve ese perfil a `role = 'admin'`.

Para crear cuentas de **barberos** y vincularlas a `public.barbers.profile_id`:
crear el usuario con `auth.admin.createUser`, promover su `profiles.role` a
`'barbero'`, y setear `barbers.profile_id = <uid>`.

---

## 5. Variables de entorno

Crear `.env.local` (dev) y configurar las mismas en Vercel (prod). **Todo es
server-only salvo las `NEXT_PUBLIC_`.**

```bash
# --- Supabase ---
NEXT_PUBLIC_SUPABASE_URL=https://<ref>.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=<publishable/anon key>
SUPABASE_SERVICE_ROLE_KEY=<service_role key>     # ⚠️ solo webhook + crons + admin.createUser

# --- MercadoPago (Checkout Pro) ---
MP_ACCESS_TOKEN=<access token de la app MP>      # server-only
NEXT_PUBLIC_MP_PUBLIC_KEY=<public key de MP>     # browser (Wallet)
MP_WEBHOOK_SECRET=<secret para validar x-signature del webhook>

# --- App / crons ---
APP_BASE_URL=https://flowsite.com                # base para notification_url y crons
CRON_SECRET=<token aleatorio largo>              # protege /api/cron/*

# --- Telegram (aviso al barbero, M1) ---
TELEGRAM_BOT_TOKEN=<token del bot>
TELEGRAM_BARBERS_CHAT_ID=<chat/grupo id del equipo>

# --- Observabilidad / legal ---
ALERTS_WEBHOOK_URL=<webhook para alertas de crons/colas (email/Telegram/Slack)>
TOS_VERSION=v1                                    # versión vigente de T&C (§15)

# --- Nivel B (M4, WhatsApp Cloud API) — aún no en uso ---
# WA_TOKEN=
# WA_PHONE_NUMBER_ID=
# WA_VERIFY_TOKEN=
```

> ⚠️ **`SUPABASE_SERVICE_ROLE_KEY` jamás en el browser.** Solo en el webhook de
> pagos, en los crons server-side y en `auth.admin.createUser`. Hay un guard de
> CI que impide importarla en client components (PLAN §10).

---

## 6. Clientes de Supabase en la app (`@supabase/ssr`)

Al conectar la app (reemplazando el backend simulado de `lib/data.ts`):

- **Cliente browser** y **cliente server** con `@supabase/ssr` (Next 16 usa
  `proxy.ts`, no `middleware.ts`; `params` es `Promise`).
- En servidor usar **`getClaims()` / `getUser()`**, nunca `getSession()`
  (PLAN §10).
- Las lecturas/mutaciones del cliente usan la **publishable key** (sujeta a RLS).
- El **webhook** (`/api/pagos/webhook`) y los **crons** (`/api/cron/*`) usan un
  cliente con la **service_role key** (bypassa RLS por diseño).
- El alta de turnos (hold) **no** es un insert directo: se llama a la **RPC
  `crear_hold`** vía `supabase.rpc('crear_hold', { ... })`. La disponibilidad
  pública usa `supabase.rpc('slots_publicos', { ... })`.

---

## 7. Programar los crons (pg_cron) y observabilidad

Con `pg_cron` y `pg_net` ya habilitados (§2), correr **como `postgres`/owner**
(p.ej. desde el SQL Editor). Estos jobs están documentados al pie de
`0003_functions.sql`.

Primero, setear las GUC que usan los jobs HTTP:

```sql
alter database postgres set app.base_url   = 'https://flowsite.com';
alter database postgres set app.cron_secret = '<CRON_SECRET>';
-- reconectar para que tomen efecto
```

Luego, registrar los jobs:

```sql
-- (a) Expirar holds vencidos cada 1 min (sin lock; ventana de slot-fantasma <= 1 min)
select cron.schedule('flow-expire-holds', '* * * * *',
  $$ select public.expire_holds(); $$);

-- (b) Reconciliador de pagos cada 5 min (consulta /v1/payments/search en MP)
select cron.schedule('flow-reconcile-payments', '*/5 * * * *',
  $$
    select net.http_post(
      url     := current_setting('app.base_url') || '/api/cron/reconciliar',
      headers := jsonb_build_object('Content-Type','application/json',
                   'Authorization', 'Bearer ' || current_setting('app.cron_secret')),
      body    := '{}'::jsonb);
  $$);

-- (c) Heartbeat-check cada 5 min (alerta a ALERTS_WEBHOOK_URL si un cron no late)
select cron.schedule('flow-heartbeat-check', '*/5 * * * *',
  $$
    select net.http_post(
      url     := current_setting('app.base_url') || '/api/cron/heartbeat',
      headers := jsonb_build_object('Content-Type','application/json',
                   'Authorization', 'Bearer ' || current_setting('app.cron_secret')),
      body    := '{}'::jsonb);
  $$);
```

Inspeccionar / borrar jobs:

```sql
select * from cron.job;                 -- jobs registrados
select * from cron.job_run_details      -- historial de corridas
  order by start_time desc limit 50;
select cron.unschedule('flow-expire-holds');
```

**Heartbeat:** cada corrida actualiza `public.cron_health` (`last_run_at`,
`last_status`, `runs_total`). El job (c) revisa esa tabla y alerta si un cron no
latió en N intervalos, si crece `notification.status='fallido'`, o si el
reconciliador encontró pagos huérfanos (PLAN §17).

**Fallback sin pg_cron:** usar **Vercel Cron** (`vercel.json` → `crons`)
apuntando a los mismos `/api/cron/*` con el header `Authorization: Bearer
$CRON_SECRET`. La expiración de holds puede llamar a `expire_holds()` vía RPC
service_role.

---

## 8. Verificar el schema (criterios de aceptación, PLAN §11 M0)

Probar que el núcleo de correctitud funciona (idealmente en CI con un runner SQL;
acá los chequeos manuales):

```sql
-- (a) Anti-doble-reserva: dos holds solapados del mismo barbero -> el 2do falla 23P01.
--     Crear dos holds vía crear_hold con el mismo barbero y horario solapado:
--     el primero devuelve la fila, el segundo lanza 'slot_taken'.

-- (b) La transición hold -> confirmada NO auto-viola el EXCLUDE (el rango no
--     cambia; el estado sigue siendo "ocupante").
update public.appointments set status = 'confirmada' where id = '<hold-id>';

-- (c) RLS staff: logueado como barbero A, no debe poder leer turnos de B.
--     (Probar con el cliente publishable; debe corren con el proxy deshabilitado
--      para validar la capa DAL/RLS aislada.)

-- (d) Hold anónimo vía RPC respeta RLS: anon NO puede `insert into appointments`
--     directo (RLS lo niega), pero SÍ puede `select crear_hold(..., p_anon_session_id => '...')`.
```

Disponibilidad pública:

```sql
select * from public.slots_publicos(
  '<barber-id>'::uuid, '<service-id>'::uuid, current_date + 1);
```

---

## 9. Conectar la app cuando se reemplace el backend simulado

Hoy `lib/data.ts` es placeholder (precios string, "Barbero 2/3", WhatsApp
`5490000000000`). La migración a DB es **híbrida y documentada** (PLAN §4):

- **Migran a DB** (fuente de verdad del motor de reservas): `SERVICES`,
  `BARBERS`, y la parte de `BUSINESS` relevante (WhatsApp real, horarios →
  `working_hours`). La landing pasa a leerlos de Supabase con `unstable_cache`/ISR
  y un **fallback estático** (último seed conocido) para que no quede en blanco
  durante una migración.
- **Permanecen en `lib/data.ts`**: `FRAGRANCES` y `GALLERY` (catálogo estático
  fuera del flujo de reservas). Borrar las secciones de reservas con un comentario
  "migrado a DB — ver `supabase/migrations`".

Pasos de corte:

1. Instalar deps (`@supabase/supabase-js`, `@supabase/ssr`, `zod`,
   `mercadopago`, `@date-fns/tz`).
2. Configurar clientes (§6) y el `proxy.ts` / `lib/dal.ts`.
3. Probar la migración destructiva de precios en **staging** con snapshot
   restaurable antes de prod.
4. Apuntar la landing a las queries de DB con el fallback estático.
5. Conectar el wizard de reserva a `crear_hold` / `slots_publicos` y el webhook
   de MP a la escritura de `payments` con service_role.

---

## 10. Rollback

Cada migración tiene su par de rollback (PLAN §11). Para revertir rápido en dev:

```sql
-- des-programar crons primero
select cron.unschedule('flow-expire-holds');
select cron.unschedule('flow-reconcile-payments');
select cron.unschedule('flow-heartbeat-check');

-- bajar el schema (orden inverso de dependencias)
drop schema if exists public cascade;   -- ⚠️ destructivo; solo en dev/staging
create schema public;
grant usage on schema public to anon, authenticated, service_role;
```

En **prod**, nunca `drop schema`: revertir por migración versionada + restaurar
desde snapshot/backup (PITR de Supabase) si hubo pérdida de datos.
