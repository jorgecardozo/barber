import Link from "next/link";
import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { PanelHeader } from "@/components/panel/PanelHeader";
import { BarberDialog } from "@/components/panel/BarberDialog";
import { BarberActiveToggle } from "@/components/panel/BarberActiveToggle";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { requireAdmin } from "@/lib/auth";
import { listBarbers, getUser } from "@/lib/store";

export const metadata: Metadata = { title: "Barberos · Panel Flow Site" };
export const dynamic = "force-dynamic";

export default async function BarberosPage() {
  const admin = await requireAdmin();
  if (!admin) redirect("/panel");
  const barbers = await listBarbers();
  const emails = new Map<string, string>();
  await Promise.all(
    barbers
      .filter((b) => b.userId)
      .map(async (b) => {
        const u = await getUser(b.userId!);
        if (u?.email) emails.set(b.id, u.email);
      }),
  );
  const pendientes = barbers.filter((b) => !b.active);
  const activos = barbers.filter((b) => b.active);

  return (
    <>
      <PanelHeader user={admin} active="barberos" />
      <main className="mx-auto w-full max-w-5xl min-w-0 flex-1 overflow-x-clip px-6 py-10 lg:px-8">
        <div className="mb-6 flex items-end justify-between">
          <div>
            <h1 className="font-display text-3xl">Barberos</h1>
            <p className="text-sm text-muted-foreground">Activá a los que se registran y gestioná el equipo.</p>
          </div>
          <BarberDialog />
        </div>

        {pendientes.length > 0 && (
          <section className="mb-8">
            <h2 className="mb-3 text-xs font-semibold uppercase tracking-[0.2em] text-amber-300">
              Pendientes de activación ({pendientes.length})
            </h2>
            <div className="space-y-2">
              {pendientes.map((b) => (
                <BarberRow key={b.id} b={b} email={emails.get(b.id)} />
              ))}
            </div>
          </section>
        )}

        <section>
          <h2 className="mb-3 text-xs font-semibold uppercase tracking-[0.2em] text-flow-cyan">Activos ({activos.length})</h2>
          <div className="space-y-2">
            {activos.map((b) => (
              <BarberRow key={b.id} b={b} email={emails.get(b.id)} />
            ))}
          </div>
        </section>

        <p className="mt-8 text-sm text-muted-foreground">
          ¿Un barbero nuevo? Decile que se registre en{" "}
          <Link href="/ingresar?tab=barbero" className="text-flow-cyan hover:underline">la página de ingreso</Link>{" "}
          y después lo activás acá.
        </p>
      </main>
    </>
  );
}

function BarberRow({ b, email }: { b: import("@/lib/types").Barber; email?: string }) {
  return (
    <Card>
      <CardContent className="flex flex-wrap items-center gap-4 py-3">
        <Avatar className="h-11 w-11">
          <AvatarImage src={b.img} alt={b.name} />
          <AvatarFallback>{b.name[0]}</AvatarFallback>
        </Avatar>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <p className="font-display text-lg">{b.name}</p>
            {b.active ? (
              <Badge variant="outline" className="border-transparent bg-flow-cyan/15 text-flow-cyan">Activo</Badge>
            ) : (
              <Badge variant="outline" className="border-transparent bg-amber-400/15 text-amber-300">Pendiente</Badge>
            )}
          </div>
          <p className="text-xs text-muted-foreground">
            {b.specialty}
            {email ? ` · ${email}` : ""}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground">{b.active ? "Activo" : "Inactivo"}</span>
          <BarberActiveToggle id={b.id} active={b.active} />
          <BarberDialog barber={{ id: b.id, name: b.name, specialty: b.specialty }} />
        </div>
      </CardContent>
    </Card>
  );
}
