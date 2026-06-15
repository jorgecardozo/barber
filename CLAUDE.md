@AGENTS.md

# Flow Site — barbería & fragancias

Web + sistema de turnos para la barbería **Flow Site** (`@flow_site_`), que además vende
perfumes árabes. Local en San José Obrero 993. Dos partes:

1. **Landing pública** (`/`) — identidad de marca, servicios, barberos, fragancias, ubicación.
2. **App de turnos** — reserva online (cliente), panel de gestión (barbero/admin) y cola en vivo.

> **Backend: Supabase (real).** `lib/store.ts` y `lib/auth.ts` consultan Supabase
> (no más simulación en memoria). Se desarrolla/verifica contra **Supabase local**
> (`npx supabase start` + Docker). **MercadoPago sigue simulado** (`/reservar/pago`).
> Ver "Estado del backend" y `docs/SUPABASE-SETUP.md`.

## Comandos

```bash
npm run dev      # desarrollo (Turbopack) → http://localhost:3000
npm run build    # build de producción (correr siempre antes de commitear)
npm run lint     # eslint
```

No hay tests. La verificación es **visual** (ver "Verificación").

## Stack

- **Next.js 16.2.9** (App Router) · **React 19.2** · **TypeScript**
- **Tailwind CSS v4** (CSS-first, `@theme` en `app/globals.css`) — tema oscuro forzado (`class="dark"` en `<html>`).
- **shadcn/ui sobre Radix** (`radix-ui`). ⚠️ NO usar Base UI: aunque `@base-ui/react` figura en deps, los componentes de `components/ui/*` están sobre **Radix** (`asChild`, `onValueChange`). Si se reinstala shadcn, hacerlo con `-b radix`.
- **motion** (`motion/react`, ex Framer Motion) para animaciones.
- **recharts** para gráficos del dashboard.
- **react-day-picker v9** (pineado) · **sonner** (toasts) · **date-fns** · **lucide-react** · **DiceBear** (avatares, vía URL).

## Estado del backend (Supabase)

- `lib/store.ts` = capa de datos: queries Supabase (async) vía **cliente service_role**
  (`lib/supabase/admin.ts`, server-only). Mapea filas del esquema a `lib/types.ts`.
  La autorización la imponen las server actions; la RLS protege la API pública.
- `lib/auth.ts` = sesión real (Supabase Auth → `profiles` → `User`). `middleware.ts` la refresca.
- Esquema en `supabase/migrations/0001-0004` (`0004` = puente: `en_curso`, `avatar_url`,
  `payments.kind/method`). `seed.sql` siembra catálogo; `scripts/seed-dev.mjs` crea los
  usuarios de auth + turnos demo para local.
- **Dev local**: `npx supabase start` (Docker) → `npx supabase status -o env` → pegar en
  `.env.local` → `node scripts/seed-dev.mjs` → `npm run dev`. Studio en :54323.
- **Pendiente**: MercadoPago real (webhook), Google OAuth (`/auth/callback` + provider),
  crons. Ver `docs/SUPABASE-SETUP.md`.

## Arquitectura

```
app/
  page.tsx                landing pública (Hero, Services, Barbers, Fragrances, ...)
  ingresar/               login/registro del cliente
  reservar/               wizard de reserva + pago (seña) + confirmación
  mis-turnos/             turnos del cliente logueado
  perfil/                 constructor de avatar (cualquier usuario logueado)
  panel/                  panel staff: page=dashboard, cola, turnos, servicios, barberos, horarios, ingresar
  api/                    rutas (ej. disponibilidad)
components/
  *                       secciones de la landing + AppHeader (cliente)
  panel/                  UI del panel (PanelHeader, ColaView, TurnosTable, DashboardCharts, *Dialog, HorariosEditor)
  perfil/AvatarBuilder    armado de avatar
  reservar/BookingWizard  flujo de reserva por pasos
  ui/                     shadcn (Radix)
lib/
  store.ts                "backend" en memoria (datos + mutaciones)
  types.ts                tipos de dominio
  auth.ts                 sesión simulada por cookie
  actions.ts              server actions del cliente/cola
  admin-actions.ts        server actions de admin/barbero (CRUD, walk-in, horarios, login google sim)
  availability.ts         cálculo de slots/disponibilidad
  avatar.ts               opciones + build de URL DiceBear
  decisions.ts            constantes de negocio (ej. ventana de cancelación)
  money.ts time.ts utils.ts
```

### Dominio

