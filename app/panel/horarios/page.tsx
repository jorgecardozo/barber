import Link from "next/link";
import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { HorariosEditor } from "@/components/panel/HorariosEditor";
import { requireStaff } from "@/lib/auth";
import { getBarber, getBarberByUserId, listBarbers, workingHoursForBarber } from "@/lib/store";

export const metadata: Metadata = { title: "Horarios · Panel Flow Site" };
export const dynamic = "force-dynamic";

export default async function HorariosPage({
  searchParams,
}: {
  searchParams: Promise<{ barber?: string }>;
}) {
  const staff = await requireStaff();
  if (!staff) redirect("/panel/ingresar");
  const sp = await searchParams;

  const isAdmin = staff.role === "admin";
  const activos = (await listBarbers()).filter((b) => b.active);

  // Barbero: su propio perfil. Admin: el seleccionado (o el primero).
  const barber = isAdmin
    ? (sp.barber ? await getBarber(sp.barber) : activos[0])
    : await getBarberByUserId(staff.id);

  if (!isAdmin && (!barber || !barber.active)) {
    return (
      <>
        <main className="mx-auto max-w-md flex-1 px-5 py-24 text-center text-muted-foreground">
          Tu cuenta de barbero todavía no está activa. Cuando el admin te active vas a poder cargar tus horarios.
        </main>
      </>
    );
  }

  const hours = barber ? (await workingHoursForBarber(barber.id)).map((h) => ({ weekday: h.weekday, open: h.open, close: h.close, breakStart: h.breakStart, breakEnd: h.breakEnd })) : [];

  return (
    <>
      <main className="mx-auto w-full max-w-3xl min-w-0 flex-1 overflow-x-clip px-6 py-10 lg:px-8">
        <h1 className="mb-1 font-display text-3xl">Horarios</h1>
        <p className="mb-6 text-sm text-muted-foreground">Definí los días y horas de atención.</p>

        {isAdmin && (
          <div className="mb-6 flex flex-wrap gap-2">
            {activos.map((b) => (
              <Link
                key={b.id}
                href={`/panel/horarios?barber=${b.id}`}
                className={`rounded-full border px-4 py-1.5 text-sm transition-colors ${
                  barber?.id === b.id ? "border-flow-cyan/50 bg-flow-cyan/10 text-flow-cyan" : "border-border text-muted-foreground hover:text-foreground"
                }`}
              >
                {b.name}
              </Link>
            ))}
          </div>
        )}

        {barber && <HorariosEditor barberId={barber.id} barberName={barber.name} hours={hours} />}
      </main>
    </>
  );
}
