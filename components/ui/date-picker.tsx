"use client";

import * as React from "react";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { CalendarIcon, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

export function DatePicker({
  value,
  onChange,
  placeholder = "Fecha",
  className,
}: {
  value?: Date;
  onChange: (d?: Date) => void;
  placeholder?: string;
  className?: string;
}) {
  const [open, setOpen] = React.useState(false);
  return (
    // Wrapper relative: el ancho lo decide el padre via className (w-full sm:w-52).
    // La X de limpiar va INTEGRADA dentro del control (overlay a la derecha), no huerfana al costado.
    <div className={cn("relative", className)}>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            className={cn(
              "w-full justify-start font-normal",
              value && "pr-8", // espacio para la X
              value && "border-flow-cyan/40 text-foreground" // acento cyan cuando hay fecha
            )}
          >
            <CalendarIcon className="mr-2 size-4 opacity-70" />
            {value ? (
              format(value, "EEE d 'de' MMM", { locale: es })
            ) : (
              <span className="text-muted-foreground">{placeholder}</span>
            )}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="start">
          <Calendar
            mode="single"
            selected={value}
            onSelect={(d) => {
              onChange(d);
              setOpen(false);
            }}
            locale={es}
            autoFocus
          />
        </PopoverContent>
      </Popover>

      {value && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onChange(undefined);
          }}
          aria-label="Limpiar fecha"
          className="absolute top-1/2 right-1.5 inline-flex size-5 -translate-y-1/2 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
        >
          <X className="size-3.5" />
        </button>
      )}
    </div>
  );
}
