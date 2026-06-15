import Link from "next/link";
import { LayoutDashboard, CalendarDays, Scissors, Users, Clock, LogOut, ListOrdered } from "lucide-react";
import { logoutAction } from "@/lib/actions";
import { Button } from "@/components/ui/button";
import type { User } from "@/lib/types";

type TabKey = "dashboard" | "cola" | "turnos" | "servicios" | "barberos" | "horarios";

const NAV: { key: TabKey; href: string; label: string; icon: React.ElementType; adminOnly?: boolean }[] = [
  { key: "dashboard", href: "/panel", label: "Dashboard", icon: LayoutDashboard },
  { key: "cola", href: "/panel/cola", label: "Cola", icon: ListOrdered },
  { key: "turnos", href: "/panel/turnos", label: "Turnos", icon: CalendarDays },
  { key: "servicios", href: "/panel/servicios", label: "Servicios", icon: Scissors },
  { key: "barberos", href: "/panel/barberos", label: "Barberos", icon: Users, adminOnly: true },
  { key: "horarios", href: "/panel/horarios", label: "Horarios", icon: Clock },
];

export function PanelHeader({ user, active }: { user: User; active: TabKey }) {
  const items = NAV.filter((n) => !n.adminOnly || user.role === "admin");
  return (
    <header className="sticky top-0 z-40 border-b border-border bg-background/85 backdrop-blur-md">
      <div className="mx-auto flex max-w-6xl items-center gap-2 px-4 py-2.5 sm:gap-3 sm:px-5">
        <Link href="/panel" className="shrink-0 font-display text-base tracking-wide sm:text-lg">
          FLOW <span className="chrome-text italic">SITE</span>
        </Link>
        <nav className="flex min-w-0 flex-1 items-center gap-1 overflow-x-auto [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {items.map((n) => {
            const Icon = n.icon;
            const on = active === n.key;
            return (
              <Link
                key={n.key}
                href={n.href}
                title={n.label}
                className={`flex shrink-0 items-center gap-1.5 rounded-full px-2.5 py-1.5 text-sm font-medium transition-colors sm:px-3 ${
                  on ? "bg-secondary text-foreground" : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <Icon className="h-4 w-4 shrink-0" />
                <span className="hidden lg:inline">{n.label}</span>
              </Link>
            );
          })}
        </nav>
        <div className="flex shrink-0 items-center gap-2">
          <span className="hidden text-sm text-muted-foreground lg:inline">
            {user.name} · <span className="text-flow-cyan">{user.role}</span>
          </span>
          <Link
            href="/perfil"
            title="Mi avatar"
            className="shrink-0 rounded-full ring-offset-2 ring-offset-background transition hover:ring-2 hover:ring-flow-cyan/50"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={
                user.avatarUrl ??
                `https://api.dicebear.com/9.x/avataaars/svg?seed=${encodeURIComponent(user.name)}&radius=50`
              }
              alt="Mi avatar"
              className="h-8 w-8 rounded-full border border-border bg-background"
            />
          </Link>
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
