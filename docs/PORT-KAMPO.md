# Port de mejoras de kampo → flow-site

Estado de la migración de UI/UX y features de **kampo** a **flow-site**, respetando
el estilo de flow-site (dark de marca + light nuevo).

## ✅ Hecho (compila y committeado)

1. **Modo light** (`next-themes`) con la identidad Flow (rojo/cyan sobre superficies
   claras). Default dark (idéntico a antes). Toggle 🌙/☀️ en el panel.
   - `components/theme-provider.tsx`, `components/ThemeToggle.tsx`, `app/globals.css` (`:root`), `app/layout.tsx`.
2. **Sidebar del panel** (desktop hover-expand) + **drawer mobile arrastrable**
   (angostar/cerrar por gesto, ancho persistente) → reemplaza el header del panel.
   - `components/panel/PanelShell.tsx`, `app/panel/layout.tsx`. Se quitó `PanelHeader` de las páginas.
3. **Side-modal (Sheet)** para editar servicios y barberos (en vez de diálogo centrado)
   + **header de tabla sticky**.
   - `components/ui/sheet.tsx`, `ServiceDialog.tsx`, `BarberDialog.tsx`, `components/ui/table.tsx`.
4. **Google OAuth** — route handler `/auth/callback` (exchange code + asegura profile).
   - `app/auth/callback/route.ts`. (El action `loginGoogleAction` ya existía.)
5. **Multi-sucursal (cimientos)** — migración aditiva + selector de sucursal en el panel.
   - `supabase/migrations/0005_sucursales.sql`, `lib/sucursal.ts`, `lib/sucursal-actions.ts`,
     `components/panel/SucursalSwitcher.tsx`. Degrada a "sin sucursales" si no se corrió la migración.

## ⚙️ Pasos del usuario (config externa)

- **Google OAuth**: habilitar el provider Google en Supabase (Client ID/Secret) y agregar
  `.../auth/callback` como redirect. Igual que se hizo con Auth0 en kampo.
- **Multi-sucursal**: correr `supabase/migrations/0005_sucursales.sql` (aditivo, no rompe nada:
  crea la sucursal por defecto y backfillea). Con una sola sucursal, el selector no aparece.

## ⏳ Pendiente de wiring (multi-sucursal real)

La migración deja `sucursal_id` con **default** = sucursal por defecto, así que la app
sigue funcionando con **una** sucursal sin tocar queries. Para multi-sucursal real falta
**scopear las queries de `lib/store.ts` por la sucursal activa** (`getCurrentSucursalId()`):
`listBarbers`, `listServices`, `listAllAppointments`, `working_hours`, `payments`, etc.,
y estampar `sucursal_id` en las inserciones (crear turno/servicio/barbero). Es invasivo y
conviene hacerlo verificando contra Supabase local (no romper la reserva pública).
