import Link from "next/link";
import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { AppHeader } from "@/components/AppHeader";
import { getSessionUser } from "@/lib/auth";
import { getAppointment, getBarber, getService } from "@/lib/store";
import { pagarSeniaAction } from "@/lib/actions";
import { formatARS } from "@/lib/money";
import { fmtDateLong, fmtTime } from "@/lib/time";

export const metadata: Metadata = { title: "Pagar seña · Flow Site" };
export const dynamic = "force-dynamic";

export default async function PagoPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ error?: string }>;
}) {
  const { id } = await params;
  const { error } = await searchParams;
  const user = await getSessionUser();
  const appt = getAppointment(id);

  if (appt && appt.status === "confirmada") redirect(`/reservar/confirmacion/${id}`);

  const service = appt ? getService(appt.serviceId) : undefined;
  const barber = appt ? getBarber(appt.barberId) : undefined;
  const expired = appt && appt.status !== "hold";

  return (
    <>
      <AppHeader user={user ?? null} />
      <main className="flex-1">
        <section className="mx-auto max-w-lg px-5 py-14">
          {!appt || !service || !barber ? (
            <Empty msg="No encontramos esa reserva." />
          ) : expired ? (
            <Empty msg="La reserva expiró (la seña no se pagó a tiempo). Volvé a elegir tu turno." />
          ) : (
            <>
              <div className="mb-6 text-center">
                <p className="text-xs font-medium uppercase tracking-[0.3em] text-flow-cyan">Último paso</p>
                <h1 className="mt-2 font-display text-3xl">Pagá la seña para confirmar</h1>
                <p className="mt-2 text-sm text-ash">
                  Reservamos tu horario por unos minutos. Pagá la seña para que quede confirmado.
                </p>
              </div>

              {error && (
                <p className="mb-5 rounded-xl border border-flow-red/40 bg-flow-red/10 px-4 py-3 text-sm text-bone">
                  {error}
                </p>
              )}

              <div className="rounded-2xl border border-white/8 bg-ink-2 p-6">
                <dl className="space-y-2.5 text-sm">
                  <Row k="Servicio" v={service.name} />
                  <Row k="Barbero" v={barber.name} />
                  <Row k="Día" v={fmtDateLong(appt.start.slice(0, 10))} />
                  <Row k="Hora" v={fmtTime(new Date(appt.start))} />
                </dl>

                <div className="my-5 h-px bg-white/10" />

                <div className="flex items-end justify-between">
                  <span className="text-sm text-ash">Seña a pagar ahora</span>
                  <span className="font-display text-3xl text-flow-cyan">{formatARS(appt.depositCents)}</span>
                </div>
                <p className="mt-1 text-right text-xs text-ash">
                  Resto en el local: {formatARS(appt.priceCents - appt.depositCents)}
                </p>

                {/* Checkout MercadoPago SIMULADO */}
                <form action={pagarSeniaAction} className="mt-6">
                  <input type="hidden" name="id" value={appt.id} />
                  <button className="flex w-full items-center justify-center gap-2 rounded-full bg-[#009ee3] px-6 py-3.5 font-semibold text-white transition-transform hover:scale-[1.02]">
                    Pagar con MercadoPago
                  </button>
                </form>

                <p className="mt-3 text-center text-[11px] text-ash/70">
                  ⚠️ Pago SIMULADO (demo). Al tocar, se confirma el turno sin cobro real.
                </p>
              </div>

              <Link href="/reservar" className="mt-6 block text-center text-sm text-ash hover:text-bone">
                ← Cancelar y volver
              </Link>
            </>
          )}
        </section>
      </main>
    </>
  );
}

function Empty({ msg }: { msg: string }) {
  return (
    <div className="rounded-2xl border border-white/8 bg-ink-2 p-8 text-center">
      <p className="text-ash">{msg}</p>
      <Link
        href="/reservar"
        className="mt-5 inline-block rounded-full bg-flow-red px-6 py-2.5 font-semibold text-white"
      >
        Volver a reservar
      </Link>
    </div>
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
