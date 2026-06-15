import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { AppHeader } from "@/components/AppHeader";
import { BookingWizard } from "@/components/reservar/BookingWizard";
import { getSessionUser } from "@/lib/auth";
import { listServices, listBarbers } from "@/lib/store";
import { depositForPrice } from "@/lib/decisions";
import { horizonDates } from "@/lib/availability";
import { fmtDateLong, fmtDateShort } from "@/lib/time";

export const metadata: Metadata = { title: "Reservar turno · Flow Site" };
export const dynamic = "force-dynamic";

export default async function ReservarPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const sp = await searchParams;
  const user = await getSessionUser();

  // El cliente tiene que estar logueado ANTES de reservar.
  if (!user) redirect("/ingresar?next=/reservar");

  const services = (await listServices()).map((s) => ({
    id: s.id,
    name: s.name,
    description: s.description,
    priceCents: s.priceCents,
    durationMin: s.durationMin,
    depositCents: depositForPrice(s.priceCents),
    featured: s.featured ?? false,
  }));

  // mapa serviceId -> barberos que lo ofrecen
  const barbers = (await listBarbers()).map((b) => ({
    id: b.id,
    name: b.name,
    specialty: b.specialty,
    img: b.img,
    serviceIds: b.serviceIds,
  }));

  const dates = horizonDates().map((d) => {
    const short = fmtDateShort(d);
    return { value: d, weekday: short.weekday, day: short.day, long: fmtDateLong(d) };
  });

  return (
    <>
      <AppHeader user={user ? { ...user } : null} />
      <main className="flex-1">
        <BookingWizard
          services={services}
          barbers={barbers}
          dates={dates}
          userName={user?.name ?? null}
          slotTaken={sp.error === "tomado"}
        />
      </main>
    </>
  );
}
