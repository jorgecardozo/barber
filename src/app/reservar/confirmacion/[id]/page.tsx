import Link from "next/link";
import type { Metadata } from "next";
import { ClientShell } from "@/components/ClientShell";
import { getSessionUser } from "@/lib/auth";
import { getAppointment, getBarber, getService } from "@/lib/store";
import { DECISIONS } from "@/lib/decisions";
import { formatARS } from "@/lib/money";
import { fmtDateLong, fmtTime } from "@/lib/time";

export const metadata: Metadata = { title: "Turno confirmado · Flow Site" };
export const dynamic = "force-dynamic";

const METODO: Record<string, string> = { mercadopago: "MercadoPago", efectivo: "Efectivo" };

function gcalDate(iso: string): string {
  return iso.replace(/[-:]/g, "").replace(/\.\d{3}/, "");
}

export default async function ConfirmacionPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await getSessionUser();
  const appt = await getAppointment(id);
  const service = appt ? await getService(appt.serviceId) : undefined;
  const barber = appt ? await getBarber(appt.barberId) : undefined;
  const ok = appt && appt.status === "confirmada" && service && barber;

  const gcal = ok
    ? `https://calendar.google.com/calendar/render?action=TEMPLATE` +
      `&text=${encodeURIComponent(`${service!.name} con ${barber!.name} — Flow Site`)}` +
      `&dates=${gcalDate(appt!.start)}/${gcalDate(appt!.end)}` +
      `&details=${encodeURIComponent(`Turno en Flow Site. Seña: ${formatARS(appt!.depositCents)}.`)}` +
      `&location=${encodeURIComponent(DECISIONS.business.address)}`
    : "#";

  return (
    <ClientShell user={user ?? null}>
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
                  {appt!.depositStatus === "pagado" ? (
                    <Row k={`Seña pagada (${METODO[appt!.depositMethod ?? "mercadopago"]})`} v={formatARS(appt!.depositCents)} />
                  ) : (
                    <Row k="Seña (efectivo, al llegar)" v={formatARS(appt!.depositCents)} accent />
                  )}
                  <Row k="A pagar en el local" v={formatARS(appt!.priceCents - appt!.depositCents)} />
                </dl>
              </div>

              <div className="mt-6 flex flex-col gap-3">
                <a
                  href={gcal}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-center gap-2 rounded-full bg-flow-red px-6 py-3 font-semibold text-white shadow-[0_10px_30px_-10px] shadow-flow-red/60 ring-1 ring-white/10"
                >
                  📅 Agregar al calendario
                </a>
                <Link href="/mis-turnos" className="rounded-full border border-white/15 px-6 py-3 font-semibold text-bone transition-colors hover:bg-white/5">
                  Ver mis turnos
                </Link>
              </div>

              <p className="mt-6 text-xs text-ash">
                Tu turno ya quedó registrado. El barbero lo ve en su panel.
                {appt!.depositStatus !== "pagado" && " Acordate de pagar la seña al llegar."}
              </p>
            </>
          )}
        </section>
    </ClientShell>
  );
}

function Row({ k, v, accent }: { k: string; v: string; accent?: boolean }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <dt className="text-ash">{k}</dt>
      <dd className={`text-right font-medium ${accent ? "text-flow-cyan" : "text-bone"}`}>{v}</dd>
    </div>
  );
}
