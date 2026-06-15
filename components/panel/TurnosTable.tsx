"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { format } from "date-fns";
import { MoreHorizontal, Loader2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { DatePicker } from "@/components/ui/date-picker";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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
const ESTADOS: { v: AppointmentStatus; l: string }[] = [
  { v: "confirmada", l: "Confirmado" },
  { v: "completada", l: "Completado" },
  { v: "no_show", l: "Ausente" },
  { v: "cancelada", l: "Cancelado" },
];

const BADGE: Record<AppointmentStatus, string> = {
  hold: "bg-amber-400/15 text-amber-300 border-transparent",
  confirmada: "bg-flow-cyan/15 text-flow-cyan border-transparent",
  completada: "bg-white/10 text-muted-foreground border-transparent",
  no_show: "bg-flow-red/15 text-flow-red border-transparent",
  cancelada: "bg-white/5 text-muted-foreground border-transparent line-through",
  expirada: "bg-white/5 text-muted-foreground border-transparent",
};

export function TurnosTable({
  rows,
  barbers,
  today,
}: {
  rows: TurnoRow[];
  barbers: { id: string; name: string }[];
  today: string;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [q, setQ] = useState("");
  const [barberId, setBarberId] = useState("todos");
  const [status, setStatus] = useState("todos");
  const [method, setMethod] = useState("todos");
  const [date, setDate] = useState<Date | undefined>(new Date(today + "T12:00:00"));

  const dateKey = date ? format(date, "yyyy-MM-dd") : null;

  const filtered = useMemo(() => {
    const term = q.trim().toLowerCase();
    return rows
      .filter((r) => {
        if (term && !r.customerName.toLowerCase().includes(term) && !r.customerPhone.includes(term)) return false;
        if (barberId !== "todos" && r.barberId !== barberId) return false;
        if (status !== "todos" && r.status !== status) return false;
        if (method !== "todos" && r.depositMethod !== method && r.balanceMethod !== method) return false;
        if (dateKey && r.dateValue !== dateKey) return false;
        return true;
      })
      .sort((a, b) => b.startMs - a.startMs);
  }, [rows, q, barberId, status, method, dateKey]);

  function run(action: (fd: FormData) => Promise<void>, id: string, extra?: Record<string, string>) {
    startTransition(async () => {
      const fd = new FormData();
      fd.set("id", id);
      if (extra) for (const [k, v] of Object.entries(extra)) fd.set(k, v);
      await action(fd);
      router.refresh();
    });
  }

  return (
    <div>
      {/* Filtros */}
      <div className="mb-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-5">
        <Input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Buscar cliente / teléfono"
          className="lg:col-span-1"
        />
        <Select value={barberId} onValueChange={setBarberId}>
          <SelectTrigger><SelectValue placeholder="Barbero" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Todos los barberos</SelectItem>
            {barbers.map((b) => <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={status} onValueChange={setStatus}>
          <SelectTrigger><SelectValue placeholder="Estado" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Todos los estados</SelectItem>
            {ESTADOS.map((s) => <SelectItem key={s.v} value={s.v}>{s.l}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={method} onValueChange={setMethod}>
          <SelectTrigger><SelectValue placeholder="Método" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Todos los métodos</SelectItem>
            <SelectItem value="mercadopago">MercadoPago</SelectItem>
            <SelectItem value="efectivo">Efectivo</SelectItem>
          </SelectContent>
        </Select>
        <DatePicker value={date} onChange={setDate} placeholder="Todas las fechas" />
      </div>

      <p className="mb-2 flex items-center gap-2 text-xs text-muted-foreground">
        {filtered.length} turno(s){pending && <Loader2 className="h-3 w-3 animate-spin" />}
      </p>

      <div className="overflow-x-auto rounded-xl border border-border">
        <Table className="min-w-[860px]">
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead>Fecha</TableHead>
              <TableHead>Cliente</TableHead>
              <TableHead>Barbero</TableHead>
              <TableHead>Servicio</TableHead>
              <TableHead>Seña</TableHead>
              <TableHead>Saldo</TableHead>
              <TableHead>Estado</TableHead>
              <TableHead className="text-right">Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.map((r) => (
              <TableRow key={r.id}>
                <TableCell className="whitespace-nowrap">
                  <span className="text-foreground">{r.dateLabel}</span>
                  <span className="block text-xs text-muted-foreground">{r.time} hs</span>
                </TableCell>
                <TableCell>
                  <span className="text-foreground">{r.customerName}</span>
                  <span className="block text-xs text-muted-foreground">{r.customerPhone}</span>
                </TableCell>
                <TableCell className="text-muted-foreground">{r.barberName}</TableCell>
                <TableCell className="text-muted-foreground">{r.serviceName}</TableCell>
                <TableCell>
                  <span className="text-foreground">{formatARS(r.depositCents)}</span>
                  <PayHint status={r.depositStatus} method={r.depositMethod} />
                </TableCell>
                <TableCell>
                  <span className="text-foreground">{formatARS(r.balanceCents)}</span>
                  <PayHint status={r.balanceStatus} method={r.balanceMethod} />
                </TableCell>
                <TableCell>
                  <Badge variant="outline" className={BADGE[r.status]}>{statusLabel(r.status)}</Badge>
                </TableCell>
                <TableCell className="text-right">
                  <RowActions row={r} run={run} disabled={pending} />
                </TableCell>
              </TableRow>
            ))}
            {filtered.length === 0 && (
              <TableRow className="hover:bg-transparent">
                <TableCell colSpan={8} className="py-10 text-center text-muted-foreground">
                  No hay turnos con esos filtros.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}

function statusLabel(s: AppointmentStatus): string {
  return ESTADOS.find((e) => e.v === s)?.l ?? s;
}

function PayHint({ status, method }: { status: "pendiente" | "pagado"; method: string | null }) {
  return (
    <span className={`block text-[11px] ${status === "pagado" ? "text-flow-cyan" : "text-amber-300/80"}`}>
      {status === "pagado" ? `✓ ${method ? METODO[method] : ""}` : `pendiente${method ? " · " + METODO[method] : ""}`}
    </span>
  );
}

function RowActions({
  row,
  run,
  disabled,
}: {
  row: TurnoRow;
  run: (action: (fd: FormData) => Promise<void>, id: string, extra?: Record<string, string>) => void;
  disabled: boolean;
}) {
  const cancel = row.status === "cancelada" || row.status === "completada";
  const hasActions = !cancel && (row.depositStatus === "pendiente" || row.balanceStatus === "pendiente" || row.status === "confirmada");
  if (!hasActions) return <span className="text-xs text-muted-foreground/50">—</span>;
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" disabled={disabled}>
          <MoreHorizontal className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuLabel>Acciones</DropdownMenuLabel>
        {row.depositStatus === "pendiente" && (
          <DropdownMenuItem onSelect={() => run(registrarSenaEfectivoAction, row.id)}>Cobrar seña (efectivo)</DropdownMenuItem>
        )}
        {row.balanceStatus === "pendiente" && (
          <>
            <DropdownMenuItem onSelect={() => run(registrarSaldoAction, row.id, { method: "efectivo" })}>Cobrar saldo (efectivo)</DropdownMenuItem>
            <DropdownMenuItem onSelect={() => run(registrarSaldoAction, row.id, { method: "mercadopago" })}>Cobrar saldo (MercadoPago)</DropdownMenuItem>
          </>
        )}
        {row.status === "confirmada" && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuItem onSelect={() => run(panelSetStatusAction, row.id, { status: "completada" })}>Marcar como hecho</DropdownMenuItem>
            <DropdownMenuItem onSelect={() => run(panelSetStatusAction, row.id, { status: "no_show" })}>Marcar ausente</DropdownMenuItem>
            <DropdownMenuItem variant="destructive" onSelect={() => run(panelSetStatusAction, row.id, { status: "cancelada" })}>Cancelar turno</DropdownMenuItem>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
