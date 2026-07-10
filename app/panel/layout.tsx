import { requireStaff } from "@/lib/auth";
import { PanelShell } from "@/components/panel/PanelShell";
import { listSucursales, getCurrentSucursalId } from "@/lib/sucursal";

// Layout del panel: sidebar (desktop) + drawer (mobile). La página de login
// (/panel/ingresar) no tiene sesión → se renderiza sin shell.
export default async function PanelLayout({ children }: { children: React.ReactNode }) {
  const staff = await requireStaff();
  if (!staff) return <>{children}</>;
  // Sucursales (si todavía no se corrió la migración, degrada a lista vacía).
  const [sucursales, currentSucursalId] = await Promise.all([
    listSucursales().catch(() => []),
    getCurrentSucursalId().catch(() => null),
  ]);
  return (
    <PanelShell user={staff} sucursales={sucursales} currentSucursalId={currentSucursalId}>
      {children}
    </PanelShell>
  );
}