- **Roles:** `cliente`, `barbero`, `admin`. El barbero se auto-registra → queda **inactivo/pendiente** → el admin lo activa → recién ahí aparece para reservar y puede cargar horarios.
- **Flujo de reserva:** el cliente se loguea PRIMERO → servicio → barbero → fecha/hora (muestra ocupados vs libres) → paga **seña** (MercadoPago simulado o efectivo) → confirmación.
- **Estados de turno** (`AppointmentStatus`): `hold`, `confirmada`, `en_curso`, `completada`, `no_show`, `cancelada`, `expirada`.
- **Pagos:** seña + saldo, cada uno por `efectivo` o `mercadopago`, con registro (`Payment`). El saldo se cobra en el local (al terminar en la Cola o desde Turnos).
- **Cola** (`/panel/cola`): vista animada en vivo. El barbero ve su sillón (cliente atendido) + siguiente + lista en espera; puede sentar, terminar (elige medio de pago), marcar ausente y avisar por WhatsApp. El admin ve la cola de todos y entra a la de cada barbero.
- **Avatares:** cada usuario arma el suyo en `/perfil` (DiceBear *avataaars*). Se guarda en `User.avatarUrl`; si es barbero también actualiza su `Barber.img`. Se usan en la cola, dashboard, mis-turnos.
- **TZ:** `America/Argentina/Buenos_Aires` (offset fijo -03:00).

### Auth (simulada)

Cookie `flow_session` = id de usuario. `lib/auth.ts`: `getSessionUser`, `requireStaff`, `requireAdmin`. En prod sería Supabase Auth. Las contraseñas están en texto plano (es simulación).

**Cuentas demo:**
| Rol | Email | Pass |
|-----|-------|------|
| admin | `admin@flowsite.com` | `admin123` |
| barbero (Lucio) | `barbero@demo.com` | `barbero123` |
| cliente | `cliente@demo.com` | `cliente123` |

## Marca y UI

- Paleta: negro + **rojo cromado** (`--primary` / `flow-red`) + **cyan neón** (`flow-cyan`, `--chart-2`). El **cyan es el color "activo/fluor"** en toda la app (estados activos, focos de selects/dropdowns, acentos). El rojo se reserva para acciones primarias (ej. "Nuevo turno").
- Tipografías: **Anton** (`font-display`/headings) + **Inter** (`font-sans`/body). El logo usa `.chrome-text italic` (efecto cromo/glitch).
- Tokens y mapeo shadcn→marca en `app/globals.css` (bloque `.dark` + `@theme inline`).
- Mismo `max-w` y padding entre header del panel y `<main>` para que aligneen (los `<main>` usan `w-full` para no encogerse al contenido).

## Gotchas / lecciones (importante)

- **react-day-picker**: pineado en **v9**. Re-correr `shadcn add calendar` lo sube a v10 y rompe el build (`table` ClassNames). Si pasa: `npm i react-day-picker@9`.
- **sonner**: reescrito sin `next-themes` (hardcodeado `theme="dark"` + `richColors`) en `components/ui/sonner.tsx`.
- **recharts en headless**: usar `isAnimationActive={false}` o no renderiza en screenshots.
- **DiceBear v9**: los colores (`hairColor`, `clothesColor`) van en **hex sin `#`** (ej. `2c1b18`), NO por nombre, o devuelve 400.
- **Cursor**: regla global en `globals.css` da `cursor: pointer` a `button:not(:disabled)` / `[role=button]` (los `<button>` nativos no lo traen).
- **Ícono de `input[type=time]`**: recoloreado con `filter: invert(1)` en `globals.css` para que se vea en oscuro.
- **Responsive mobile**: cuidar `min-w-0` en hijos flex, `overflow-x-clip` en mains, y grillas con `grid-cols-1` base explícito (las columnas `auto` crecen con el contenido).

## Verificación (visual)

No hay tests. Para verificar páginas autenticadas/interactivas:

1. `npm run build` (debe compilar) y `npm run dev`.
2. Instalar temporalmente `npm i -D puppeteer-core`, lanzar Chrome headless
   (`/Applications/Google Chrome.app/Contents/MacOS/Google Chrome`), setear la cookie
   `flow_session` al id del usuario (ej. `u-barbero-demo`), navegar y sacar screenshot /
   medir layout.
3. **Desinstalar** `npm uninstall puppeteer-core` para no ensuciar deps. Borrar scripts temporales.

Verificar siempre a 390px (mobile) y a un ancho desktop; chequear que `scrollWidth == clientWidth` (sin overflow horizontal).

## Convenciones

- Comentarios y textos de UI en **español** (es-AR).
- Mutaciones del estado vía **server actions** (`lib/actions.ts`, `lib/admin-actions.ts`) que llaman a `lib/store.ts` y hacen `revalidatePath`.
- Commits en español, formato convencional (`feat(...)`, `fix(...)`, etc.).
- Antes de commitear: `npm run build` OK y sin referencias a archivos temporales (`puppeteer`, `_shot.mjs`, dev-login) en `app/components/lib` ni en `package.json`.

## Docs

- `docs/PLAN-etapa2-turnos.md` — plan exhaustivo de la app de turnos.
- `docs/PLAN-etapa2-critica.md` — crítica/decisiones.
- `docs/SUPABASE-SETUP.md` — cómo cablear la base real.
