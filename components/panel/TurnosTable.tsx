"use client";

import { useMemo, useState } from "react";
import { StatusBadge } from "@/components/StatusBadge";
import { formatARS } from "@/lib/money";
import {
  panelSetStatusAction,
  registrarSaldoAction,
  registrarSenaEfectivoAction,
} from "@/lib/actions";
import type { AppointmentStatus } from "@/lib/types";

export type TurnoRow = {
  id: string;
  startMs: number;
  dateValue: string;
  dateLabel: string;
  time: string;
  customerName: string;
  customerPhone: string;
  barberId: string;
  barberName: string;
  serviceName: string;
  priceCents: number;
  depositCents: number;
  balanceCents: number;
  depositMethod: string | null;
  depositStatus: "pendiente" | "pagado";
  balanceMethod: string | null;
  balanceStatus: "pendiente" | "pagado";
  status: AppointmentStatus;
};

const METODO: Record<string, string> = { mercadopago: "MercadoPago", efectivo: "Efectivo" };
const ESTADOS: AppointmentStatus[] = ["confirmada", "completada", "no_show", "cancelada"];

export function TurnosTable({
  rows,
  barbers,
}: {
  rows: TurnoRow[];
  barbers: { id: string; name: string }[];
}) {
  const [q, setQ] = useState("");
  const [barberId, setBarberId] = useState("todos");
  const [status, setStatus] = useState("todos");
  const [method, setMethod] = useState("todos");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [sortAsc, setSortAsc] = useState(false);

  const filtered = useMemo(() => {
    const term = q.trim().toLowerCase();
    const list = rows.filter((r) => {
      if (term && !r.customerName.toLowerCase().includes(term) && !r.customerPhone.includes(term)) return false;
      if (barberId !== "todos" && r.barberId !== barberId) return false;
      if (status !== "todos" && r.status !== status) return false;
      if (method !== "todos" && r.depositMethod !== method && r.balanceMethod !== method) return false;
      if (from && r.dateValue < from) return false;
      if (to && r.dateValue > to) return false;
      return true;
    });
    return list.sort((a, b) => (sortAsc ? a.startMs - b.startMs : b.startMs - a.startMs));
  }, [rows, q, barberId, status, method, from, to, sortAsc]);

  return (
    <div>
      {/* Filtros */}
      <div className="mb-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-6">
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Buscar cliente / teléfono"
          className="rounded-lg border border-white/10 bg-ink-2 px-3 py-2 text-sm outline-none placeholder:text-ash/50 focus:border-flow-cyan/50 lg:col-span-2"
        />
        <Select value={barberId} onChange={setBarberId} label="Barbero">
          <option value="todos">Todos los barberos</option>
          {barbers.map((b) => (
            <option key={b.id} value={b.id}>{b.name}</option>
          ))}
        </Select>
        <Select value={status} onChange={setStatus} label="Estado">
          <option value="todos">Todos los estados</option>
          {ESTADOS.map((s) => (
            <option key={s} value={s}>{s}</option>
          ))}
        </Select>
        <Select value={method} onChange={setMethod} label="Método">
          <option value="todos">Todos los métodos</option>
          <option value="mercadopago">MercadoPago</option>
          <option value="efectivo">Efectivo</option>
        </Select>
        <div className="flex items-center gap-1">
          <input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className="w-full rounded-lg border border-white/10 bg-ink-2 px-2 py-2 text-xs outline-none focus:border-flow-cyan/50" />
          <input type="date" value={to} onChange={(e) => setTo(e.target.value)} className="w-full rounded-lg border border-white/10 bg-ink-2 px-2 py-2 text-xs outline-none focus:border-flow-cyan/50" />
        </div>
      </div>

      <p className="mb-2 text-xs text-ash">{filtered.length} turno(s)</p>

      {/* Tabla */}
      <div className="overflow-x-auto rounded-2xl border border-white/8">
        <table className="w-full min-w-[920px] text-left text-sm">
          <thead className="border-b border-white/8 bg-ink-2 text-xs uppercase tracking-wider text-ash">
            <tr>
              <Th onClick={() => setSortAsc((v) => !v)}>Fecha {sortAsc ? "↑" : "↓"}</Th>
              <Th>Cliente</Th>
              <Th>Barbero</Th>
              <Th>Servicio</Th>
              <Th>Seña</Th>
              <Th>Saldo</Th>
              <Th>Estado</Th>
              <Th>Acciones</Th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((r) => (
              <tr key={r.id} className="border-b border-white/5 last:border-0 hover:bg-white/[0.02]">
                <td className="whitespace-nowrap px-3 py-3">
                  <span className="text-bone">{r.dateLabel}</span>
                  <span className="block text-xs text-ash">{r.time} hs</span>
                </td>
                <td className="px-3 py-3">
                  <span className="text-bone">{r.customerName}</span>
                  <span className="block text-xs text-ash">{r.customerPhone}</span>
                </td>
                <td className="px-3 py-3 text-ash">{r.barberName}</td>
                <td className="px-3 py-3 text-ash">{r.serviceName}</td>
                <td className="px-3 py-3">
                  <span className="text-bone">{formatARS(r.depositCents)}</span>
                  <PayHint status={r.depositStatus} method={r.depositMethod} />
                </td>
                <td className="px-3 py-3">
                  <span className="text-bone">{formatARS(r.balanceCents)}</span>
                  <PayHint status={r.balanceStatus} method={r.balanceMethod} />
                </td>
                <td className="px-3 py-3"><StatusBadge status={r.status} /></td>
                <td className="px-3 py-3">
                  <div className="flex flex-wrap gap-1">
                    {r.depositStatus === "pendiente" && r.status !== "cancelada" && (
                      <ActBtn action={registrarSenaEfectivoAction} id={r.id} label="Cobrar seña" />
                    )}
                    {r.balanceStatus === "pendiente" && r.status !== "cancelada" && (
                      <>
                        <ActBtn action={registrarSaldoAction} id={r.id} label="Saldo $" extra={{ method: "efectivo" }} />
                        <ActBtn action={registrarSaldoAction} id={r.id} label="Saldo MP" extra={{ method: "mercadopago" }} />
                      </>
                    )}
                    {r.status === "confirmada" && (
                      <>
                        <ActBtn action={panelSetStatusAction} id={r.id} label="✓ Hizo" extra={{ status: "completada" }} />
                        <ActBtn action={panelSetStatusAction} id={r.id} label="Falta" extra={{ status: "no_show" }} />
                        <ActBtn action={panelSetStatusAction} id={r.id} label="Cancelar" extra={{ status: "cancelada" }} />
                      </>
                    )}
                  </div>
                </td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr>
                <td colSpan={8} className="px-3 py-10 text-center text-ash">No hay turnos con esos filtros.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function Select({ value, onChange, label, children }: { value: string; onChange: (v: string) => void; label: string; children: React.ReactNode }) {
  return (
    <select aria-label={label} value={value} onChange={(e) => onChange(e.target.value)} className="rounded-lg border border-white/10 bg-ink-2 px-3 py-2 text-sm text-bone outline-none focus:border-flow-cyan/50">
      {children}
    </select>
  );
}

function Th({ children, onClick }: { children: React.ReactNode; onClick?: () => void }) {
  return (
    <th onClick={onClick} className={`px-3 py-3 font-semibold ${onClick ? "cursor-pointer select-none hover:text-bone" : ""}`}>
      {children}
    </th>
  );
}

function PayHint({ status, method }: { status: "pendiente" | "pagado"; method: string | null }) {
  return (
    <span className={`block text-[11px] ${status === "pagado" ? "text-flow-cyan" : "text-amber-300/80"}`}>
      {status === "pagado" ? `✓ ${method ? METODO[method] : ""}` : `pendiente${method ? " · " + METODO[method] : ""}`}
    </span>
  );
}

function ActBtn({
  action,
  id,
  label,
  extra,
}: {
  action: (fd: FormData) => Promise<void>;
  id: string;
  label: string;
  extra?: Record<string, string>;
}) {
  return (
    <form action={action}>
      <input type="hidden" name="id" value={id} />
      {extra &&
        Object.entries(extra).map(([k, v]) => <input key={k} type="hidden" name={k} value={v} />)}
      <button className="whitespace-nowrap rounded-full border border-white/10 px-2.5 py-1 text-[11px] text-ash transition-colors hover:border-white/30 hover:text-bone">
        {label}
      </button>
    </form>
  );
}
