"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { ChevronDown, Columns3 } from "lucide-react";
import { cn } from "@/shared/lib/utils";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/shared/ui/dropdown-menu";
import { EmptyState } from "@/widgets/data-table/ui/toolbar";

export type Column<T> = {
  key: string;
  label: string;
  align?: "left" | "right" | "center";
  hideable?: boolean; // default true; false = siempre visible y no aparece en el toggle
  className?: string;
  truncate?: boolean; // recorta con "…" (para textos largos)
  render: (row: T) => ReactNode;
};

const alignClass = (a?: Column<unknown>["align"]) =>
  a === "right" ? "text-right" : a === "center" ? "text-center" : "text-left";

// Hook de visibilidad de columnas.
export function useColumnVisibility() {
  const [hidden, setHidden] = useState<Record<string, boolean>>({});
  const isVisible = (key: string) => !hidden[key];
  const toggle = (key: string) => setHidden((p) => ({ ...p, [key]: !p[key] }));
  return { isVisible, toggle };
}

// Botón "Columnas" con checkboxes.
export function ColumnsToggle<T>({
  columns,
  isVisible,
  toggle,
}: {
  columns: Column<T>[];
  isVisible: (key: string) => boolean;
  toggle: (key: string) => void;
}) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button className="inline-flex shrink-0 items-center gap-1.5 rounded-lg border border-border bg-card px-2.5 py-2 text-sm font-medium text-foreground hover:bg-accent sm:px-3">
          <Columns3 className="h-4 w-4" /> <span className="hidden sm:inline">Columnas</span>{" "}
          <ChevronDown className="hidden h-4 w-4 sm:inline" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-48">
        <DropdownMenuLabel>Mostrar columnas</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {columns
          .filter((c) => c.hideable !== false)
          .map((c) => (
            <DropdownMenuCheckboxItem
              key={c.key}
              checked={isVisible(c.key)}
              onCheckedChange={() => toggle(c.key)}
              onSelect={(e) => e.preventDefault()}
            >
              {c.label}
            </DropdownMenuCheckboxItem>
          ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

// Tabla genérica estilo kampo: header sticky primary, zebra + hover, fila
// seleccionable, scroll interno (header fijo), y estado vacío centrado.
export function DataTable<T>({
  columns,
  rows,
  rowKey,
  emptyLabel = "Sin resultados",
  emptyIcon,
  emptyDescription,
  emptyAction,
  isVisible,
  onRowClick,
  selectedKey,
  minWidth = "680px",
  onReachEnd,
}: {
  columns: Column<T>[];
  rows: T[];
  rowKey: (row: T) => string;
  emptyLabel?: string;
  emptyIcon?: ReactNode;
  emptyDescription?: ReactNode;
  emptyAction?: ReactNode;
  isVisible?: (key: string) => boolean;
  onRowClick?: (row: T) => void;
  selectedKey?: string | null;
  minWidth?: string;
  onReachEnd?: () => void; // scroll infinito: se llama al acercarse al final
}) {
  const cols = isVisible ? columns.filter((c) => isVisible(c.key)) : columns;
  const showEmpty = rows.length === 0;

  // Centinela al final del scroll interno: cuando entra en vista (con margen),
  // pedimos más filas. (Mismo patrón que kampo/DataTable.)
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const sentinelRef = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    const el = sentinelRef.current;
    if (!el || !onReachEnd) return;
    const obs = new IntersectionObserver((entries) => { if (entries[0]?.isIntersecting) onReachEnd(); }, {
      root: scrollRef.current,
      rootMargin: "250px 0px",
    });
    obs.observe(el);
    return () => obs.disconnect();
  }, [onReachEnd, rows.length]);

  // Wrapper rounded + overflow-hidden → recorta las esquinas (header y filas).
  // El scroll vive en un div interno para que el header sticky quede clippeado.
  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-xl border border-border">
      {showEmpty ? (
        <div className="flex flex-1 items-center justify-center">
          <EmptyState icon={emptyIcon} title={emptyLabel} description={emptyDescription} action={emptyAction} />
        </div>
      ) : (
        <div ref={scrollRef} className="min-h-0 flex-1 overflow-auto overscroll-contain [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          <table className="w-full text-sm" style={{ minWidth }}>
            <thead className="sticky top-0 z-10 bg-primary text-left text-xs uppercase tracking-wide text-primary-foreground">
              <tr>
                {cols.map((c) => (
                  <th key={c.key} className={cn("whitespace-nowrap px-3 py-3 font-bold sm:px-4", alignClass(c.align))}>
                    {c.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {rows.map((r, i) => {
                const selected = selectedKey != null && rowKey(r) === selectedKey;
                return (
                  <tr
                    key={rowKey(r)}
                    onClick={onRowClick ? () => onRowClick(r) : undefined}
                    className={cn(
                      "transition-colors",
                      onRowClick && "cursor-pointer",
                      selected
                        ? "bg-primary/10 shadow-[inset_3px_0_0_0_var(--color-primary)]"
                        : cn(i % 2 === 1 ? "bg-muted/40" : "bg-card", "hover:bg-accent/60"),
                    )}
                  >
                    {cols.map((c) => (
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
                );
              })}
            </tbody>
          </table>
          {onReachEnd && <div ref={sentinelRef} aria-hidden className="h-px w-full" />}
        </div>
      )}
    </div>
  );
}
