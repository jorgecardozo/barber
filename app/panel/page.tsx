import Link from "next/link";
import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { PanelHeader } from "@/components/panel/PanelHeader";
import { DashboardCharts } from "@/components/panel/DashboardCharts";
import { requireStaff } from "@/lib/auth";
import {
  allUpcomingAppointments,
  expireHolds,
  getBarber,
  listAllAppointments,
  listBarbers,
  listPayments,
} from "@/lib/store";
import { formatARS } from "@/lib/money";
import { addDays, fmtDateLong, fmtDateShort, todayAR } from "@/lib/time";

export const metadata: Metadata = { title: "Dashboard · Panel Flow Site" };
export const dynamic = "force-dynamic";

export default async function PanelPage() {
  const staff = await requireStaff();
  if (!staff) redirect("/panel/ingresar");
  expireHolds();

  const scope = (barberId: string) => staff.role === "admin" || barberId === staff.barberId;
  const payments = listPayments().filter((p) => scope(p.barberId));
  const appts = listAllAppointments().filter((a) => scope(a.barberId));
  const barbers = (staff.role === "admin" ? listBarbers() : listBarbers().filter((b) => b.id === staff.barberId));

  // --- Métricas ---
  const ingresosTotales = payments.reduce((s, p) => s + p.amountCents, 0);
  const mp = payments.filter((p) => p.method === "mercadopago").reduce((s, p) => s + p.amountCents, 0);
  const efectivo = payments.filter((p) => p.method === "efectivo").reduce((s, p) => s + p.amountCents, 0);
  const cortes = appts.filter((a) => a.status === "completada").length;
  const clientes = new Set(
    appts.filter((a) => a.status === "completada" || a.status === "confirmada").map((a) => a.customerName),
  ).size;
  const proximos = allUpcomingAppointments().filter((a) => scope(a.barberId)).length;

  // --- Datos para gráficos ---
  const porBarbero = barbers.map((b) => ({
    id: b.id,
    name: b.name,
    img: b.img,
    ingreso: payments.filter((p) => p.barberId === b.id).reduce((s, p) => s + p.amountCents, 0) / 100,
    cortes: appts.filter((a) => a.barberId === b.id && a.status === "completada").length,
  }));

  const porMetodo = [
    { name: "MercadoPago", value: mp / 100 },
    { name: "Efectivo", value: efectivo / 100 },
  ];

  const dias = Array.from({ length: 7 }, (_, i) => addDays(todayAR(), -(6 - i)));
  const porDia = dias.map((d) => ({
    label: fmtDateShort(d).day,
    ingreso: payments.filter((p) => p.createdAt.slice(0, 10) === d).reduce((s, p) => s + p.amountCents, 0) / 100,
  }));

  return (
    <>
      <PanelHeader user={staff} active="dashboard" />
      <main className="mx-auto max-w-6xl flex-1 px-5 py-8">
        <h1 className="font-display text-3xl">Dashboard</h1>
        <p className="mb-6 text-sm text-ash">{fmtDateLong(todayAR())}</p>

        {/* Stat cards */}
        <div className="mb-8 grid grid-cols-2 gap-3 lg:grid-cols-4">
          <Stat big={formatARS(ingresosTotales)} l="Ingresos totales" accent />
          <Stat big={String(clientes)} l="Clientes atendidos" />
          <Stat big={String(cortes)} l="Cortes realizados" />
          <Stat big={String(proximos)} l="Próximos turnos" />
        </div>

        <DashboardCharts porBarbero={porBarbero} porMetodo={porMetodo} porDia={porDia} />

        {/* Per-barbero */}
        <section className="mt-8">
          <h2 className="mb-3 text-xs font-semibold uppercase tracking-[0.2em] text-flow-cyan">Por barbero</h2>
          <div className="grid gap-3 sm:grid-cols-3">
            {porBarbero.map((b) => (
              <div key={b.id} className="flex items-center gap-3 rounded-2xl border border-white/8 bg-ink-2 p-4">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={b.img} alt={b.name} className="h-12 w-12 rounded-full object-cover" />
                <div>
                  <p className="font-display text-lg">{b.name}</p>
                  <p className="text-xs text-ash">
                    {b.cortes} cortes · <span className="text-flow-cyan">{formatARS(b.ingreso * 100)}</span>
                  </p>
                </div>
              </div>
            ))}
          </div>
        </section>

        <Link href="/panel/turnos" className="mt-8 inline-block rounded-full bg-flow-red px-6 py-2.5 text-sm font-semibold text-white">
          Ver todos los turnos →
        </Link>
      </main>
    </>
  );
}

function Stat({ big, l, accent }: { big: string; l: string; accent?: boolean }) {
  return (
    <div className="rounded-2xl border border-white/8 bg-ink-2 p-4">
      <p className={`font-display text-2xl ${accent ? "text-flow-cyan" : "text-bone"}`}>{big}</p>
      <p className="text-xs uppercase tracking-wider text-ash">{l}</p>
    </div>
  );
}
