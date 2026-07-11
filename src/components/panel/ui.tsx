"use client";

import type { ReactNode } from "react";
import { ChevronLeft, ChevronRight, List, MousePointer2, Plus, Search, SlidersHorizontal, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

// Primitivos de panel con la MISMA estructura/estilos que kampo
// (campo-front/src/modules/shared/ui), adaptados a los tokens de flow-site
// (primary rojo, ink oscuro, cyan de acento). Ver docs/PORT-KAMPO.md.

// ---------- Panel (card contenedora, como kampo) ----------
export function Panel({ children, className = "" }: { children: ReactNode; className?: string }) {
  return (
    <div className={cn("rounded-2xl border border-border bg-card", className)}>{children}</div>
  );
}

// ---------- Toggle de modo de lista (paginado / scroll) ----------
export type ListMode = "paged" | "infinite";

export function ModeToggle({ mode, onChange }: { mode: ListMode; onChange: (m: ListMode) => void }) {
  const base = "inline-flex items-center justify-center px-2.5 py-2 transition-colors";
  return (
    <div className="hidden overflow-hidden rounded-lg border border-border sm:inline-flex">
      <button
        type="button"
        title="Paginado"
        onClick={() => onChange("paged")}
        className={cn(base, mode === "paged" ? "bg-primary text-primary-foreground" : "bg-card text-muted-foreground hover:bg-accent")}
      >
        <List className="h-4 w-4" />
      </button>
      <button
        type="button"
        title="Ver todo (scroll)"
        onClick={() => onChange("infinite")}
        className={cn(
          base,
          "border-l border-border",
          mode === "infinite" ? "bg-primary text-primary-foreground" : "bg-card text-muted-foreground hover:bg-accent",
        )}
      >
        <MousePointer2 className="h-4 w-4" />
      </button>
    </div>
  );
}

// ---------- Búsqueda ----------
export function SearchInput({
  value,
  onChange,
  placeholder = "Buscar…",
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
}) {
  return (
    <div className="relative w-full min-w-0 md:w-72">
      <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full rounded-lg border border-border bg-card py-2 pl-9 pr-3 text-sm text-foreground outline-none placeholder:text-muted-foreground focus:border-primary focus:ring-1 focus:ring-primary"
      />
    </div>
  );
}

// ---------- Botón primario ----------
export function PrimaryButton({
  children,
  onClick,
  type = "button",
  icon = true,
  disabled,
}: {
  children: ReactNode;
  onClick?: () => void;
  type?: "button" | "submit";
  icon?: boolean;
  disabled?: boolean;
}) {
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className="inline-flex shrink-0 items-center gap-2 whitespace-nowrap rounded-lg bg-primary px-3 py-2 text-sm font-semibold text-primary-foreground hover:bg-primary/90 disabled:opacity-60 sm:px-4"
    >
      {icon && <Plus className="h-4 w-4" />}
      {children}
    </button>
  );
}

// ---------- Badge con tonos ----------
export type BadgeTone = "gray" | "green" | "amber" | "red" | "cyan";

const badgeTones: Record<BadgeTone, string> = {
  gray: "bg-muted text-muted-foreground",
  green: "bg-emerald-500/15 text-emerald-400",
  amber: "bg-amber-400/15 text-amber-300",
  red: "bg-rose-500/15 text-rose-400",
  cyan: "bg-flow-cyan/15 text-flow-cyan",
};

export function Badge({ children, tone = "gray" }: { children: ReactNode; tone?: BadgeTone }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium",
        badgeTones[tone],
      )}
    >
      {children}
    </span>
  );
}

