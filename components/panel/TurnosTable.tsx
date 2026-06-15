"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { MoreHorizontal, Loader2, ChevronLeft, ChevronRight, Search, SlidersHorizontal, X } from "lucide-react";
import { cn } from "@/lib/utils";
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
  { v: "en_curso", l: "En el sillón" },
  { v: "completada", l: "Completado" },
  { v: "no_show", l: "Ausente" },
  { v: "cancelada", l: "Cancelado" },
];

const BADGE: Record<AppointmentStatus, string> = {
  hold: "bg-amber-400/15 text-amber-300 border-transparent",
  confirmada: "bg-flow-cyan/15 text-flow-cyan border-transparent",
  en_curso: "bg-flow-cyan/25 text-flow-cyan border-transparent",
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
  const [showFilters, setShowFilters] = useState(false);

  const dateKey = date ? format(date, "yyyy-MM-dd") : null;
  const isTodayKey = dateKey === today;
  const hayFiltros =
    q.trim() !== "" || barberId !== "todos" || status !== "todos" || method !== "todos" || !isTodayKey;
  const activeCount =
    (q.trim() !== "" ? 1 : 0) +
    (barberId !== "todos" ? 1 : 0) +
    (status !== "todos" ? 1 : 0) +
    (method !== "todos" ? 1 : 0) +
    (!isTodayKey ? 1 : 0);
  function limpiar() {
    setQ("");
    setBarberId("todos");
    setStatus("todos");
    setMethod("todos");
    setDate(new Date(today + "T12:00:00"));
  }
  const activeChips: { key: string; label: string; clear: () => void }[] = [
    q.trim() !== "" && { key: "q", label: `"${q.trim()}"`, clear: () => setQ("") },
    barberId !== "todos" && {
      key: "barber",
      label: barbers.find((b) => b.id === barberId)?.name ?? "Barbero",
      clear: () => setBarberId("todos"),
    },
    status !== "todos" && {
      key: "status",
      label: statusLabel(status as AppointmentStatus),
      clear: () => setStatus("todos"),
    },
    method !== "todos" && { key: "method", label: METODO[method] ?? method, clear: () => setMethod("todos") },
    !isTodayKey && {
      key: "date",
      label: date ? format(date, "d 'de' MMM", { locale: es }) : "Todas las fechas",
      clear: () => setDate(new Date(today + "T12:00:00")),
    },
  ].filter(Boolean) as { key: string; label: string; clear: () => void }[];

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

  const PAGE_SIZE = 20;
  const [page, setPage] = useState(0);
  useEffect(() => setPage(0), [q, barberId, status, method, dateKey]);
  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages - 1);
  const paged = filtered.slice(safePage * PAGE_SIZE, safePage * PAGE_SIZE + PAGE_SIZE);

  function run(action: (fd: FormData) => Promise<void>, id: string, msg: string, extra?: Record<string, string>) {
    startTransition(async () => {
      const fd = new FormData();
      fd.set("id", id);
      if (extra) for (const [k, v] of Object.entries(extra)) fd.set(k, v);
      try {
        await action(fd);
        router.refresh();
        toast.success(msg);
      } catch {
        toast.error("No se pudo completar la acción. Probá de nuevo.");
      }
    });
  }

  return (
    <div>
      {/* ============ FILTROS ============ */}
      <div className="mb-3">
        {/* Fila 1: buscador (siempre) + botón Filtros (solo mobile) */}
        <div className="flex items-center gap-2">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Buscar cliente o teléfono"
              aria-label="Buscar cliente o teléfono"
              className="pl-9"
            />
          </div>

          {/* Toggle "Filtros" — SOLO mobile. size=default = h-8 para alinear con el Input. */}
          <Button
            type="button"
            variant="outline"
            size="default"
            onClick={() => setShowFilters((s) => !s)}
            aria-expanded={showFilters}
            aria-controls="turnos-filtros"
            className="shrink-0 sm:hidden"
          >
            <SlidersHorizontal className="size-4" />
            Filtros
            {activeCount > 0 && (
              <span className="ml-0.5 inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-flow-cyan px-1 text-[11px] leading-none font-semibold text-background">
                {activeCount}
              </span>
            )}
          </Button>
        </div>

        {/* Controles: ocultos en mobile salvo showFilters; SIEMPRE visibles en sm+. */}
        <div
          id="turnos-filtros"
          className={cn(
            "mt-2 gap-2 sm:flex sm:flex-wrap sm:items-center",
            showFilters ? "flex flex-wrap items-center" : "hidden"
          )}
        >
          <Select value={barberId} onValueChange={setBarberId}>
            <SelectTrigger aria-label="Filtrar por barbero" className="w-full sm:w-44">
              <SelectValue placeholder="Barbero" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todos los barberos</SelectItem>
              {barbers.map((b) => (
                <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={status} onValueChange={setStatus}>
            <SelectTrigger aria-label="Filtrar por estado" className="w-full sm:w-44">
              <SelectValue placeholder="Estado" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todos los estados</SelectItem>
              {ESTADOS.map((s) => (
                <SelectItem key={s.v} value={s.v}>{s.l}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={method} onValueChange={setMethod}>
            <SelectTrigger aria-label="Filtrar por método de pago" className="w-full sm:w-48">
              <SelectValue placeholder="Método" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todos los métodos</SelectItem>
              <SelectItem value="mercadopago">MercadoPago</SelectItem>
              <SelectItem value="efectivo">Efectivo</SelectItem>
            </SelectContent>
          </Select>

          <DatePicker
            value={date}
            onChange={setDate}
            placeholder="Todas las fechas"
            className="w-full sm:w-52"
          />

          {/* Limpiar — único, condicional. En sm+ vive acá (al final de la fila). */}
          {hayFiltros && (
            <Button
              type="button"
              variant="ghost"
              size="default"
              onClick={limpiar}
              className="hidden text-muted-foreground hover:text-foreground sm:ml-auto sm:inline-flex"
            >
              <X className="size-4" />
              Limpiar filtros
            </Button>
          )}
        </div>

        {/* Chips removibles de filtros activos. Visibles en TODOS los breakpoints. */}
        {activeChips.length > 0 && (
          <div className="mt-2 flex flex-wrap items-center gap-1.5">
            {activeChips.map((chip) => (
              <FilterChip key={chip.key} label={chip.label} onClear={chip.clear} />
            ))}
            {/* Limpiar para mobile, junto a los chips (en sm+ ya está arriba). */}
            <button
              type="button"
              onClick={limpiar}
              className="inline-flex h-6 items-center rounded-full px-2 text-xs font-medium text-muted-foreground underline-offset-2 transition-colors hover:text-foreground hover:underline sm:hidden"
            >
              Limpiar
            </button>
          </div>
        )}
      </div>

      {/* Conteo de resultados */}
      <p className="mb-2 flex items-center gap-2 text-xs text-muted-foreground">
        <span>
          <span className="font-medium text-foreground">{filtered.length}</span> turno{filtered.length === 1 ? "" : "s"}
        </span>
        {pending && <Loader2 className="size-3 animate-spin" />}
      </p>

      {/* Tabla (desktop) */}
      <div className="hidden overflow-x-auto rounded-xl border border-border md:block">
        <Table className="min-w-[760px]">
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
            {paged.map((r) => (
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

      {/* Tarjetas (mobile) */}
      <div className="space-y-2 md:hidden">
        {paged.map((r) => (
          <div key={r.id} className="rounded-xl border border-border bg-card p-4">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <p className="font-medium text-foreground">{r.customerName}</p>
                <p className="text-xs text-muted-foreground">{r.customerPhone}</p>
              </div>
              <Badge variant="outline" className={BADGE[r.status]}>{statusLabel(r.status)}</Badge>
            </div>
            <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-muted-foreground">
              <span className="text-foreground">{r.dateLabel} · {r.time}</span>
              <span>{r.barberName}</span>
              <span>{r.serviceName}</span>
            </div>
            <div className="mt-3 flex items-end justify-between gap-2">
              <div className="grid grid-cols-2 gap-x-4 text-sm">
                <div>
                  <span className="text-xs text-muted-foreground">Seña</span>
                  <p className="text-foreground">{formatARS(r.depositCents)}</p>
                  <PayHint status={r.depositStatus} method={r.depositMethod} />
                </div>
                <div>
                  <span className="text-xs text-muted-foreground">Saldo</span>
                  <p className="text-foreground">{formatARS(r.balanceCents)}</p>
                  <PayHint status={r.balanceStatus} method={r.balanceMethod} />
                </div>
              </div>
              <RowActions row={r} run={run} disabled={pending} />
            </div>
          </div>
        ))}
        {filtered.length === 0 && (
          <p className="rounded-xl border border-border bg-card px-4 py-10 text-center text-muted-foreground">No hay turnos con esos filtros.</p>
        )}
      </div>

      {totalPages > 1 && (
        <div className="mt-4 flex items-center justify-between text-sm">
          <span className="text-muted-foreground">Página {safePage + 1} de {totalPages}</span>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => setPage((p) => Math.max(0, p - 1))} disabled={safePage === 0}>
              <ChevronLeft className="h-4 w-4" /> Anterior
            </Button>
            <Button variant="outline" size="sm" onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))} disabled={safePage >= totalPages - 1}>
              Siguiente <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

function statusLabel(s: AppointmentStatus): string {
  return ESTADOS.find((e) => e.v === s)?.l ?? s;
}

function FilterChip({ label, onClear }: { label: string; onClear: () => void }) {
  return (
    <span className="inline-flex h-6 items-center gap-1 rounded-full border border-flow-cyan/40 bg-flow-cyan/10 py-0 pr-1 pl-2.5 text-xs text-flow-cyan">
      <span className="max-w-[10rem] truncate">{label}</span>
      <button
        type="button"
        onClick={onClear}
        aria-label={`Quitar filtro ${label}`}
        className="inline-flex size-4 items-center justify-center rounded-full text-flow-cyan/80 transition-colors hover:bg-flow-cyan/20 hover:text-flow-cyan"
      >
        <X className="size-3" />
      </button>
    </span>
  );
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
  run: (action: (fd: FormData) => Promise<void>, id: string, msg: string, extra?: Record<string, string>) => void;
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
      <DropdownMenuContent align="end" className="min-w-56">
        <DropdownMenuLabel>Acciones</DropdownMenuLabel>
        {row.depositStatus === "pendiente" && (
          <DropdownMenuItem onSelect={() => run(registrarSenaEfectivoAction, row.id, "Seña cobrada en efectivo")}>Cobrar seña</DropdownMenuItem>
        )}
        {row.balanceStatus === "pendiente" && (
          <>
            <DropdownMenuItem onSelect={() => run(registrarSaldoAction, row.id, "Saldo cobrado en efectivo", { method: "efectivo" })}>Saldo en efectivo</DropdownMenuItem>
            <DropdownMenuItem onSelect={() => run(registrarSaldoAction, row.id, "Saldo cobrado por MercadoPago", { method: "mercadopago" })}>Saldo por MercadoPago</DropdownMenuItem>
          </>
        )}
        {row.status === "confirmada" && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuItem onSelect={() => run(panelSetStatusAction, row.id, "Turno marcado como hecho", { status: "completada" })}>Marcar como hecho</DropdownMenuItem>
            <DropdownMenuItem onSelect={() => run(panelSetStatusAction, row.id, "Turno marcado como ausente", { status: "no_show" })}>Marcar ausente</DropdownMenuItem>
            <DropdownMenuItem variant="destructive" onSelect={() => run(panelSetStatusAction, row.id, "Turno cancelado", { status: "cancelada" })}>Cancelar turno</DropdownMenuItem>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
