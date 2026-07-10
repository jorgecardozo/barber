import { requireStaff } from "@/lib/auth";
import { PanelShell } from "@/components/panel/PanelShell";

// Layout del panel: sidebar (desktop) + drawer (mobile). La página de login
// (/panel/ingresar) no tiene sesión → se renderiza sin shell.
export default async function PanelLayout({ children }: { children: React.ReactNode }) {
  const staff = await requireStaff();
  if (!staff) return <>{children}</>;
  return <PanelShell user={staff}>{children}</PanelShell>;
}
