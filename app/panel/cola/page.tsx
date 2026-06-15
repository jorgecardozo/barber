import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { PanelHeader } from "@/components/panel/PanelHeader";
import { ColaView } from "@/components/panel/ColaView";
import { requireStaff } from "@/lib/auth";
import { appointmentsOnDate, getBarberByUserId, getService, listBarbers } from "@/lib/store";
import { fmtTime, nowMs, todayAR } from "@/lib/time";

export const metadata: Metadata = { title: "Cola · Panel Flow Site" };
export const dynamic = "force-dynamic";

export default async function ColaPage() {
  const staff = await requireStaff();
  if (!staff) redirect("/panel/ingresar");

  const single = staff.role === "barbero";
  let barbersList = listBarbers().filter((b) => b.active);
  if (single) {
    const me = getBarberByUserId(staff.id);
    barbersList = me && me.active ? [me] : [];
  }

  const today = todayAR();
  const appts = appointmentsOnDate(today);
  const data = barbersList.map((b) => ({
    id: b.id,
    name: b.name,
    img: b.img,
    items: appts
      .filter((a) => a.barberId === b.id)
      .map((a) => ({
        id: a.id,
        startMs: Date.parse(a.start),
        endMs: Date.parse(a.end),
        time: fmtTime(new Date(a.start)),
        client: a.customerName,
        service: getService(a.serviceId)?.name ?? "",
        status: a.status,
      })),
  }));

  return (
    <>
      <PanelHeader user={staff} active="cola" />
      <main className="mx-auto max-w-6xl flex-1 px-5 py-8">
        <ColaView barbers={data} single={single} serverNow={nowMs()} />
      </main>
    </>
  );
}
