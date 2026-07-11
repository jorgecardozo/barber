"use client";

import { useEffect, useMemo, useState, useTransition, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { MoreHorizontal, Loader2 } from "lucide-react";
import { Button } from "@/shared/ui/button";
import { DatePicker } from "@/shared/ui/date-picker";
import { DataTable, ColumnsToggle, useColumnVisibility, type Column } from "@/components/panel/DataTable";
import { PageHeader } from "@/components/panel/PageHeader";
import { Badge, FiltersBar, FilterField, FilterSelect, Pagination, InfiniteFooter, Panel, ModeToggle, type BadgeTone, type ListMode } from "@/components/panel/ui";
import { TurnoDetailDrawer } from "@/components/panel/TurnoDetailDrawer";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/shared/ui/dropdown-menu";
import { formatARS } from "@/shared/lib/money";
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
  notes: string;
  barberId: string;
  barberName: string;
  serviceId: string;
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

export const METODO: Record<string, string> = { mercadopago: "MercadoPago", efectivo: "Efectivo" };
export const ESTADOS: { v: AppointmentStatus; l: string }[] = [
  { v: "confirmada", l: "Confirmado" },
  { v: "en_curso", l: "En el sillón" },
  { v: "completada", l: "Completado" },
  { v: "no_show", l: "Ausente" },
  { v: "cancelada", l: "Cancelado" },
];

export const STATUS_TONE: Record<AppointmentStatus, BadgeTone> = {
  hold: "amber",
  confirmada: "cyan",
  en_curso: "cyan",
  completada: "green",
  no_show: "amber",
  cancelada: "red",
  expirada: "gray",
};

export function TurnosTable({
  rows,
  barbers,
  services,
  today,
  headerActions,
}: {
  rows: TurnoRow[];
  barbers: { id: string; name: string }[];
  services: { id: string; name: string }[];
  today: string;
  headerActions?: ReactNode;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [q, setQ] = useState("");
  const [barberId, setBarberId] = useState("todos");
  const [status, setStatus] = useState("todos");
  const [method, setMethod] = useState("todos");
  const [date, setDate] = useState<Date | undefined>(new Date(today + "T12:00:00"));
  const [mode, setMode] = useState<ListMode>("paged");
  const { isVisible, toggle } = useColumnVisibility();
  const [detailOpen, setDetailOpen] = useState(false);
  const [selected, setSelected] = useState<TurnoRow | null>(null);

  const dateKey = date ? format(date, "yyyy-MM-dd") : null;
  const isTodayKey = dateKey === today;

  function limpiar() {
    setQ("");
    setBarberId("todos");
    setStatus("todos");
    setMethod("todos");
    setDate(new Date(today + "T12:00:00"));
  }

  const chips = [
    q.trim() !== "" && { key: "q", label: `"${q.trim()}"`, onClear: () => setQ("") },
    barberId !== "todos" && {
      key: "barber",
      label: barbers.find((b) => b.id === barberId)?.name ?? "Barbero",
      onClear: () => setBarberId("todos"),
    },
    status !== "todos" && {
      key: "status",
      label: statusLabel(status as AppointmentStatus),
      onClear: () => setStatus("todos"),
    },
    method !== "todos" && { key: "method", label: METODO[method] ?? method, onClear: () => setMethod("todos") },
    !isTodayKey && {
      key: "date",
      label: date ? format(date, "d 'de' MMM", { locale: es }) : "Todas las fechas",
      onClear: () => setDate(new Date(today + "T12:00:00")),
    },
  ].filter(Boolean) as { key: string; label: string; onClear: () => void }[];

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
  const [page, setPage] = useState(1);
  const [visible, setVisible] = useState(PAGE_SIZE);
  useEffect(() => { setPage(1); setVisible(PAGE_SIZE); }, [q, barberId, status, method, dateKey]);
  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const paged = filtered.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);
  const shown = mode === "infinite" ? filtered.slice(0, visible) : paged;
  const hasNext = mode === "infinite" && visible < filtered.length;

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

  const columns: Column<TurnoRow>[] = [
    {
      key: "fecha",
      label: "Fecha",
      hideable: false,
      render: (r) => (
        <div>
          <span className="text-foreground">{r.dateLabel}</span>
          <span className="block text-xs text-muted-foreground">{r.time} hs</span>
        </div>
      ),
    },
    {
      key: "cliente",
      label: "Cliente",
      truncate: true,
      render: (r) => (
        <div>
          <span className="text-foreground">{r.customerName}</span>
          <span className="block text-xs text-muted-foreground">{r.customerPhone}</span>
        </div>
      ),
    },
    { key: "barbero", label: "Barbero", render: (r) => <span className="text-muted-foreground">{r.barberName}</span> },
    { key: "servicio", label: "Servicio", truncate: true, render: (r) => <span className="text-muted-foreground">{r.serviceName}</span> },
    {
      key: "sena",
      label: "Seña",
      render: (r) => (
        <div>
          <span className="text-foreground">{formatARS(r.depositCents)}</span>
          <PayHint status={r.depositStatus} method={r.depositMethod} />
        </div>
      ),
    },
    {
      key: "saldo",
      label: "Saldo",
      render: (r) => (
        <div>
          <span className="text-foreground">{formatARS(r.balanceCents)}</span>
          <PayHint status={r.balanceStatus} method={r.balanceMethod} />
        </div>
      ),
    },
    { key: "estado", label: "Estado", render: (r) => <Badge tone={STATUS_TONE[r.status]}>{statusLabel(r.status)}</Badge> },
    {
      key: "acciones",
      label: "Acciones",
      align: "right",
      hideable: false,
      render: (r) => (
        <div onClick={(e) => e.stopPropagation()}>
          <RowActions row={r} run={run} disabled={pending} />
        </div>
      ),
    },
  ];

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <PageHeader section="ATENCIÓN" title="Turnos" actions={headerActions} />

      <Panel className="flex min-h-0 flex-1 flex-col p-2.5 sm:p-4">
        <FiltersBar
          search={q}
          onSearch={setQ}
          searchPlaceholder="Buscar cliente o teléfono…"
          chips={chips}
          onClearAll={limpiar}
          right={
            <>
              {pending && <Loader2 className="mr-1 hidden size-4 animate-spin text-muted-foreground sm:inline" />}
              <ModeToggle mode={mode} onChange={(m) => { setMode(m); setVisible(PAGE_SIZE); }} />
              <ColumnsToggle columns={columns} isVisible={isVisible} toggle={toggle} />
            </>
          }
        >
          <FilterField label="Barbero">
            <FilterSelect
              value={barberId}
              onChange={setBarberId}
              options={[{ value: "todos", label: "Todos los barberos" }, ...barbers.map((b) => ({ value: b.id, label: b.name }))]}
            />
          </FilterField>
          <FilterField label="Estado">
            <FilterSelect
              value={status}
              onChange={setStatus}
              options={[{ value: "todos", label: "Todos los estados" }, ...ESTADOS.map((s) => ({ value: s.v, label: s.l }))]}
            />
          </FilterField>
          <FilterField label="Método">
            <FilterSelect
              value={method}
              onChange={setMethod}
              options={[
                { value: "todos", label: "Todos los métodos" },
                { value: "mercadopago", label: "MercadoPago" },
                { value: "efectivo", label: "Efectivo" },
              ]}
            />
          </FilterField>
          <FilterField label="Fecha">
            <DatePicker value={date} onChange={setDate} placeholder="Todas las fechas" className="w-full" />
          </FilterField>
        </FiltersBar>

        <DataTable
          columns={columns}
          rows={shown}
          rowKey={(r) => r.id}
          isVisible={isVisible}
          minWidth="820px"
          onRowClick={(r) => { setSelected(r); setDetailOpen(true); }}
          selectedKey={detailOpen ? selected?.id : null}
          emptyIcon="📅"
          emptyLabel="No hay turnos con esos filtros."
          emptyDescription="Cambiá los filtros o registrá un turno nuevo."
          onReachEnd={hasNext ? () => setVisible((v) => v + PAGE_SIZE) : undefined}
        />

        {mode === "paged" ? (
          <Pagination page={safePage} pageSize={PAGE_SIZE} total={filtered.length} onPage={setPage} />
        ) : (
          <InfiniteFooter shown={Math.min(visible, filtered.length)} total={filtered.length} hasNext={hasNext} />
        )}
      </Panel>

      <TurnoDetailDrawer
        open={detailOpen}
        initial={selected}
        items={filtered}
        barbers={barbers}
        services={services}
        onNavigate={setSelected}
        onClose={() => setDetailOpen(false)}
      />
    </div>
  );
}

export function statusLabel(s: AppointmentStatus): string {
  return ESTADOS.find((e) => e.v === s)?.l ?? s;
}

export function PayHint({ status, method }: { status: "pendiente" | "pagado"; method: string | null }) {
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
