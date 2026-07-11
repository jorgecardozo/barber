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
              <Link
                href="/perfil"
                title="Editar mi avatar"
                className="flex items-center gap-2 rounded-full px-1.5 py-1 transition-colors hover:bg-white/5"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={
                    user.avatarUrl ??
                    `https://api.dicebear.com/9.x/avataaars/svg?seed=${encodeURIComponent(user.name)}&radius=50`
                  }
                  alt=""
                  width={28}
                  height={28}
                  className="h-7 w-7 rounded-full border border-white/15 bg-ink-2"
                />
                <span className="hidden text-bone sm:inline">{user.name.split(" ")[0]}</span>
              </Link>
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
