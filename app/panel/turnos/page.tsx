import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { PanelHeader } from "@/components/panel/PanelHeader";
import { TurnosTable, type TurnoRow } from "@/components/panel/TurnosTable";
import { WalkInDialog } from "@/components/panel/WalkInDialog";
import { requireStaff } from "@/lib/auth";
import { expireHolds, getBarber, getService, listAllAppointments, listBarbers, listServices } from "@/lib/store";
import { depositForPrice } from "@/lib/decisions";
import { horizonDates } from "@/lib/availability";
import { fmtDateLong, fmtDateShort, fmtTime, todayAR } from "@/lib/time";

export const metadata: Metadata = { title: "Turnos · Panel Flow Site" };
export const dynamic = "force-dynamic";

export default async function TurnosPage() {
  const staff = await requireStaff();
  if (!staff) redirect("/panel/ingresar");
  expireHolds();

  const all = listAllAppointments().filter((a) => staff.role === "admin" || a.barberId === staff.barberId);

  const rows: TurnoRow[] = all.map((a) => {
    const dateStr = a.start.slice(0, 10);
    const short = fmtDateShort(dateStr);
    return {
      id: a.id,
      startMs: Date.parse(a.start),
      dateValue: dateStr,
      dateLabel: `${short.weekday} ${short.day}`,
      time: fmtTime(new Date(a.start)),
      customerName: a.customerName,
      customerPhone: a.customerPhone,
      barberId: a.barberId,
      barberName: getBarber(a.barberId)?.name ?? a.barberId,
      serviceName: getService(a.serviceId)?.name ?? a.serviceId,
      priceCents: a.priceCents,
      depositCents: a.depositCents,
      balanceCents: a.priceCents - a.depositCents,
      depositMethod: a.depositMethod,
      depositStatus: a.depositStatus,
      balanceMethod: a.balanceMethod,
      balanceStatus: a.balanceStatus,
      status: a.status,
    };
  });

  const barbersFilter =
    staff.role === "admin"
      ? listBarbers().map((b) => ({ id: b.id, name: b.name }))
      : [{ id: staff.barberId!, name: getBarber(staff.barberId!)?.name ?? "Yo" }];

  // Datos para el alta de turno (walk-in)
  const wiServices = listServices().map((s) => ({
    id: s.id,
    name: s.name,
    priceCents: s.priceCents,
    durationMin: s.durationMin,
    depositCents: depositForPrice(s.priceCents),
  }));
  const wiBarbers = listBarbers()
    .filter((b) => b.active && (staff.role === "admin" || b.id === staff.barberId))
    .map((b) => ({ id: b.id, name: b.name, serviceIds: b.serviceIds }));
  const wiDates = horizonDates().map((d) => ({ value: d, label: fmtDateLong(d) }));

  return (
    <>
      <PanelHeader user={staff} active="turnos" />
      <main className="mx-auto max-w-6xl flex-1 px-6 py-10 lg:px-8">
        <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
          <div>
            <h1 className="mb-1 font-display text-3xl">Turnos</h1>
            <p className="text-sm text-muted-foreground">Filtrá, buscá y registrá pagos.</p>
          </div>
          <WalkInDialog services={wiServices} barbers={wiBarbers} dates={wiDates} />
        </div>
        <TurnosTable rows={rows} barbers={barbersFilter} today={todayAR()} />
      </main>
    </>
  );
}
