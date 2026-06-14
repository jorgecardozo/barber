import Link from "next/link";
import { logoutAction } from "@/lib/actions";
import type { User } from "@/lib/types";

export function PanelHeader({ user, active }: { user: User; active: "dashboard" | "turnos" }) {
  return (
    <header className="sticky top-0 z-40 border-b border-white/5 bg-ink/85 backdrop-blur-md">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-5 py-3">
        <div className="flex items-center gap-6">
          <Link href="/panel" className="font-display text-lg tracking-wide">
            FLOW <span className="chrome-text italic">PANEL</span>
          </Link>
          <nav className="flex items-center gap-1 text-sm">
            <Tab href="/panel" label="Dashboard" on={active === "dashboard"} />
            <Tab href="/panel/turnos" label="Turnos" on={active === "turnos"} />
          </nav>
        </div>
        <div className="flex items-center gap-3 text-sm">
          <span className="hidden text-ash sm:inline">
            {user.name} · <span className="text-flow-cyan">{user.role}</span>
          </span>
          <form action={logoutAction}>
            <button className="rounded-full border border-white/10 px-3 py-1.5 text-ash transition-colors hover:text-bone">
              Salir
            </button>
          </form>
        </div>
      </div>
    </header>
  );
}

function Tab({ href, label, on }: { href: string; label: string; on: boolean }) {
  return (
    <Link
      href={href}
      className={`rounded-full px-3 py-1.5 font-medium transition-colors ${
        on ? "bg-white/10 text-bone" : "text-ash hover:text-bone"
      }`}
    >
      {label}
    </Link>
  );
}
