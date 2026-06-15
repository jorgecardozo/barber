"use client";

import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Label,
  Pie,
  PieChart,
  XAxis,
  YAxis,
} from "recharts";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

type Barbero = { id: string; name: string; img: string; ingreso: number; cortes: number };
type Metodo = { name: string; key: string; value: number };
type Dia = { label: string; ingreso: number };

const ars = (n: number) =>
  new Intl.NumberFormat("es-AR", { style: "currency", currency: "ARS", maximumFractionDigits: 0 }).format(n);

function AvatarTick({ x, y, payload, avatars }: any) {
  const b = avatars[payload.value] as Barbero | undefined;
  const id = `clip-${payload.value}`;
  return (
    <g transform={`translate(${x},${y})`}>
      <defs>
        <clipPath id={id}>
          <circle cx="0" cy="20" r="16" />
        </clipPath>
      </defs>
      {b && <image href={b.img} x={-16} y={4} width={32} height={32} clipPath={`url(#${id})`} preserveAspectRatio="xMidYMid slice" />}
      <text x={0} y={54} textAnchor="middle" fill="var(--foreground)" fontSize={12} fontWeight={600}>{b?.name ?? payload.value}</text>
    </g>
  );
}

export function DashboardCharts({
  porBarbero,
  porMetodo,
  porDia,
}: {
  porBarbero: Barbero[];
  porMetodo: Metodo[];
  porDia: Dia[];
}) {
  const avatars: Record<string, Barbero> = Object.fromEntries(porBarbero.map((b) => [b.id, b]));
  const barData = porBarbero.map((b) => ({ id: b.id, ingreso: b.ingreso }));
  const totalMetodo = porMetodo.reduce((s, m) => s + m.value, 0);

  const barConfig = { ingreso: { label: "Ingresos", color: "var(--chart-1)" } } satisfies ChartConfig;
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
        <CardContent>
          <ChartContainer config={barConfig} className="h-[280px] w-full">
            <BarChart data={barData} margin={{ top: 10, right: 10, left: 0, bottom: 44 }}>
              <defs>
                <linearGradient id="barFill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="var(--chart-1)" stopOpacity={1} />
                  <stop offset="100%" stopColor="var(--chart-1)" stopOpacity={0.5} />
                </linearGradient>
              </defs>
              <CartesianGrid vertical={false} stroke="rgba(255,255,255,0.06)" />
              <XAxis dataKey="id" tickLine={false} axisLine={false} interval={0} height={64} tick={(p) => <AvatarTick {...p} avatars={avatars} />} />
              <YAxis tickFormatter={(v) => ars(v)} tick={{ fill: "var(--muted-foreground)", fontSize: 11 }} axisLine={false} tickLine={false} width={72} />
              <ChartTooltip cursor={{ fill: "rgba(255,255,255,0.04)" }} content={<ChartTooltipContent formatter={(v) => ars(Number(v))} />} />
              <Bar dataKey="ingreso" fill="url(#barFill)" radius={[8, 8, 0, 0]} maxBarSize={72} isAnimationActive={false} />
            </BarChart>
          </ChartContainer>
        </CardContent>
      </Card>

      <div className="grid gap-6 lg:grid-cols-2">
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
