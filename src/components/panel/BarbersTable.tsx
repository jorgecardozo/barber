"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { DataTable, ColumnsToggle, useColumnVisibility, type Column } from "@/components/panel/DataTable";
import { PageHeader } from "@/components/panel/PageHeader";
import { BarberFormDrawer } from "@/components/panel/BarberFormDrawer";
import { BarberActiveToggle } from "@/components/panel/BarberActiveToggle";
import { FiltersBar, PrimaryButton, Pagination, InfiniteFooter, Badge, Panel, ModeToggle, type ListMode } from "@/components/panel/ui";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

export type BarberRow = {
  id: string;
  name: string;
  specialty: string;
  active: boolean;
  img?: string;
  email?: string;
};

const PAGE_SIZE = 12;

export function BarbersTable({ barbers, isAdmin }: { barbers: BarberRow[]; isAdmin: boolean }) {
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [mode, setMode] = useState<ListMode>("paged");
  const [visible, setVisible] = useState(PAGE_SIZE);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [selected, setSelected] = useState<BarberRow | null>(null);
  const { isVisible, toggle } = useColumnVisibility();

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return barbers;
    return barbers.filter(
      (b) =>
        b.name.toLowerCase().includes(q) ||
        b.specialty.toLowerCase().includes(q) ||
        (b.email ?? "").toLowerCase().includes(q),
    );
  }, [barbers, search]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const paged = filtered.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);
  const shown = mode === "infinite" ? filtered.slice(0, visible) : paged;
  const hasNext = mode === "infinite" && visible < filtered.length;

  const openCreate = () => { setSelected(null); setDrawerOpen(true); };
  const openEdit = (b: BarberRow) => { setSelected(b); setDrawerOpen(true); };

  const columns: Column<BarberRow>[] = [
    {
      key: "name",
      label: "Barbero",
      hideable: false,
      render: (b) => (
        <div className="flex items-center gap-3">
          <Avatar className="h-9 w-9 shrink-0">
            <AvatarImage src={b.img} alt={b.name} />
            <AvatarFallback>{b.name[0]}</AvatarFallback>
          </Avatar>
          <span className="font-medium text-foreground">{b.name}</span>
        </div>
      ),
    },
    { key: "spec", label: "Especialidad", truncate: true, render: (b) => <span className="text-muted-foreground">{b.specialty || "-"}</span> },
    { key: "email", label: "Email", truncate: true, render: (b) => <span className="text-muted-foreground">{b.email || "-"}</span> },
    {
      key: "estado",
      label: "Estado",
      render: (b) => (b.active ? <Badge tone="cyan">Activo</Badge> : <Badge tone="amber">Pendiente</Badge>),
    },
    {
      key: "actions",
      label: "Activar",
      align: "right",
      render: (b) => (
        <div className="flex items-center justify-end" onClick={(e) => e.stopPropagation()}>
          <BarberActiveToggle id={b.id} active={b.active} />
        </div>
      ),
    },
  ];

  return (
    <>
      <PageHeader
        section="CONFIGURACIÓN"
        title="Barberos"
        actions={<PrimaryButton onClick={openCreate}>Nuevo barbero</PrimaryButton>}
      />

      <Panel className="flex min-h-0 flex-1 flex-col p-2.5 sm:p-4">
        <FiltersBar
          search={search}
          onSearch={(v) => { setSearch(v); setPage(1); setVisible(PAGE_SIZE); }}
          searchPlaceholder="Buscar barbero, especialidad o email…"
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
          rowKey={(b) => b.id}
          isVisible={isVisible}
          onRowClick={openEdit}
          selectedKey={drawerOpen ? selected?.id : null}
          emptyIcon="✂️"
          emptyLabel={search ? "Sin resultados" : "Todavía no hay barberos"}
          emptyDescription={search ? "Probá con otra búsqueda." : "Cargá tu equipo o esperá a que se registren."}
          minWidth="760px"
          onReachEnd={hasNext ? () => setVisible((v) => v + PAGE_SIZE) : undefined}
        />

        {mode === "paged" ? (
          <Pagination page={safePage} pageSize={PAGE_SIZE} total={filtered.length} onPage={setPage} />
        ) : (
          <InfiniteFooter shown={Math.min(visible, filtered.length)} total={filtered.length} hasNext={hasNext} />
        )}
      </Panel>

      <p className="mt-4 shrink-0 text-sm text-muted-foreground">
        ¿Un barbero nuevo? Decile que se registre en{" "}
        <Link href="/ingresar?tab=barbero" className="text-flow-cyan hover:underline">la página de ingreso</Link>{" "}
        y después lo activás acá.
      </p>

      <BarberFormDrawer
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
