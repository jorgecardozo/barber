import Link from "next/link";
import type { Metadata } from "next";
import { AppHeader } from "@/components/AppHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { getSessionUser } from "@/lib/auth";
import { loginAction, registerAction } from "@/lib/actions";
import { loginGoogleAction, registerBarberAction } from "@/lib/admin-actions";

export const metadata: Metadata = { title: "Ingresar · Flow Site" };
export const dynamic = "force-dynamic";

const ERRORS: Record<string, string> = {
  cred: "Email o contraseña incorrectos.",
  existe: "Ya existe una cuenta con ese email.",
  campos: "Completá todos los campos (contraseña de 4+ caracteres).",
};

type Tab = "login" | "registro" | "barbero";

export default async function IngresarPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string; error?: string; next?: string }>;
}) {
  const sp = await searchParams;
  const user = await getSessionUser();
  const next = sp.next ?? "/mis-turnos";
  const tab: Tab = sp.tab === "registro" ? "registro" : sp.tab === "barbero" ? "barbero" : "login";
  const errMsg = sp.error ? ERRORS[sp.error] : null;

  const tabLink = (t: Tab, label: string) => (
    <Link
      href={t === "login" ? `/ingresar?next=${encodeURIComponent(next)}` : `/ingresar?tab=${t}&next=${encodeURIComponent(next)}`}
      className={`rounded-md py-2 text-center text-sm font-medium transition-colors ${tab === t ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"}`}
    >
      {label}
    </Link>
  );

  return (
    <>
      <AppHeader user={user ?? null} />
      <main className="flex-1">
        <section className="mx-auto max-w-md px-5 py-12">
          <div className="mb-6 text-center">
            <h1 className="font-display text-3xl">
              {tab === "barbero" ? "Sumate como " : tab === "registro" ? "Creá tu " : "Ingresá a "}
              <span className="chrome-text italic">{tab === "barbero" ? "barbero" : "cuenta"}</span>
            </h1>
            <p className="mt-2 text-sm text-muted-foreground">
              {tab === "barbero" ? "Registrate; el admin te activa y empezás a trabajar." : "Para reservar y ver tus turnos."}
            </p>
          </div>

          {/* Google (no en la pestaña barbero) */}
          {tab !== "barbero" && (
            <>
              <form action={loginGoogleAction}>
                <input type="hidden" name="next" value={next} />
                <Button type="submit" variant="outline" className="w-full">
                  <GoogleIcon /> Continuar con Google
                </Button>
              </form>
              <div className="my-5 flex items-center gap-3">
                <Separator className="flex-1" />
                <span className="text-xs text-muted-foreground">o con tu email</span>
                <Separator className="flex-1" />
              </div>
            </>
          )}

          {/* Tabs */}
          <div className="mb-6 grid grid-cols-3 gap-1 rounded-lg border border-border p-1">
            {tabLink("login", "Ingresar")}
            {tabLink("registro", "Crear cuenta")}
            {tabLink("barbero", "Soy barbero")}
          </div>

          {errMsg && (
            <p className="mb-5 rounded-md border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm text-foreground">
              {errMsg}
            </p>
          )}

          <Card>
            <CardContent className="pt-6">
              {tab === "login" && (
                <form action={loginAction} className="space-y-4">
                  <input type="hidden" name="next" value={next} />
                  <Field name="email" label="Email" type="email" placeholder="tu@email.com" />
                  <Field name="password" label="Contraseña" type="password" placeholder="••••••" />
                  <Button type="submit" className="w-full">Ingresar</Button>
                </form>
              )}
              {tab === "registro" && (
                <form action={registerAction} className="space-y-4">
                  <input type="hidden" name="next" value={next} />
                  <Field name="name" label="Nombre" placeholder="Tu nombre" />
                  <Field name="phone" label="WhatsApp" placeholder="Ej: 5492995551234" />
                  <Field name="email" label="Email" type="email" placeholder="tu@email.com" />
                  <Field name="password" label="Contraseña" type="password" placeholder="••••••" />
                  <Button type="submit" className="w-full">Crear cuenta</Button>
                </form>
              )}
              {tab === "barbero" && (
                <form action={registerBarberAction} className="space-y-4">
                  <Field name="name" label="Nombre" placeholder="Tu nombre" />
                  <Field name="phone" label="WhatsApp" placeholder="Ej: 5492995551234" />
                  <Field name="email" label="Email" type="email" placeholder="tu@email.com" />
                  <Field name="password" label="Contraseña" type="password" placeholder="••••••" />
                  <p className="rounded-md bg-secondary/60 px-3 py-2 text-xs text-muted-foreground">
                    Tu cuenta queda pendiente hasta que el admin te active. Recién ahí vas a aparecer
                    disponible para los turnos.
                  </p>
                  <Button type="submit" className="w-full">Registrarme como barbero</Button>
                </form>
              )}
            </CardContent>
          </Card>

          <Card className="mt-6 border-dashed">
            <CardContent className="py-4 text-xs text-muted-foreground">
              <p className="mb-1 font-semibold text-foreground">🔑 Cuentas de prueba (demo)</p>
              <p>Cliente: <span className="text-flow-cyan">cliente@demo.com</span> / cliente123</p>
              <p>Barbero: <span className="text-flow-cyan">barbero@demo.com</span> / barbero123</p>
              <p>Admin: <span className="text-flow-cyan">admin@flowsite.com</span> / admin123</p>
            </CardContent>
          </Card>
        </section>
      </main>
    </>
  );
}

function Field({ name, label, type = "text", placeholder }: { name: string; label: string; type?: string; placeholder?: string }) {
  return (
    <div className="space-y-1.5">
      <Label htmlFor={name}>{label}</Label>
      <Input id={name} name={name} type={type} placeholder={placeholder} required />
    </div>
  );
}

function GoogleIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4">
      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1Z" />
      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84A11 11 0 0 0 12 23Z" />
      <path fill="#FBBC05" d="M5.84 14.1a6.6 6.6 0 0 1 0-4.2V7.06H2.18a11 11 0 0 0 0 9.88l3.66-2.84Z" />
      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1A11 11 0 0 0 2.18 7.06l3.66 2.84C6.71 7.3 9.14 5.38 12 5.38Z" />
    </svg>
  );
}
