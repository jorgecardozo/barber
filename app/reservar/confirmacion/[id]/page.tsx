import Link from "next/link";
import type { Metadata } from "next";
import { AppHeader } from "@/components/AppHeader";
import { getSessionUser } from "@/lib/auth";
import { getAppointment, getBarber, getService } from "@/lib/store";
import { DECISIONS } from "@/lib/decisions";
import { formatARS } from "@/lib/money";
import { fmtDateLong, fmtTime } from "@/lib/time";

export const metadata: Metadata = { title: "Turno confirmado · Flow Site" };
export const dynamic = "force-dynamic";

export default async function ConfirmacionPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await getSessionUser();
  const appt = getAppointment(id);
  const service = appt ? getService(appt.serviceId) : undefined;
  const barber = appt ? getBarber(appt.barberId) : undefined;

  const ok = appt && appt.status === "confirmada" && service && barber;

  // Mensaje de WhatsApp pre-cargado (aviso/confirmación al cliente)
  const waText = ok
    ? encodeURIComponent(
        `¡Hola! Confirmé mi turno en Flow Site:\n` +
          `• ${service!.name} con ${barber!.name}\n` +
          `• ${fmtDateLong(appt!.start.slice(0, 10))} a las ${fmtTime(new Date(appt!.start))}\n` +
          `• Seña pagada: ${formatARS(appt!.depositCents)}`,
      )
    : "";

  return (
    <>
      <AppHeader user={user ?? null} />
      <main className="flex-1">
        <section className="mx-auto max-w-lg px-5 py-16 text-center">
          {!ok ? (
            <div className="rounded-2xl border border-white/8 bg-ink-2 p-8">
              <p className="text-ash">No encontramos ese turno confirmado.</p>
              <Link href="/reservar" className="mt-5 inline-block rounded-full bg-flow-red px-6 py-2.5 font-semibold text-white">
                Reservar
              </Link>
            </div>
          ) : (
            <>
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-flow-cyan/15 text-3xl text-flow-cyan">
                ✓
              </div>
              <h1 className="mt-5 font-display text-4xl">
                ¡Turno <span className="chrome-text italic">confirmado</span>!
              </h1>
              <p className="mt-2 text-ash">Te esperamos en {DECISIONS.business.address}.</p>

              <div className="mt-8 rounded-2xl border border-white/8 bg-ink-2 p-6 text-left">
                <dl className="space-y-2.5 text-sm">
                  <Row k="Servicio" v={`${service!.name} · ${service!.durationMin} min`} />
                  <Row k="Barbero" v={barber!.name} />
                  <Row k="Día" v={fmtDateLong(appt!.start.slice(0, 10))} />
                  <Row k="Hora" v={fmtTime(new Date(appt!.start))} />
                  <Row k="Seña pagada" v={formatARS(appt!.depositCents)} />
                  <Row k="A pagar en el local" v={formatARS(appt!.priceCents - appt!.depositCents)} />
                </dl>
              </div>

              <div className="mt-6 flex flex-col gap-3">
                <a
                  href={`https://wa.me/${DECISIONS.business.whatsapp}?text=${waText}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-center gap-2 rounded-full bg-[#25D366] px-6 py-3 font-semibold text-[#062b16]"
                >
                  Guardar turno en WhatsApp
                </a>
                <Link href="/mis-turnos" className="rounded-full border border-white/15 px-6 py-3 font-semibold text-bone transition-colors hover:bg-white/5">
                  Ver mis turnos
                </Link>
              </div>

              <p className="mt-6 text-xs text-ash">
                📲 El barbero ya recibió el aviso de tu turno. (En esta demo el aviso a Telegram está simulado.)
              </p>
            </>
          )}
        </section>
      </main>
    </>
  );
}

function Row({ k, v }: { k: string; v: string }) {
  return (
    <div className="flex items-center justify-between">
      <dt className="text-ash">{k}</dt>
      <dd className="font-medium text-bone">{v}</dd>
    </div>
  );
}
