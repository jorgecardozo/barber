import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { PanelShell, CLIENT_SECTIONS } from "@/components/panel/PanelShell";
import { MisTurnosView, type MisTurnoRow } from "@/components/panel/MisTurnosView";
import { getSessionUser } from "@/lib/auth";
import { appointmentsForCustomer, listBarbers, listServices } from "@/lib/store";
import { DECISIONS } from "@/lib/decisions";
import { fmtDateLong, fmtTime } from "@/lib/time";

export const metadata: Metadata = { title: "Mis turnos · Flow Site" };
export const dynamic = "force-dynamic";

export default async function MisTurnosPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const sp = await searchParams;
  const user = await getSessionUser();
  if (!user) redirect("/ingresar?next=/mis-turnos");

  const [turnos, services, barbers] = await Promise.all([
    appointmentsForCustomer(user.id),
    listServices(),
    listBarbers(),
  ]);
  const svcById = new Map(services.map((s) => [s.id, s]));
  const barbById = new Map(barbers.map((b) => [b.id, b]));
  const now = Date.now();

  const rows: MisTurnoRow[] = turnos.map((t) => {
    const horas = (Date.parse(t.start) - now) / 3_600_000;
    return {
      id: t.id,
      serviceName: svcById.get(t.serviceId)?.name ?? "Servicio",
      barberName: barbById.get(t.barberId)?.name ?? "Barbero",
      dateLabel: fmtDateLong(t.start.slice(0, 10)),
      time: fmtTime(new Date(t.start)),
      depositCents: t.depositCents,
      status: t.status,
      isHold: t.status === "hold",
      cancelable: (t.status === "confirmada" || t.status === "hold") && horas >= DECISIONS.cancelWindowHours,
    };
  });

  return (
    <PanelShell user={user} navSections={CLIENT_SECTIONS} homeHref="/mis-turnos" sucursales={[]}>
      <MisTurnosView
        rows={rows}
        firstName={user.name.split(" ")[0]}
        error={sp.error}
        cancelWindowHours={DECISIONS.cancelWindowHours}
      />
    </PanelShell>
  );
}
