import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { PanelHeader } from "@/components/panel/PanelHeader";
import { TurnosTable, type TurnoRow } from "@/components/panel/TurnosTable";
import { requireStaff } from "@/lib/auth";
import { expireHolds, getBarber, getService, listAllAppointments, listBarbers } from "@/lib/store";
import { fmtDateShort, fmtTime, todayAR } from "@/lib/time";

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

  const barbers =
    staff.role === "admin"
      ? listBarbers().map((b) => ({ id: b.id, name: b.name }))
      : [{ id: staff.barberId!, name: getBarber(staff.barberId!)?.name ?? "Yo" }];

  return (
    <>
      <PanelHeader user={staff} active="turnos" />
      <main className="mx-auto max-w-6xl flex-1 px-5 py-8">
        <h1 className="mb-1 font-display text-3xl">Turnos</h1>
        <p className="mb-6 text-sm text-ash">Filtrá, buscá y registrá pagos.</p>
        <TurnosTable rows={rows} barbers={barbers} today={todayAR()} />
      </main>
    </>
  );
}
