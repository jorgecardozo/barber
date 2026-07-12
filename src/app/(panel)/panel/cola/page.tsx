import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { ColaView } from "@/widgets/cola/ui/ColaView";
import { requireStaff } from "@/shared/api/auth";
import { appointmentsOnDate, getBarberByUserId, getUser, listBarbers, listServices } from "@/shared/api/store";
import { fmtTime, nowMs, todayAR } from "@/shared/lib/time";

export const metadata: Metadata = { title: "Cola · Panel Flow Site" };
export const dynamic = "force-dynamic";

export default async function ColaPage() {
  const staff = await requireStaff();
  if (!staff) redirect("/panel/ingresar");

  const single = staff.role === "barbero";
  let barbersList = (await listBarbers()).filter((b) => b.active);
  if (single) {
    const me = await getBarberByUserId(staff.id);
    barbersList = me && me.active ? [me] : [];
  }

  const today = todayAR();
  const [appts, services] = await Promise.all([appointmentsOnDate(today), listServices()]);
  const svcName = new Map(services.map((s) => [s.id, s.name]));

  // Avatares (de barberos y clientes) en una sola pasada.
  const ids = [
    ...new Set([
      ...barbersList.flatMap((b) => (b.userId ? [b.userId] : [])),
      ...appts.flatMap((a) => (a.customerId ? [a.customerId] : [])),
    ]),
  ];
  const avatarById = new Map<string, string>();
  await Promise.all(
    ids.map(async (id) => {
      const u = await getUser(id);
      if (u?.avatarUrl) avatarById.set(id, u.avatarUrl);
    }),
  );

  const data = barbersList.map((b) => ({
    id: b.id,
    name: b.name,
    img: b.img,
    barberAvatar:
      (b.userId && avatarById.get(b.userId)) ||
      `https://api.dicebear.com/9.x/avataaars/svg?seed=${encodeURIComponent(b.name)}&radius=50`,
    items: appts
      .filter((a) => a.barberId === b.id)
      .map((a) => ({
        id: a.id,
        startMs: Date.parse(a.start),
        endMs: Date.parse(a.end),
        time: fmtTime(new Date(a.start)),
        client: a.customerName,
        phone: a.customerPhone,
        service: svcName.get(a.serviceId) ?? "",
        status: a.status,
        balanceCents: a.priceCents - a.depositCents,
        balancePaid: a.balanceStatus === "pagado",
        avatar: (a.customerId && avatarById.get(a.customerId)) || undefined,
      })),
  }));

  return (
    <>
      <main className="mx-auto w-full max-w-6xl min-w-0 flex-1 overflow-x-clip px-6 py-10 lg:px-8">
        <ColaView barbers={data} single={single} serverNow={nowMs()} />
      </main>
    </>
  );
}
