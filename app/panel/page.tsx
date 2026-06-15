import Link from "next/link";
import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { Clock3, DollarSign, Scissors, Users } from "lucide-react";
import { PanelHeader } from "@/components/panel/PanelHeader";
import { DashboardCharts } from "@/components/panel/DashboardCharts";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { requireStaff } from "@/lib/auth";
import {
  allUpcomingAppointments,
  expireHolds,
  getBarberByUserId,
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

  // Barbero pendiente de activación
  if (staff.role === "barbero") {
    const me = getBarberByUserId(staff.id);
    if (!me || !me.active) {
      return (
        <>
          <PanelHeader user={staff} active="dashboard" />
          <main className="mx-auto flex max-w-md flex-1 flex-col items-center justify-center px-5 py-24 text-center">
            <Clock3 className="h-12 w-12 text-amber-300" />
            <h1 className="mt-5 font-display text-3xl">Cuenta pendiente</h1>
            <p className="mt-3 text-muted-foreground">
              Tu registro como barbero está esperando que el admin te active. Cuando te habiliten,
              vas a poder cargar tus horarios y aparecer disponible para los turnos.
            </p>
          </main>
        </>
      );
    }
  }

  const scope = (barberId: string) => staff.role === "admin" || barberId === staff.barberId;
  const payments = listPayments().filter((p) => scope(p.barberId));
  const appts = listAllAppointments().filter((a) => scope(a.barberId));
  const barbers = (staff.role === "admin" ? listBarbers() : listBarbers().filter((b) => b.id === staff.barberId)).filter((b) => b.active);

  const ingresosTotales = payments.reduce((s, p) => s + p.amountCents, 0);
  const mp = payments.filter((p) => p.method === "mercadopago").reduce((s, p) => s + p.amountCents, 0);
  const efectivo = payments.filter((p) => p.method === "efectivo").reduce((s, p) => s + p.amountCents, 0);
  const cortes = appts.filter((a) => a.status === "completada").length;
  const clientes = new Set(appts.filter((a) => a.status === "completada" || a.status === "confirmada").map((a) => a.customerName)).size;
  const proximos = allUpcomingAppointments().filter((a) => scope(a.barberId)).length;

  const porBarbero = barbers.map((b) => ({
    id: b.id,
    name: b.name,
    img: b.img,
    ingreso: payments.filter((p) => p.barberId === b.id).reduce((s, p) => s + p.amountCents, 0) / 100,
    cortes: appts.filter((a) => a.barberId === b.id && a.status === "completada").length,
  }));
  const porMetodo = [
    { name: "MercadoPago", key: "mercadopago", value: mp / 100 },
    { name: "Efectivo", key: "efectivo", value: efectivo / 100 },
  ];
  const dias = Array.from({ length: 7 }, (_, i) => addDays(todayAR(), -(6 - i)));
  const porDia = dias.map((d) => ({
    label: fmtDateShort(d).day,
    ingreso: payments.filter((p) => p.createdAt.slice(0, 10) === d).reduce((s, p) => s + p.amountCents, 0) / 100,
  }));

  return (
    <>
      <PanelHeader user={staff} active="dashboard" />
      <main className="mx-auto w-full max-w-6xl min-w-0 flex-1 overflow-x-clip px-6 py-10 lg:px-8">
        <h1 className="font-display text-3xl">Dashboard</h1>
        <p className="mb-6 text-sm text-muted-foreground capitalize">{fmtDateLong(todayAR())}</p>

        <div className="mb-8 grid grid-cols-2 gap-3 lg:grid-cols-4">
          <Stat icon={DollarSign} big={formatARS(ingresosTotales)} l="Ingresos totales" accent />
          <Stat icon={Users} big={String(clientes)} l="Clientes atendidos" />
          <Stat icon={Scissors} big={String(cortes)} l="Cortes realizados" />
          <Stat icon={Clock3} big={String(proximos)} l="Próximos turnos" />
        </div>

        <DashboardCharts porBarbero={porBarbero} porMetodo={porMetodo} porDia={porDia} />

        <section className="mt-8">
          <h2 className="mb-3 text-xs font-semibold uppercase tracking-[0.2em] text-flow-cyan">Por barbero</h2>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            {porBarbero.map((b) => (
              <Card key={b.id}>
                <CardContent className="flex items-center gap-3 py-4">
                  <Avatar className="h-12 w-12">
                    <AvatarImage src={b.img} alt={b.name} />
                    <AvatarFallback>{b.name[0]}</AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="font-display text-lg">{b.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {b.cortes} cortes · <span className="text-flow-cyan">{formatARS(b.ingreso * 100)}</span>
                    </p>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>

        <Button asChild className="mt-8">
          <Link href="/panel/turnos">Ver todos los turnos →</Link>
        </Button>
      </main>
    </>
  );
}

function Stat({ icon: Icon, big, l, accent }: { icon: React.ElementType; big: string; l: string; accent?: boolean }) {
  return (
    <Card>
      <CardContent className="py-4">
        <div className="mb-1 flex items-center gap-2 text-muted-foreground">
          <Icon className="h-4 w-4" />
          <span className="text-xs uppercase tracking-wider">{l}</span>
        </div>
        <p className={`font-display text-2xl ${accent ? "text-flow-cyan" : "text-foreground"}`}>{big}</p>
      </CardContent>
    </Card>
  );
}
