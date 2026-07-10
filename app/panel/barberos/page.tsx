import Link from "next/link";
import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { BarberDialog } from "@/components/panel/BarberDialog";
import { BarbersTable } from "@/components/panel/BarbersTable";
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

  // Pendientes primero (para que se vean arriba en la tabla).
  const rows = [...barbers]
    .sort((a, b) => Number(a.active) - Number(b.active))
    .map((b) => ({
      id: b.id,
      name: b.name,
      specialty: b.specialty,
      active: b.active,
      img: b.img,
      email: emails.get(b.id),
    }));

  return (
    <main className="mx-auto flex min-h-0 w-full max-w-5xl min-w-0 flex-1 flex-col px-4 py-6 sm:px-6 lg:px-8">
      <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-3xl">Barberos</h1>
          <p className="text-sm text-muted-foreground">Activá a los que se registran y gestioná el equipo.</p>
        </div>
        <BarberDialog />
      </div>

      <BarbersTable barbers={rows} />

      <p className="mt-4 shrink-0 text-sm text-muted-foreground">
        ¿Un barbero nuevo? Decile que se registre en{" "}
        <Link href="/ingresar?tab=barbero" className="text-flow-cyan hover:underline">la página de ingreso</Link>{" "}
        y después lo activás acá.
      </p>
    </main>
  );
}
