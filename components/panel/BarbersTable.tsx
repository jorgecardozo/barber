"use client";

import { DataTable, type Column } from "@/components/panel/DataTable";
import { BarberDialog } from "@/components/panel/BarberDialog";
import { BarberActiveToggle } from "@/components/panel/BarberActiveToggle";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";

export type BarberRow = {
  id: string;
  name: string;
  specialty: string;
  active: boolean;
  img?: string;
  email?: string;
};

export function BarbersTable({ barbers }: { barbers: BarberRow[] }) {
  const columns: Column<BarberRow>[] = [
    {
      key: "name",
      label: "Barbero",
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
      render: (b) =>
        b.active ? (
          <Badge variant="outline" className="border-transparent bg-flow-cyan/15 text-flow-cyan">Activo</Badge>
        ) : (
          <Badge variant="outline" className="border-transparent bg-amber-400/15 text-amber-300">Pendiente</Badge>
        ),
    },
    {
      key: "actions",
      label: "Acciones",
      align: "right",
      render: (b) => (
        <div className="flex items-center justify-end gap-2" onClick={(e) => e.stopPropagation()}>
          <BarberActiveToggle id={b.id} active={b.active} />
          <BarberDialog barber={{ id: b.id, name: b.name, specialty: b.specialty }} />
        </div>
      ),
    },
  ];

  return (
    <DataTable
      columns={columns}
      rows={barbers}
      rowKey={(b) => b.id}
      searchPlaceholder="Buscar barbero, especialidad o email…"
      matchesSearch={(b, q) =>
        b.name.toLowerCase().includes(q) ||
        b.specialty.toLowerCase().includes(q) ||
        (b.email ?? "").toLowerCase().includes(q)
      }
      toolbarRight={<span className="hidden shrink-0 text-sm text-muted-foreground sm:inline">{barbers.length} barberos</span>}
      emptyLabel="No hay barberos"
      minWidth="720px"
    />
  );
}
