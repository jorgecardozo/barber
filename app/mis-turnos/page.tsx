import Link from "next/link";
import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { AppHeader } from "@/components/AppHeader";
import { StatusBadge } from "@/components/StatusBadge";
import { getSessionUser } from "@/lib/auth";
import { appointmentsForCustomer, listBarbers, listServices } from "@/lib/store";
import { cancelarTurnoAction } from "@/lib/actions";
import { DECISIONS } from "@/lib/decisions";
import { formatARS } from "@/lib/money";
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

  return (
    <>
      <AppHeader user={user} />
      <main className="flex-1">
        <section className="mx-auto max-w-2xl px-5 py-12">
          <div className="mb-8 flex items-end justify-between">
            <div>
              <h1 className="font-display text-3xl">
                Mis <span className="chrome-text italic">turnos</span>
              </h1>
              <p className="mt-1 text-sm text-ash">Hola, {user.name.split(" ")[0]} 👋</p>
            </div>
            <Link href="/reservar" className="rounded-full bg-flow-red px-5 py-2.5 text-sm font-semibold text-white">
              + Nuevo turno
            </Link>
          </div>

          {sp.error === "tarde" && (
            <p className="mb-5 rounded-xl border border-flow-red/40 bg-flow-red/10 px-4 py-3 text-sm text-bone">
              No se puede cancelar con menos de {DECISIONS.cancelWindowHours} hs de anticipación.
            </p>
          )}

          {turnos.length === 0 ? (
            <div className="rounded-2xl border border-white/8 bg-ink-2 p-10 text-center">
              <p className="text-ash">Todavía no tenés turnos.</p>
              <Link href="/reservar" className="mt-5 inline-block rounded-full bg-flow-red px-6 py-2.5 font-semibold text-white">
                Reservar mi primer turno
              </Link>
            </div>
          ) : (
            <ul className="space-y-3">
              {turnos.map((t) => {
                const service = svcById.get(t.serviceId);
                const barber = barbById.get(t.barberId);
                const horas = (Date.parse(t.start) - now) / 3_600_000;
                const cancelable =
                  (t.status === "confirmada" || t.status === "hold") && horas >= DECISIONS.cancelWindowHours;
                return (
                  <li key={t.id} className="rounded-2xl border border-white/8 bg-ink-2 p-5">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <h3 className="font-display text-xl">{service?.name}</h3>
                        <p className="text-sm text-ash">con {barber?.name}</p>
                      </div>
                      <StatusBadge status={t.status} />
                    </div>
                    <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-ash">
                      <span className="text-bone">{fmtDateLong(t.start.slice(0, 10))}</span>
                      <span className="text-bone">{fmtTime(new Date(t.start))} hs</span>
                      <span>seña {formatARS(t.depositCents)}</span>
                    </div>
                    {t.status === "hold" && (
                      <Link
                        href={`/reservar/pago/${t.id}`}
                        className="mt-3 inline-block rounded-full bg-flow-red px-4 py-1.5 text-xs font-semibold text-white"
                      >
                        Completar pago
                      </Link>
                    )}
                    {cancelable && (
                      <form action={cancelarTurnoAction} className="mt-3">
                        <input type="hidden" name="id" value={t.id} />
                        <button className="text-xs text-ash underline-offset-2 transition-colors hover:text-flow-red hover:underline">
                          Cancelar turno
                        </button>
                      </form>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </section>
      </main>
    </>
  );
}
