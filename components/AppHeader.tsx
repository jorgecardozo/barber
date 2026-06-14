import Link from "next/link";
import Image from "next/image";
import { logoutAction } from "@/lib/actions";
import type { User } from "@/lib/types";

export function AppHeader({ user }: { user: User | null }) {
  return (
    <header className="sticky top-0 z-40 border-b border-white/5 bg-ink/85 backdrop-blur-md">
      <div className="mx-auto flex max-w-5xl items-center justify-between px-5 py-3">
        <Link href="/" className="flex items-center gap-2" aria-label="Inicio">
          <Image src="/logo-5.png" alt="Flow Site" width={555} height={590} className="h-7 w-auto mix-blend-screen" />
          <span className="font-display text-base tracking-wide">FLOW SITE</span>
        </Link>

        <nav className="flex items-center gap-2 text-sm">
          {user ? (
            <>
              <Link href="/mis-turnos" className="rounded-full px-3 py-1.5 text-ash transition-colors hover:text-bone">
                Mis turnos
              </Link>
              <span className="hidden text-ash sm:inline">·</span>
              <span className="hidden text-bone sm:inline">{user.name.split(" ")[0]}</span>
              <form action={logoutAction}>
                <button className="rounded-full border border-white/10 px-3 py-1.5 text-ash transition-colors hover:text-bone">
                  Salir
                </button>
              </form>
            </>
          ) : (
            <Link href="/ingresar" className="rounded-full border border-white/10 px-4 py-1.5 text-bone transition-colors hover:bg-white/5">
              Ingresar
            </Link>
          )}
        </nav>
      </div>
    </header>
  );
}
