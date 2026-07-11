import type { ReactNode } from "react";
import { AppHeader } from "@/components/AppHeader";
import { PanelShell, CLIENT_SECTIONS } from "@/components/panel/PanelShell";
import type { User } from "@/shared/model/types";

// Shell de las vistas de cliente: si hay sesión, usa la misma sidebar/navbar del
// panel (CLIENT_SECTIONS). Sin sesión (flujo público), cae al header simple.
export function ClientShell({ user, children }: { user: User | null; children: ReactNode }) {
  if (!user) {
    return (
      <>
        <AppHeader user={null} />
        <main className="flex-1">{children}</main>
      </>
    );
  }
  return (
    <PanelShell user={user} navSections={CLIENT_SECTIONS} homeHref="/mis-turnos" sucursales={[]}>
      {children}
    </PanelShell>
  );
}
