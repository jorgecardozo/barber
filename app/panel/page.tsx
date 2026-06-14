import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { StatusBadge } from "@/components/StatusBadge";
import { requireStaff } from "@/lib/auth";
import { logoutAction, panelSetStatusAction } from "@/lib/actions";
import {
  allUpcomingAppointments,
  appointmentsOnDate,
  expireHolds,
  getBarber,
  getService,
} from "@/lib/store";
import type { Appointment } from "@/lib/types";
import { fmtDateLong, fmtTime, todayAR } from "@/lib/time";

export const metadata: Metadata = { title: "Panel · Flow Site" };
export const dynamic = "force-dynamic";

export default async function PanelPage() {
  const staff = await requireStaff();
  if (!staff) redirect("/panel/ingresar");

  expireHolds();

  const mine = (a: Appointment) =>
    staff.role === "admin" || a.barberId === staff.barberId;

  const hoy = appointmentsOnDate(todayAR()).filter(mine);
  const hoyIds = new Set(hoy.map((a) => a.id));
  const proximos = allUpcomingAppointments()
    .filter(mine)
    .filter((a) => !hoyIds.has(a.id))
    .slice(0, 30);

  return (
    <>
      <header className="sticky top-0 z-40 border-b border-white/5 bg-ink/85 backdrop-blur-md">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-5 py-3">
          <span className="font-display text-lg tracking-wide">
            FLOW <span className="chrome-text italic">PANEL</span>
          </span>
          <div className="flex items-center gap-3 text-sm">
            <span className="text-ash">
              {staff.name} · <span className="text-flow-cyan">{staff.role}</span>
            </span>
            <form action={logoutAction}>
              <button className="rounded-full border border-white/10 px-3 py-1.5 text-ash hover:text-bone">Salir</button>
            </form>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-5xl flex-1 px-5 py-10">
        <h1 className="font-display text-3xl">Agenda</h1>
        <p className="mt-1 text-sm text-ash">{fmtDateLong(todayAR())}</p>

        {/* Stats */}
        <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
          <Stat n={hoy.length} l="Turnos hoy" />
          <Stat n={proximos.length} l="Próximos" />
          <Stat n={hoy.filter((a) => a.status === "completada").length} l="Completados hoy" />
          <Stat n={hoy.filter((a) => a.status === "no_show").length} l="Ausentes hoy" />
        </div>

        <Section title="Hoy">
          {hoy.length === 0 ? (
            <Empty>No hay turnos para hoy.</Empty>
          ) : (
            hoy.map((a) => <AgendaRow key={a.id} a={a} showBarber={staff.role === "admin"} />)
          )}
        </Section>

        <Section title="Próximos turnos">
          {proximos.length === 0 ? (
            <Empty>No hay próximos turnos.</Empty>
          ) : (
            proximos.map((a) => <AgendaRow key={a.id} a={a} showBarber={staff.role === "admin"} showDate />)
          )}
        </Section>
      </main>
    </>
  );
}

function Stat({ n, l }: { n: number; l: string }) {
  return (
    <div className="rounded-2xl border border-white/8 bg-ink-2 p-4">
      <p className="font-display text-3xl">{n}</p>
      <p className="text-xs uppercase tracking-wider text-ash">{l}</p>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mt-10">
      <h2 className="mb-3 text-xs font-semibold uppercase tracking-[0.2em] text-flow-cyan">{title}</h2>
      <div className="space-y-2">{children}</div>
    </section>
  );
}

function Empty({ children }: { children: React.ReactNode }) {
  return <p className="rounded-xl border border-white/8 bg-ink-2 px-4 py-6 text-center text-sm text-ash">{children}</p>;
}

function AgendaRow({ a, showBarber, showDate }: { a: Appointment; showBarber: boolean; showDate?: boolean }) {
  const service = getService(a.serviceId);
  const barber = getBarber(a.barberId);
  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-2 rounded-xl border border-white/8 bg-ink-2 px-4 py-3">
      <div className="flex items-center gap-3">
        <span className="font-display text-xl text-flow-cyan">{fmtTime(new Date(a.start))}</span>
        <div>
          <p className="font-medium text-bone">
            {a.customerName} <span className="text-ash">· {service?.name}</span>
          </p>
          <p className="text-xs text-ash">
            {showBarber && <>{barber?.name} · </>}
            {showDate && <>{fmtDateLong(a.start.slice(0, 10))} · </>}
            {a.customerPhone}
          </p>
        </div>
      </div>

      <div className="ml-auto flex items-center gap-2">
        <StatusBadge status={a.status} />
        {a.status === "confirmada" && (
          <div className="flex gap-1">
            <StatusBtn id={a.id} status="completada" label="✓ Hizo" />
            <StatusBtn id={a.id} status="no_show" label="Ausente" />
            <StatusBtn id={a.id} status="cancelada" label="Cancelar" />
          </div>
        )}
      </div>
    </div>
  );
}

function StatusBtn({ id, status, label }: { id: string; status: string; label: string }) {
  return (
    <form action={panelSetStatusAction}>
      <input type="hidden" name="id" value={id} />
      <input type="hidden" name="status" value={status} />
      <button className="rounded-full border border-white/10 px-2.5 py-1 text-[11px] text-ash transition-colors hover:border-white/30 hover:text-bone">
        {label}
      </button>
    </form>
  );
}
