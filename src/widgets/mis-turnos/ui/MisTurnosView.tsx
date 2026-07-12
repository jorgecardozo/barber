"use client";

import Link from "next/link";
import { DataTable, type Column } from "@/widgets/data-table/ui/DataTable";
import { PageHeader } from "@/widgets/page-header/ui/PageHeader";
import { Panel, Badge } from "@/widgets/data-table/ui/toolbar";
import { STATUS_TONE, statusLabel } from "@/widgets/turnos/ui/TurnosTable";
import { cancelarTurnoAction } from "@/shared/api/actions";
import { formatARS } from "@/shared/lib/money";
import type { AppointmentStatus } from "@/shared/model/types";

// Para el cliente, un turno "hold" es un pago pendiente.
const clientStatusLabel = (s: AppointmentStatus) => (s === "hold" ? "Pago pendiente" : statusLabel(s));

export type MisTurnoRow = {
  id: string;
  serviceName: string;
  barberName: string;
  dateLabel: string;
  time: string;
  depositCents: number;
  status: AppointmentStatus;
  isHold: boolean;
  cancelable: boolean;
};

function RowActions({ r }: { r: MisTurnoRow }) {
  if (!r.isHold && !r.cancelable) return <span className="text-xs text-muted-foreground/50">—</span>;
  return (
    <div className="flex items-center justify-end gap-3">
      {r.isHold && (
        <Link
          href={`/reservar/pago/${r.id}`}
          className="rounded-full bg-primary px-3 py-1 text-xs font-semibold text-primary-foreground hover:bg-primary/90"
        >
          Completar pago
        </Link>
      )}
      {r.cancelable && (
        <form action={cancelarTurnoAction}>
          <input type="hidden" name="id" value={r.id} />
          <button className="text-xs text-muted-foreground underline-offset-2 transition-colors hover:text-destructive hover:underline">
            Cancelar
          </button>
        </form>
      )}
    </div>
  );
}

export function MisTurnosView({
  rows,
  firstName,
  error,
  cancelWindowHours,
}: {
  rows: MisTurnoRow[];
  firstName: string;
  error?: string;
  cancelWindowHours: number;
}) {
  const columns: Column<MisTurnoRow>[] = [
    { key: "serv", label: "Servicio", render: (r) => <span className="font-medium text-foreground">{r.serviceName}</span> },
    { key: "barb", label: "Barbero", render: (r) => <span className="text-muted-foreground">con {r.barberName}</span> },
    { key: "fecha", label: "Fecha", render: (r) => <span className="text-foreground">{r.dateLabel}</span> },
    { key: "hora", label: "Hora", render: (r) => <span className="text-foreground">{r.time} hs</span> },
    { key: "sena", label: "Seña", render: (r) => <span className="text-muted-foreground">{formatARS(r.depositCents)}</span> },
    { key: "estado", label: "Estado", render: (r) => <Badge tone={STATUS_TONE[r.status]}>{clientStatusLabel(r.status)}</Badge> },
    { key: "acc", label: "Acciones", align: "right", render: (r) => <RowActions r={r} /> },
  ];

  return (
    <main className="flex min-h-0 w-full min-w-0 flex-1 flex-col px-4 py-6 sm:px-6 lg:px-8">
      <PageHeader
        section="TURNOS"
        title="Mis turnos"
        actions={
          <Link
            href="/reservar"
            className="inline-flex shrink-0 items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:bg-primary/90"
          >
            + Nuevo turno
          </Link>
        }
      />
      <p className="-mt-1 mb-3 text-sm text-muted-foreground">Hola, {firstName} 👋</p>

      {error === "tarde" && (
        <p className="mb-3 rounded-xl border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm text-foreground">
          No se puede cancelar con menos de {cancelWindowHours} hs de anticipación.
        </p>
      )}

      {rows.length === 0 ? (
        <Panel className="flex flex-1 flex-col items-center justify-center p-10 text-center">
          <p className="text-muted-foreground">Todavía no tenés turnos.</p>
          <Link href="/reservar" className="mt-5 inline-block rounded-full bg-primary px-6 py-2.5 font-semibold text-primary-foreground hover:bg-primary/90">
            Reservar mi primer turno
          </Link>
        </Panel>
      ) : (
        <>
          {/* Tabla (desktop) — mismo layout que el panel */}
          <div className="hidden min-h-0 flex-1 flex-col md:flex">
            <Panel className="flex min-h-0 flex-1 flex-col p-2.5 sm:p-4">
              <DataTable columns={columns} rows={rows} rowKey={(r) => r.id} minWidth="820px" emptyLabel="Sin turnos" />
            </Panel>
          </div>

          {/* Tarjetas (mobile) */}
          <ul className="space-y-3 md:hidden">
            {rows.map((r) => (
              <li key={r.id} className="rounded-2xl border border-border bg-card p-5">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h3 className="font-display text-xl">{r.serviceName}</h3>
                    <p className="text-sm text-muted-foreground">con {r.barberName}</p>
                  </div>
                  <Badge tone={STATUS_TONE[r.status]}>{clientStatusLabel(r.status)}</Badge>
                </div>
                <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted-foreground">
                  <span className="text-foreground">{r.dateLabel}</span>
                  <span className="text-foreground">{r.time} hs</span>
                  <span>seña {formatARS(r.depositCents)}</span>
                </div>
                {(r.isHold || r.cancelable) && (
                  <div className="mt-3">
                    <RowActions r={r} />
                  </div>
                )}
              </li>
            ))}
          </ul>
        </>
      )}
    </main>
  );
}
