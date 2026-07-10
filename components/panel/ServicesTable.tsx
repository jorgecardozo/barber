"use client";

import { DataTable, type Column } from "@/components/panel/DataTable";
import { ServiceDialog } from "@/components/panel/ServiceDialog";
import { DeleteServiceButton } from "@/components/panel/DeleteServiceButton";
import { depositForPrice } from "@/lib/decisions";
import { formatARS } from "@/lib/money";

export type ServiceRow = {
  id: string;
  name: string;
  description: string;
  priceCents: number;
  durationMin: number;
  depositPct: number;
};

export function ServicesTable({ services, isAdmin }: { services: ServiceRow[]; isAdmin: boolean }) {
  const columns: Column<ServiceRow>[] = [
    {
      key: "name",
      label: "Servicio",
      truncate: true,
      render: (s) => (
        <div>
          <span className="font-medium text-foreground">{s.name}</span>
          <span className="block max-w-xs truncate text-xs text-muted-foreground">{s.description}</span>
        </div>
      ),
    },
    { key: "dur", label: "Duración", render: (s) => <span className="text-muted-foreground">{s.durationMin} min</span> },
    { key: "price", label: "Precio", render: (s) => formatARS(s.priceCents) },
    {
      key: "deposit",
      label: "Seña",
      render: (s) => (
        <span className="text-flow-cyan">
          {formatARS(depositForPrice(s.priceCents))}{" "}
          <span className="text-xs text-muted-foreground">({s.depositPct}%)</span>
        </span>
      ),
    },
    {
      key: "actions",
      label: "Acciones",
      align: "right",
      render: (s) => (
        <div className="flex items-center justify-end gap-1" onClick={(e) => e.stopPropagation()}>
          <ServiceDialog service={s} />
          {isAdmin && <DeleteServiceButton id={s.id} name={s.name} />}
        </div>
      ),
    },
  ];

  return (
    <DataTable
      columns={columns}
      rows={services}
      rowKey={(s) => s.id}
      searchPlaceholder="Buscar servicio…"
      matchesSearch={(s, q) =>
        s.name.toLowerCase().includes(q) || s.description.toLowerCase().includes(q)
      }
      toolbarRight={<span className="hidden shrink-0 text-sm text-muted-foreground sm:inline">{services.length} servicios</span>}
      emptyLabel="No hay servicios"
      minWidth="640px"
    />
  );
}
