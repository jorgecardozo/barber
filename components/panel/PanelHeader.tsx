import Link from "next/link";
import { LayoutDashboard, CalendarDays, Scissors, Users, Clock, LogOut } from "lucide-react";
import { logoutAction } from "@/lib/actions";
import { Button } from "@/components/ui/button";
import type { User } from "@/lib/types";

type TabKey = "dashboard" | "turnos" | "servicios" | "barberos" | "horarios";

const NAV: { key: TabKey; href: string; label: string; icon: React.ElementType; adminOnly?: boolean }[] = [
  { key: "dashboard", href: "/panel", label: "Dashboard", icon: LayoutDashboard },
  { key: "turnos", href: "/panel/turnos", label: "Turnos", icon: CalendarDays },
  { key: "servicios", href: "/panel/servicios", label: "Servicios", icon: Scissors },
  { key: "barberos", href: "/panel/barberos", label: "Barberos", icon: Users, adminOnly: true },
  { key: "horarios", href: "/panel/horarios", label: "Horarios", icon: Clock },
];

export function PanelHeader({ user, active }: { user: User; active: TabKey }) {
  const items = NAV.filter((n) => !n.adminOnly || user.role === "admin");
  return (
    <header className="sticky top-0 z-40 border-b border-border bg-background/85 backdrop-blur-md">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-5 py-2.5">
        <div className="flex items-center gap-5 overflow-x-auto">
          <Link href="/panel" className="shrink-0 font-display text-lg tracking-wide">
            FLOW <span className="chrome-text italic">PANEL</span>
          </Link>
          <nav className="flex items-center gap-1">
            {items.map((n) => {
              const Icon = n.icon;
              const on = active === n.key;
              return (
                <Link
                  key={n.key}
                  href={n.href}
                  className={`flex shrink-0 items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-medium transition-colors ${
                    on ? "bg-secondary text-foreground" : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  <Icon className="h-4 w-4" />
                  <span className="hidden sm:inline">{n.label}</span>
                </Link>
              );
            })}
          </nav>
        </div>
        <div className="flex shrink-0 items-center gap-3">
          <span className="hidden text-sm text-muted-foreground md:inline">
            {user.name} · <span className="text-flow-cyan">{user.role}</span>
          </span>
          <form action={logoutAction}>
            <Button variant="outline" size="sm">
              <LogOut className="h-4 w-4" /> <span className="hidden sm:inline">Salir</span>
            </Button>
          </form>
        </div>
      </div>
    </header>
  );
}
