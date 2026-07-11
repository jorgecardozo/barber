"use client";

import { useMemo, useState, type ReactNode } from "react";
import { Search, SlidersHorizontal } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";

export type Column<T> = {
  key: string;
  label: string;
  align?: "left" | "right" | "center";
  className?: string;
  truncate?: boolean;
  render: (row: T) => ReactNode;
};

type Props<T> = {
  columns: Column<T>[];
  rows: T[];
  rowKey: (row: T) => string;
  // Búsqueda (cliente). Si se pasa, aparece el buscador.
  searchPlaceholder?: string;
  matchesSearch?: (row: T, q: string) => boolean;
  // Contenido del popover de Filtros (ícono a la derecha).
  filters?: ReactNode;
  filtersCount?: number;
  // Acciones/derecha del toolbar (ej: botón "Nuevo", contador).
  toolbarRight?: ReactNode;
  onRowClick?: (row: T) => void;
  emptyLabel?: string;
  minWidth?: string; // ej "720px" para scroll horizontal
};

const alignClass = (a?: Column<unknown>["align"]) =>
  a === "right" ? "text-right" : a === "center" ? "text-center" : "text-left";

export function DataTable<T>({
  columns,
  rows,
  rowKey,
  searchPlaceholder,
  matchesSearch,
  filters,
  filtersCount = 0,
  toolbarRight,
  onRowClick,
  emptyLabel = "Sin resultados",
  minWidth = "680px",
}: Props<T>) {
  const [q, setQ] = useState("");

  const filtered = useMemo(() => {
    if (!q.trim() || !matchesSearch) return rows;
    const s = q.trim().toLowerCase();
    return rows.filter((r) => matchesSearch(r, s));
  }, [rows, q, matchesSearch]);

  const showToolbar = !!(matchesSearch || filters || toolbarRight);

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      {/* Toolbar: buscador + acciones + Filtros (ícono) — todo en una línea */}
      {showToolbar && (
      <div className="mb-3 flex items-center gap-2">
        {matchesSearch && (
          <div className="relative min-w-0 flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder={searchPlaceholder ?? "Buscar…"}
              className="pl-9"
            />
          </div>
        )}
        {toolbarRight}
        {filters && (
          <Popover>
            <PopoverTrigger asChild>
              <button
                type="button"
                title="Filtros"
                className="relative inline-flex shrink-0 items-center justify-center rounded-lg border border-border bg-card px-2.5 py-2 text-foreground hover:bg-accent"
              >
                <SlidersHorizontal className="h-4 w-4" />
                {filtersCount > 0 && (
                  <span className="absolute -right-1.5 -top-1.5 inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[10px] font-semibold text-primary-foreground">
                    {filtersCount}
                  </span>
                )}
              </button>
            </PopoverTrigger>
            <PopoverContent align="end" className="grid w-72 gap-3 p-4">
              {filters}
            </PopoverContent>
          </Popover>
        )}
      </div>
      )}

      {/* Tabla: scroll interno + header sticky */}
      <div
        className="flex min-h-0 flex-1 flex-col overflow-auto rounded-xl border border-border [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        <table className="w-full text-sm" style={{ minWidth }}>
          <thead className="sticky top-0 z-10 bg-primary text-left text-xs uppercase tracking-wide text-primary-foreground">
            <tr>
              {columns.map((c) => (
                <th key={c.key} className={cn("whitespace-nowrap px-3 py-3 font-bold sm:px-4", alignClass(c.align))}>
                  {c.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={columns.length} className="px-4 py-14 text-center text-sm text-muted-foreground">
                  {emptyLabel}
                </td>
              </tr>
            ) : (
              filtered.map((r, i) => (
                <tr
                  key={rowKey(r)}
                  onClick={onRowClick ? () => onRowClick(r) : undefined}
                  className={cn(
                    "transition-colors",
                    onRowClick && "cursor-pointer",
                    i % 2 === 1 ? "bg-muted/40" : "bg-card",
                    "hover:bg-accent/60"
                  )}
                >
                  {columns.map((c) => (
                    <td
                      key={c.key}
                      className={cn("whitespace-nowrap px-3 py-2.5 text-foreground sm:px-4", alignClass(c.align), c.className)}
                    >
                      {c.truncate ? (
                        <span className="block max-w-[140px] truncate sm:max-w-[220px]">{c.render(r)}</span>
                      ) : (
                        c.render(r)
                      )}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