// ---------- Estado vacío ----------
export function EmptyState({
  icon,
  title = "Sin datos",
  description,
  action,
}: {
  icon?: ReactNode;
  title?: string;
  description?: ReactNode;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center px-6 py-14 text-center">
      <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10 text-primary">
        <span className="text-3xl">{icon ?? "📋"}</span>
      </div>
      <h3 className="text-base font-semibold text-foreground">{title}</h3>
      {description && <p className="mt-1 max-w-sm text-sm text-muted-foreground">{description}</p>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}

// ---------- Selector (wrapper del Radix Select con look kampo) ----------
export type SelectOption = { value: string; label: string };

export function FilterSelect({
  value,
  onChange,
  options,
  placeholder = "Seleccionar…",
  className,
}: {
  value: string;
  onChange: (v: string) => void;
  options: SelectOption[];
  placeholder?: string;
  className?: string;
}) {
  // Radix Select no admite value="" → usamos "__all__" como centinela para la
  // opción "todos" y lo mapeamos a "".
  const ALL = "__all__";
  return (
    <Select value={value === "" ? ALL : value} onValueChange={(v) => onChange(v === ALL ? "" : v)}>
      <SelectTrigger
        className={cn(
          "h-auto min-h-[38px] w-full rounded-lg border-border bg-card px-3 py-2 text-sm",
          className,
        )}
      >
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent position="popper" align="start" className="max-h-64">
        {options.map((o) => (
          <SelectItem key={o.value || ALL} value={o.value === "" ? ALL : o.value}>
            {o.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

// ---------- Campo etiquetado para el panel de filtros ----------
export function FilterField({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="flex flex-col gap-1">
      <span className="text-xs font-medium text-muted-foreground">{label}</span>
      {children}
    </label>
  );
}

const dateInputClass =
  "rounded-lg border border-border bg-card px-3 py-2 text-sm text-foreground outline-none focus:border-primary focus:ring-1 focus:ring-primary [color-scheme:dark]";

export function DateRangeInputs({
  from,
  to,
  onFrom,
  onTo,
}: {
  from: string;
  to: string;
  onFrom: (v: string) => void;
  onTo: (v: string) => void;
}) {
  return (
    <div className="grid grid-cols-2 gap-2">
      <label className="flex flex-col gap-1">
        <span className="text-[11px] text-muted-foreground">Desde</span>
        <input type="date" className={dateInputClass} value={from} onChange={(e) => onFrom(e.target.value)} />
      </label>
      <label className="flex flex-col gap-1">
        <span className="text-[11px] text-muted-foreground">Hasta</span>
        <input type="date" className={dateInputClass} value={to} onChange={(e) => onTo(e.target.value)} />
      </label>
    </div>
  );
}

// ---------- Barra de filtros: búsqueda + Filtros(ícono+badge) + chips ----------
export type FilterChip = { key: string; label: string; onClear: () => void };

export function FiltersBar({
  search,
  onSearch,
  searchPlaceholder,
  children,
  chips = [],
  onClearAll,
  right,
}: {
  search: string;
  onSearch: (v: string) => void;
  searchPlaceholder?: string;
  children?: ReactNode; // controles del panel de filtros
  chips?: FilterChip[];
  onClearAll?: () => void;
  right?: ReactNode; // acciones a la derecha (contador, columnas…)
}) {
  return (
    <div className="mb-2 flex flex-col gap-2 sm:mb-4 sm:gap-3">
      {/* Todo en una línea: buscador (crece) + controles + Filtros (ícono) */}
      <div className="flex items-center gap-2">
        <div className="min-w-0 flex-1">
          <SearchInput value={search} onChange={onSearch} placeholder={searchPlaceholder} />
        </div>
        {right}
        {children && (
          <Popover>
            <PopoverTrigger asChild>
              <button
                type="button"
                title="Filtros"
                className="relative inline-flex shrink-0 items-center justify-center rounded-lg border border-border bg-card px-2.5 py-2 text-foreground hover:bg-accent"
              >
                <SlidersHorizontal className="h-4 w-4" />
                {chips.length > 0 && (
                  <span className="absolute -right-1.5 -top-1.5 inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[10px] font-semibold text-primary-foreground">
                    {chips.length}
                  </span>
                )}
              </button>
            </PopoverTrigger>
            <PopoverContent align="end" className="grid w-72 gap-3 p-4">
              {children}
              {chips.length > 0 && onClearAll && (
                <button
                  type="button"
                  onClick={onClearAll}
                  className="mt-1 text-sm font-medium text-primary hover:text-primary/80"
                >
                  Limpiar filtros
                </button>
              )}
            </PopoverContent>
          </Popover>
        )}
      </div>

      {chips.length > 0 && (
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs text-muted-foreground">Activos:</span>
          {chips.map((c) => (
            <button
              key={c.key}
              type="button"
              onClick={c.onClear}
              className="inline-flex items-center gap-1 rounded-full border border-flow-cyan/40 bg-flow-cyan/10 px-2.5 py-1 text-xs font-medium text-flow-cyan hover:bg-flow-cyan/20"
            >
              <span className="max-w-[12rem] truncate">{c.label}</span> <X className="h-3 w-3" />
            </button>
          ))}
          {onClearAll && (
            <button
              type="button"
              onClick={onClearAll}
              className="text-xs font-medium text-muted-foreground hover:text-foreground"
            >
              Limpiar todo
            </button>
          )}
        </div>
      )}
    </div>
  );
}

// ---------- Pie del modo scroll (cuántas se ven de cuántas) ----------
export function InfiniteFooter({
  shown,
  total,
  hasNext,
}: {
  shown: number;
  total: number;
  hasNext: boolean;
}) {
  if (total === 0) return null;
  return (
    <div className="pt-4 text-center text-sm text-muted-foreground">
      {hasNext ? `Desplazate para ver más (${shown} de ${total})` : `Fin de la lista · ${total} en total`}
    </div>
  );
}

// ---------- Paginación numerada (estilo kampo) ----------
export function Pagination({
  page,
  pageSize,
  total,
  onPage,
}: {
  page: number; // 1-based
  pageSize: number;
  total: number;
  onPage: (p: number) => void;
}) {
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  if (total === 0) return null;

  const from = (page - 1) * pageSize + 1;
  const to = Math.min(page * pageSize, total);

  const windowSize = 5;
  let start = Math.max(1, page - Math.floor(windowSize / 2));
  const end = Math.min(totalPages, start + windowSize - 1);
  start = Math.max(1, end - windowSize + 1);
  const pages = Array.from({ length: end - start + 1 }, (_, i) => start + i);

  const btn =
    "inline-flex h-8 min-w-8 items-center justify-center rounded-lg border border-border px-2 text-sm hover:bg-accent disabled:cursor-not-allowed disabled:opacity-40";

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 pt-4">
      <span className="text-sm text-muted-foreground">
        Mostrando <b className="text-foreground">{from}</b>–<b className="text-foreground">{to}</b> de{" "}
        <b className="text-foreground">{total}</b>
      </span>
      <div className="flex items-center gap-1">
        <button className={btn} onClick={() => onPage(page - 1)} disabled={page <= 1}>
          <ChevronLeft className="h-4 w-4" />
        </button>
        {start > 1 && (
          <>
            <button className={btn} onClick={() => onPage(1)}>1</button>
            {start > 2 && <span className="px-1 text-muted-foreground">…</span>}
          </>
        )}
        {pages.map((p) => (
          <button
            key={p}
            onClick={() => onPage(p)}
            className={cn(btn, p === page && "border-primary bg-primary text-primary-foreground hover:bg-primary/90")}
          >
            {p}
          </button>
        ))}
        {end < totalPages && (
          <>
            {end < totalPages - 1 && <span className="px-1 text-muted-foreground">…</span>}
            <button className={btn} onClick={() => onPage(totalPages)}>{totalPages}</button>
          </>
        )}
        <button className={btn} onClick={() => onPage(page + 1)} disabled={page >= totalPages}>
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
