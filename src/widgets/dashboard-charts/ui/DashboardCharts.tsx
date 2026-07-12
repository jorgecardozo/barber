"use client";

import {
  Area,
  AreaChart,
  CartesianGrid,
  Cell,
  Label,
  Pie,
  PieChart,
  XAxis,
  YAxis,
} from "recharts";
import { motion } from "motion/react";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/shared/ui/chart";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/shared/ui/avatar";

type Barbero = { id: string; name: string; img: string; ingreso: number; cortes: number };
type Metodo = { name: string; key: string; value: number };
type Dia = { label: string; ingreso: number };

const ars = (n: number) =>
  new Intl.NumberFormat("es-AR", { style: "currency", currency: "ARS", maximumFractionDigits: 0 }).format(n);

export function DashboardCharts({
  porBarbero,
  porMetodo,
  porDia,
}: {
  porBarbero: Barbero[];
  porMetodo: Metodo[];
  porDia: Dia[];
}) {
  const totalMetodo = porMetodo.reduce((s, m) => s + m.value, 0);
  const maxIngreso = Math.max(1, ...porBarbero.map((b) => b.ingreso));

  const diaConfig = { ingreso: { label: "Ingresos", color: "var(--chart-1)" } } satisfies ChartConfig;
  const metodoConfig = {
    mercadopago: { label: "MercadoPago", color: "var(--chart-3)" },
    efectivo: { label: "Efectivo", color: "var(--chart-2)" },
  } satisfies ChartConfig;

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-semibold uppercase tracking-[0.15em] text-flow-cyan">
            Ingresos por barbero
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {porBarbero.map((b) => {
            const pct = Math.max(3, Math.round((b.ingreso / maxIngreso) * 100));
            return (
              <div key={b.id} className="flex items-center gap-3">
                <Avatar className="h-9 w-9 shrink-0">
                  <AvatarImage src={b.img} alt={b.name} />
                  <AvatarFallback>{b.name[0]}</AvatarFallback>
                </Avatar>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-2 text-sm">
                    <span className="truncate font-medium">{b.name}</span>
                    <span className="shrink-0 font-medium text-flow-cyan">{ars(b.ingreso)}</span>
                  </div>
                  <div className="mt-1 h-2.5 overflow-hidden rounded-full bg-secondary">
                    <motion.div
                      className="h-full rounded-full"
                      style={{ background: "linear-gradient(90deg, var(--chart-1), color-mix(in srgb, var(--chart-1) 55%, transparent))" }}
                      initial={{ width: 0 }}
                      animate={{ width: `${pct}%` }}
                      transition={{ duration: 0.7, ease: "easeOut" }}
                    />
                  </div>
                </div>
              </div>
            );
          })}
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold uppercase tracking-[0.15em] text-flow-cyan">
              Ingresos por método
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ChartContainer config={metodoConfig} className="mx-auto aspect-square h-[240px]">
              <PieChart>
                <ChartTooltip content={<ChartTooltipContent formatter={(v) => ars(Number(v))} hideLabel />} />
                <Pie data={porMetodo} dataKey="value" nameKey="name" innerRadius={62} outerRadius={92} paddingAngle={3} strokeWidth={2} stroke="var(--card)" isAnimationActive={false}>
                  {porMetodo.map((m) => (
                    <Cell key={m.key} fill={`var(--color-${m.key})`} />
                  ))}
                  <Label content={({ viewBox }: any) => (
                    <text x={viewBox.cx} y={viewBox.cy} textAnchor="middle" dominantBaseline="middle">
                      <tspan x={viewBox.cx} y={viewBox.cy - 6} className="fill-foreground font-display text-xl">{ars(totalMetodo)}</tspan>
                      <tspan x={viewBox.cx} y={viewBox.cy + 14} className="fill-muted-foreground text-xs">Total</tspan>
                    </text>
                  )} />
                </Pie>
              </PieChart>
            </ChartContainer>
            <div className="mt-2 flex justify-center gap-5 text-sm">
              {porMetodo.map((m) => (
                <span key={m.key} className="flex items-center gap-2 text-muted-foreground">
                  <span className="h-2.5 w-2.5 rounded-full" style={{ background: `var(--color-${m.key})` }} />
                  {m.name}: <span className="text-foreground">{ars(m.value)}</span>
                </span>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold uppercase tracking-[0.15em] text-flow-cyan">
              Ingresos últimos días
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ChartContainer config={diaConfig} className="h-[240px] w-full">
              <AreaChart data={porDia} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="areaFill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="var(--chart-1)" stopOpacity={0.5} />
                    <stop offset="100%" stopColor="var(--chart-1)" stopOpacity={0.04} />
                  </linearGradient>
                </defs>
                <CartesianGrid vertical={false} stroke="rgba(255,255,255,0.06)" />
                <XAxis dataKey="label" tick={{ fill: "var(--muted-foreground)", fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis tickFormatter={(v) => ars(v)} tick={{ fill: "var(--muted-foreground)", fontSize: 11 }} axisLine={false} tickLine={false} width={72} />
                <ChartTooltip cursor={{ stroke: "rgba(255,255,255,0.1)" }} content={<ChartTooltipContent formatter={(v) => ars(Number(v))} />} />
                <Area type="monotone" dataKey="ingreso" stroke="var(--chart-1)" strokeWidth={2} fill="url(#areaFill)" isAnimationActive={false} />
              </AreaChart>
            </ChartContainer>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
