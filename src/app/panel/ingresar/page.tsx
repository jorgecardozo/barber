import Link from "next/link";
import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { requireStaff } from "@/shared/api/auth";
import { loginAction } from "@/shared/api/actions";

export const metadata: Metadata = { title: "Panel · Ingresar" };
export const dynamic = "force-dynamic";

export default async function PanelLoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const sp = await searchParams;
  const staff = await requireStaff();
  if (staff) redirect("/panel");

  return (
    <main className="flex flex-1 items-center justify-center px-5 py-16">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <Link href="/" className="font-display text-2xl tracking-wide">
            FLOW <span className="chrome-text italic">SITE</span>
          </Link>
          <p className="mt-2 text-xs uppercase tracking-[0.3em] text-flow-cyan">Panel de gestión</p>
        </div>

        {sp.error === "cred" && (
          <p className="mb-4 rounded-xl border border-flow-red/40 bg-flow-red/10 px-4 py-3 text-sm text-bone">
            Credenciales incorrectas.
          </p>
        )}

        <form action={loginAction} className="space-y-3 rounded-2xl border border-white/8 bg-ink-2 p-6">
          <input type="hidden" name="next" value="/panel" />
          <label className="block">
            <span className="mb-1 block text-xs uppercase tracking-wider text-ash">Email</span>
            <input name="email" type="email" required className="w-full rounded-xl border border-white/10 bg-ink px-4 py-3 text-bone outline-none focus:border-flow-cyan/50" />
          </label>
          <label className="block">
            <span className="mb-1 block text-xs uppercase tracking-wider text-ash">Contraseña</span>
            <input name="password" type="password" required className="w-full rounded-xl border border-white/10 bg-ink px-4 py-3 text-bone outline-none focus:border-flow-cyan/50" />
          </label>
          <button className="w-full rounded-full bg-flow-red px-6 py-3.5 font-semibold text-white">Entrar</button>
        </form>

        <p className="mt-5 text-center text-xs leading-relaxed text-muted-foreground">
          Demo admin: <span className="text-flow-cyan">admin@flowsite.com</span> / admin123
          <br />
          Demo barbero: <span className="text-flow-cyan">barbero@demo.com</span> / barbero123
        </p>
      </div>
    </main>
  );
}
