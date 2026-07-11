"use client";

import { useTransition } from "react";
import { MapPin, Check, ChevronDown } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/shared/ui/dropdown-menu";
import { setSucursalAction } from "@/shared/api/sucursal-actions";
import type { Sucursal } from "@/shared/api/sucursal";

// Selector de sucursal activa. Con una sola sucursal se muestra como etiqueta;
// con varias, como dropdown.
export function SucursalSwitcher({
  sucursales,
  currentId,
  compact = false,
}: {
  sucursales: Sucursal[];
  currentId: string | null;
  compact?: boolean;
}) {
  const [pending, start] = useTransition();
  if (!sucursales.length) return null;
  const current = sucursales.find((s) => s.id === currentId) ?? sucursales[0];

  if (sucursales.length === 1) {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-card px-2.5 py-1.5 text-sm font-medium text-muted-foreground">
        <MapPin className="h-4 w-4 text-primary" />
        {!compact && <span className="truncate">{current.nombre}</span>}
      </span>
    );
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          disabled={pending}
          className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-card px-2.5 py-1.5 text-sm font-medium text-foreground hover:bg-accent"
        >
          <MapPin className="h-4 w-4 shrink-0 text-primary" />
          <span className="max-w-[8rem] truncate">{current.nombre}</span>
          <ChevronDown className="h-4 w-4 opacity-60" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-60">
        {sucursales.map((s) => (
          <DropdownMenuItem key={s.id} onClick={() => start(() => setSucursalAction(s.id))} className="gap-2">
            <Check className={`h-4 w-4 ${s.id === current.id ? "opacity-100" : "opacity-0"}`} />
            <span className="truncate">{s.nombre}</span>
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
