"use client";

import * as React from "react";
import { Clock, X } from "lucide-react";
import { cn } from "@/shared/lib/utils";
import { Button } from "@/shared/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/shared/ui/popover";

// Slots cada `stepMin` entre `from` y `to` (formato "HH:mm", 24h) — solo atajos.
function buildSlots(from: string, to: string, stepMin: number) {
  const [fh, fm] = from.split(":").map(Number);
  const [th, tm] = to.split(":").map(Number);
  const out: string[] = [];
  for (let m = fh * 60 + fm; m <= th * 60 + tm; m += stepMin) {
    out.push(`${String(Math.floor(m / 60)).padStart(2, "0")}:${String(m % 60).padStart(2, "0")}`);
  }
  return out;
}

export function TimePicker({
  value,
  onChange,
  placeholder = "Elegí la hora",
  from = "07:00",
  to = "22:00",
  stepMin = 15,
  className,
}: {
  value?: string;
  onChange: (v: string) => void;
  placeholder?: string;
  from?: string;
  to?: string;
  stepMin?: number;
  className?: string;
}) {
  const [open, setOpen] = React.useState(false);
  const slots = React.useMemo(() => buildSlots(from, to, stepMin), [from, to, stepMin]);

  const selectedRef = React.useRef<HTMLButtonElement | null>(null);
  React.useEffect(() => {
    if (!open) return;
    // Esperamos a que monte el contenido del popover para scrollear al valor.
    const t = setTimeout(() => selectedRef.current?.scrollIntoView({ block: "center" }), 0);
    return () => clearTimeout(t);
  }, [open]);

  return (
    <div className={cn("relative", className)}>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            type="button"
            variant="outline"
            className={cn("w-full justify-start font-normal", value && "pr-8 border-flow-cyan/40 text-foreground")}
          >
            <Clock className="mr-2 size-4 opacity-70" />
            {value ? `${value} hs` : <span className="text-muted-foreground">{placeholder}</span>}
          </Button>
        </PopoverTrigger>
        <PopoverContent align="start" style={{ zIndex: 100 }} className="w-(--radix-popover-trigger-width) p-1">
          {/* Entrada libre: cualquier hora (paso 1 min). */}
          <input
            type="time"
            step={60}
            value={value || ""}
            onChange={(e) => onChange(e.target.value)}
            className="mb-1 w-full rounded-md border border-border bg-card px-3 py-2 text-sm text-foreground outline-none focus:border-primary focus:ring-1 focus:ring-primary [color-scheme:light] dark:[color-scheme:dark]"
          />
          {/* Atajos cada 15 min. */}
          <div className="max-h-52 overflow-y-auto">
            {slots.map((s) => {
              const active = s === value;
              return (
                <button
                  key={s}
                  ref={active ? selectedRef : undefined}
                  type="button"
                  onClick={() => {
                    onChange(s);
                    setOpen(false);
                  }}
                  className={cn(
                    "flex w-full items-center rounded-md px-3 py-1.5 text-sm",
                    active
                      ? "bg-primary text-primary-foreground"
                      : "text-foreground hover:bg-accent hover:text-foreground",
                  )}
                >
                  {s} hs
                </button>
              );
            })}
          </div>
        </PopoverContent>
      </Popover>

      {value && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onChange("");
          }}
          aria-label="Limpiar hora"
          className="absolute top-1/2 right-1.5 inline-flex size-5 -translate-y-1/2 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
        >
          <X className="size-3.5" />
        </button>
      )}
    </div>
  );
}
