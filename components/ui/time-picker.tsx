"use client";

import * as React from "react";
import { Clock, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

// Slots cada `stepMin` entre `from` y `to` (formato "HH:mm", 24h).
function buildSlots(from: string, to: string, stepMin: number) {
  const [fh, fm] = from.split(":").map(Number);
  const [th, tm] = to.split(":").map(Number);
  const start = fh * 60 + fm;
  const end = th * 60 + tm;
  const out: string[] = [];
  for (let m = start; m <= end; m += stepMin) {
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
  const slots = React.useMemo(() => {
    const base = buildSlots(from, to, stepMin);
    // Si la hora actual no cae en la grilla, la agregamos para poder mostrarla.
    return value && !base.includes(value) ? [value, ...base].sort() : base;
  }, [from, to, stepMin, value]);

  const selectedRef = React.useRef<HTMLButtonElement | null>(null);
  React.useEffect(() => {
    if (open) selectedRef.current?.scrollIntoView({ block: "center" });
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
        <PopoverContent align="start" style={{ zIndex: 100 }} className="w-[--radix-popover-trigger-width] p-1">
          <div className="max-h-60 overflow-y-auto">
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
