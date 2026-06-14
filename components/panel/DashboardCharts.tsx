"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

type Barbero = { id: string; name: string; img: string; ingreso: number; cortes: number };
type Metodo = { name: string; value: number };
type Dia = { label: string; ingreso: number };

const RED = "#e23b3b";
const CYAN = "#1de9d6";
const INK2 = "#0e0e13";

const ars = (n: number) =>
  new Intl.NumberFormat("es-AR", { style: "currency", currency: "ARS", maximumFractionDigits: 0 }).format(n);

function TooltipBox({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg border border-white/10 bg-ink px-3 py-2 text-xs">
      {label && <p className="mb-1 text-bone">{label}</p>}
      {payload.map((p: any, i: number) => (
        <p key={i} style={{ color: p.color || p.payload?.fill }}>
          {p.name}: {ars(p.value)}
        </p>
      ))}
    </div>
  );
}

/** Tick del eje X con el avatar circular del barbero. */
function AvatarTick({ x, y, payload, avatars }: any) {
  const b = avatars[payload.value] as Barbero | undefined;
  const id = `clip-${payload.value}`;
  return (
    <g transform={`translate(${x},${y})`}>
      <defs>
        <clipPath id={id}>
          <circle cx="0" cy="18" r="15" />
        </clipPath>
      </defs>
      {b && (
        <image
          href={b.img}
          x={-15}
          y={3}
          width={30}
          height={30}
          clipPath={`url(#${id})`}
          preserveAspectRatio="xMidYMid slice"
        />
      )}
      <text x={0} y={50} textAnchor="middle" fill="#f4f4f5" fontSize={12} fontWeight={600}>
        {b?.name ?? payload.value}
      </text>
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
  const barData = porBarbero.map((b) => ({ id: b.id, ingreso: b.ingreso, name: b.name }));

  return (
    <div className="space-y-6">
      {/* Ingresos por barbero (con avatar) */}
      <Card title="Ingresos por barbero">
        <ResponsiveContainer width="100%" height={260}>
          <BarChart data={barData} margin={{ top: 10, right: 10, left: 0, bottom: 40 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" vertical={false} />
            <XAxis dataKey="id" tickLine={false} axisLine={false} interval={0} height={60} tick={(p) => <AvatarTick {...p} avatars={avatars} />} />
            <YAxis tickFormatter={(v) => ars(v)} tick={{ fill: "#9a9aa3", fontSize: 11 }} axisLine={false} tickLine={false} width={70} />
            <Tooltip content={<TooltipBox />} cursor={{ fill: "rgba(255,255,255,0.03)" }} />
            <Bar dataKey="ingreso" name="Ingresos" radius={[6, 6, 0, 0]} maxBarSize={70} isAnimationActive={false}>
              {barData.map((_, i) => (
                <Cell key={i} fill={i % 2 === 0 ? RED : CYAN} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </Card>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Ingresos por método */}
        <Card title="Ingresos por método de pago">
          <ResponsiveContainer width="100%" height={240}>
            <PieChart>
              <Pie data={porMetodo} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={55} outerRadius={85} paddingAngle={3} stroke={INK2} isAnimationActive={false}>
                {porMetodo.map((m, i) => (
                  <Cell key={i} fill={m.name === "MercadoPago" ? "#009ee3" : CYAN} />
                ))}
              </Pie>
              <Tooltip content={<TooltipBox />} />
            </PieChart>
          </ResponsiveContainer>
          <div className="mt-2 flex justify-center gap-5 text-sm">
            {porMetodo.map((m) => (
              <span key={m.name} className="flex items-center gap-2 text-ash">
                <span className="h-2.5 w-2.5 rounded-full" style={{ background: m.name === "MercadoPago" ? "#009ee3" : CYAN }} />
                {m.name}: <span className="text-bone">{ars(m.value)}</span>
              </span>
            ))}
          </div>
        </Card>

        {/* Ingresos por día */}
        <Card title="Ingresos últimos días">
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={porDia} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" vertical={false} />
              <XAxis dataKey="label" tick={{ fill: "#9a9aa3", fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis tickFormatter={(v) => ars(v)} tick={{ fill: "#9a9aa3", fontSize: 11 }} axisLine={false} tickLine={false} width={70} />
              <Tooltip content={<TooltipBox />} cursor={{ fill: "rgba(255,255,255,0.03)" }} />
              <Bar dataKey="ingreso" name="Ingresos" fill={RED} radius={[6, 6, 0, 0]} maxBarSize={40} isAnimationActive={false} />
            </BarChart>
          </ResponsiveContainer>
        </Card>
      </div>
    </div>
  );
}

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-white/8 bg-ink-2 p-5">
      <h3 className="mb-4 text-xs font-semibold uppercase tracking-[0.2em] text-flow-cyan">{title}</h3>
      {children}
    </div>
  );
}
