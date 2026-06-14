import Link from "next/link";
import type { Metadata } from "next";
import { AppHeader } from "@/components/AppHeader";
import { getSessionUser } from "@/lib/auth";
import { loginAction, registerAction } from "@/lib/actions";

export const metadata: Metadata = { title: "Ingresar · Flow Site" };
export const dynamic = "force-dynamic";

const ERRORS: Record<string, string> = {
  cred: "Email o contraseña incorrectos.",
  existe: "Ya existe una cuenta con ese email.",
  campos: "Completá todos los campos (contraseña de 4+ caracteres).",
};

export default async function IngresarPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string; error?: string; next?: string }>;
}) {
  const sp = await searchParams;
  const user = await getSessionUser();
  const next = sp.next ?? "/mis-turnos";
  const isRegister = sp.tab === "registro";
  const errMsg = sp.error ? ERRORS[sp.error] : null;

  return (
    <>
      <AppHeader user={user ?? null} />
      <main className="flex-1">
        <section className="mx-auto max-w-md px-5 py-14">
          <div className="mb-6 text-center">
            <h1 className="font-display text-3xl">
              {isRegister ? "Creá tu " : "Ingresá a "}
              <span className="chrome-text italic">cuenta</span>
            </h1>
            <p className="mt-2 text-sm text-ash">
              {isRegister ? "Para reservar y ver tus turnos." : "Para reservar y ver tus turnos."}
            </p>
          </div>

          {/* Tabs */}
          <div className="mb-6 grid grid-cols-2 rounded-full border border-white/10 p-1 text-sm">
            <Link
              href={`/ingresar?next=${encodeURIComponent(next)}`}
              className={`rounded-full py-2 text-center font-medium transition-colors ${!isRegister ? "bg-flow-red text-white" : "text-ash"}`}
            >
              Ingresar
            </Link>
            <Link
              href={`/ingresar?tab=registro&next=${encodeURIComponent(next)}`}
              className={`rounded-full py-2 text-center font-medium transition-colors ${isRegister ? "bg-flow-red text-white" : "text-ash"}`}
            >
              Crear cuenta
            </Link>
          </div>

          {errMsg && (
            <p className="mb-5 rounded-xl border border-flow-red/40 bg-flow-red/10 px-4 py-3 text-sm text-bone">
              {errMsg}
            </p>
          )}

          {isRegister ? (
            <form action={registerAction} className="space-y-3">
              <input type="hidden" name="next" value={next} />
              <Field name="name" label="Nombre" placeholder="Tu nombre" />
              <Field name="phone" label="WhatsApp" placeholder="Ej: 5492995551234" />
              <Field name="email" label="Email" type="email" placeholder="tu@email.com" />
              <Field name="password" label="Contraseña" type="password" placeholder="••••••" />
              <Submit>Crear cuenta</Submit>
            </form>
          ) : (
            <form action={loginAction} className="space-y-3">
              <input type="hidden" name="next" value={next} />
              <Field name="email" label="Email" type="email" placeholder="tu@email.com" />
              <Field name="password" label="Contraseña" type="password" placeholder="••••••" />
              <Submit>Ingresar</Submit>
            </form>
          )}

          {/* Credenciales demo */}
          <div className="mt-8 rounded-xl border border-white/8 bg-ink-2 p-4 text-xs text-ash">
            <p className="mb-1 font-semibold text-bone">🔑 Cuentas de prueba (demo)</p>
            <p>Cliente: <span className="text-flow-cyan">cliente@demo.com</span> / cliente123</p>
            <p>Staff (panel): <span className="text-flow-cyan">admin@flowsite.com</span> / admin123</p>
          </div>
        </section>
      </main>
    </>
  );
}

function Field({
  name,
  label,
  type = "text",
  placeholder,
}: {
  name: string;
  label: string;
  type?: string;
  placeholder?: string;
}) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs uppercase tracking-wider text-ash">{label}</span>
      <input
        name={name}
        type={type}
        required
        placeholder={placeholder}
        className="w-full rounded-xl border border-white/10 bg-ink px-4 py-3 text-bone outline-none transition-colors placeholder:text-ash/50 focus:border-flow-cyan/50"
      />
    </label>
  );
}

function Submit({ children }: { children: React.ReactNode }) {
  return (
    <button className="mt-2 w-full rounded-full bg-flow-red px-6 py-3.5 font-semibold text-white shadow-[0_10px_30px_-10px] shadow-flow-red/60 ring-1 ring-white/10 transition-transform hover:scale-[1.02]">
      {children}
    </button>
  );
}
