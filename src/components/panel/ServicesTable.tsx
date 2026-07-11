"use client";

import { useMemo, useState } from "react";
import { DataTable, ColumnsToggle, useColumnVisibility, type Column } from "@/components/panel/DataTable";
import { PageHeader } from "@/components/panel/PageHeader";
import { ServiceFormDrawer } from "@/components/panel/ServiceFormDrawer";
import { FiltersBar, PrimaryButton, Pagination, InfiniteFooter, Panel, ModeToggle, type ListMode } from "@/components/panel/ui";
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

const PAGE_SIZE = 12;

export function ServicesTable({ services, isAdmin }: { services: ServiceRow[]; isAdmin: boolean }) {
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [mode, setMode] = useState<ListMode>("paged");
  const [visible, setVisible] = useState(PAGE_SIZE);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [selected, setSelected] = useState<ServiceRow | null>(null);
  const { isVisible, toggle } = useColumnVisibility();

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return services;
    return services.filter(
      (s) => s.name.toLowerCase().includes(q) || s.description.toLowerCase().includes(q),
    );
  }, [services, search]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const paged = filtered.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);
  const shown = mode === "infinite" ? filtered.slice(0, visible) : paged;
  const hasNext = mode === "infinite" && visible < filtered.length;

  const openCreate = () => { setSelected(null); setDrawerOpen(true); };
  const openEdit = (s: ServiceRow) => { setSelected(s); setDrawerOpen(true); };

  const columns: Column<ServiceRow>[] = [
    {
      key: "name",
      label: "Servicio",
      hideable: false,
      truncate: true,
      render: (s) => (
        <div>
          <span className="font-medium text-foreground">{s.name}</span>
          <span className="block max-w-xs truncate text-xs text-muted-foreground">{s.description}</span>
        </div>
      ),
    },
    { key: "dur", label: "Duración", render: (s) => <span className="text-muted-foreground">{s.durationMin} min</span> },
    { key: "price", label: "Precio", className: "font-medium", render: (s) => formatARS(s.priceCents) },
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
  ];

  return (
    <>
      <PageHeader
        section="CONFIGURACIÓN"
        title="Servicios"
        actions={isAdmin ? <PrimaryButton onClick={openCreate}>Nuevo servicio</PrimaryButton> : undefined}
      />

      <Panel className="flex min-h-0 flex-1 flex-col p-2.5 sm:p-4">
        <FiltersBar
          search={search}
          onSearch={(v) => { setSearch(v); setPage(1); setVisible(PAGE_SIZE); }}
          searchPlaceholder="Buscar servicio…"
          right={
            <>
              <ModeToggle mode={mode} onChange={(m) => { setMode(m); setVisible(PAGE_SIZE); }} />
              <ColumnsToggle columns={columns} isVisible={isVisible} toggle={toggle} />
            </>
          }
        />

        <DataTable
          columns={columns}
          rows={shown}
          rowKey={(s) => s.id}
          isVisible={isVisible}
          onRowClick={isAdmin ? openEdit : undefined}
          selectedKey={drawerOpen ? selected?.id : null}
          emptyIcon="✂️"
          emptyLabel={search ? "Sin resultados" : "Todavía no hay servicios"}
          emptyDescription={search ? "Probá con otra búsqueda." : "Cargá tu primer servicio."}
          minWidth="640px"
          onReachEnd={hasNext ? () => setVisible((v) => v + PAGE_SIZE) : undefined}
        />

        {mode === "paged" ? (
          <Pagination page={safePage} pageSize={PAGE_SIZE} total={filtered.length} onPage={setPage} />
        ) : (
          <InfiniteFooter shown={Math.min(visible, filtered.length)} total={filtered.length} hasNext={hasNext} />
        )}
      </Panel>

      <ServiceFormDrawer
        open={drawerOpen}
        initial={selected}
        items={filtered}
        isAdmin={isAdmin}
        onNavigate={setSelected}
        onClose={() => setDrawerOpen(false)}
      />
    </>
  );
}
