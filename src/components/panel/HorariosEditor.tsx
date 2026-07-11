"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Loader2, Check, CalendarClock, Copy } from "lucide-react";
import { Button } from "@/shared/ui/button";
import { Input } from "@/shared/ui/input";
import { Switch } from "@/shared/ui/switch";
import { setWorkingHoursAction } from "@/lib/admin-actions";

type DayState = { closed: boolean; open: string; close: string; breakStart: string; breakEnd: string };
type HoursInput = { weekday: number; open: string; close: string; breakStart?: string; breakEnd?: string };

const DAY_NAMES = ["Domingo", "Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado"];
const ORDER = [1, 2, 3, 4, 5, 6, 0];

export function HorariosEditor({
  barberId,
  barberName,
  hours,
}: {
  barberId: string;
  barberName: string;
  hours: HoursInput[];
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [saved, setSaved] = useState(false);

  const [days, setDays] = useState<DayState[]>(() =>
    Array.from({ length: 7 }, (_, wd) => {
      const h = hours.find((x) => x.weekday === wd);
      return {
        closed: !h,
        open: h?.open ?? "10:00",
        close: h?.close ?? "20:00",
        breakStart: h?.breakStart ?? "",
        breakEnd: h?.breakEnd ?? "",
      };
    }),
  );

  function patch(wd: number, p: Partial<DayState>) {
    setDays((prev) => prev.map((d, i) => (i === wd ? { ...d, ...p } : d)));
    setSaved(false);
  }

  // Plantilla para aplicar el mismo horario a todos los días
  const base = hours.find((h) => h.weekday === 1) ?? hours[0];
  const [tpl, setTpl] = useState({
    open: base?.open ?? "10:00",
    close: base?.close ?? "20:00",
    breakStart: base?.breakStart ?? "13:00",
    breakEnd: base?.breakEnd ?? "14:00",
  });
  const [incluirCerrados, setIncluirCerrados] = useState(false);

  function aplicarATodos() {
    setDays((prev) =>
      prev.map((d) => {
        if (d.closed && !incluirCerrados) return d; // respeta el día franco
        return {
          closed: incluirCerrados ? false : d.closed,
          open: tpl.open,
          close: tpl.close,
          breakStart: tpl.breakStart,
          breakEnd: tpl.breakEnd,
        };
      }),
    );
    setSaved(false);
    toast.success("Horario aplicado a todos los días. Revisá y guardá.");
  }

  function save() {
    const fd = new FormData();
    fd.set("barberId", barberId);
    days.forEach((d, wd) => {
      if (d.closed) {
        fd.set(`d${wd}_closed`, "on");
      } else {
        fd.set(`d${wd}_open`, d.open);
        fd.set(`d${wd}_close`, d.close);
        if (d.breakStart) fd.set(`d${wd}_break_start`, d.breakStart);
        if (d.breakEnd) fd.set(`d${wd}_break_end`, d.breakEnd);
      }
    });
    start(async () => {
      try {
        await setWorkingHoursAction(fd);
        router.refresh();
        setSaved(true);
        toast.success("Horarios guardados");
      } catch {
        toast.error("No se pudieron guardar los horarios.");
      }
    });
  }

  return (
    <div className="space-y-2">
      <p className="mb-2 text-sm text-muted-foreground">Horario de <span className="text-foreground">{barberName}</span></p>

      {/* Aplicar un mismo horario a todos los días */}
      <div className="rounded-xl border border-flow-cyan/30 bg-flow-cyan/5 p-4">
        <div className="mb-3 flex items-center gap-2">
          <CalendarClock className="h-4 w-4 text-flow-cyan" />
          <span className="text-sm font-medium text-foreground">Aplicar un horario a todos los días</span>
        </div>
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <TimeField label="Abre" value={tpl.open} onChange={(v) => setTpl((t) => ({ ...t, open: v }))} />
          <TimeField label="Cierra" value={tpl.close} onChange={(v) => setTpl((t) => ({ ...t, close: v }))} />
          <TimeField label="Corte desde" value={tpl.breakStart} onChange={(v) => setTpl((t) => ({ ...t, breakStart: v }))} />
          <TimeField label="Corte hasta" value={tpl.breakEnd} onChange={(v) => setTpl((t) => ({ ...t, breakEnd: v }))} />
        </div>
        <div className="mt-3 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <label className="flex cursor-pointer items-center gap-2 text-sm text-muted-foreground">
            <Switch checked={incluirCerrados} onCheckedChange={setIncluirCerrados} />
            Incluir días cerrados (abre todos)
          </label>
          <Button variant="outline" onClick={aplicarATodos} className="border-flow-cyan/40 text-flow-cyan hover:bg-flow-cyan/10 hover:text-flow-cyan">
            <Copy className="h-4 w-4" /> Aplicar a todos los días
          </Button>
        </div>
      </div>

      {ORDER.map((wd) => {
        const d = days[wd];
        return (
          <div key={wd} className="rounded-lg border border-border bg-card p-4">
            <div className="flex items-center gap-2">
              <Switch checked={!d.closed} onCheckedChange={(v) => patch(wd, { closed: !v })} />
              <span className={d.closed ? "text-muted-foreground" : "font-medium text-foreground"}>{DAY_NAMES[wd]}</span>
              {d.closed && <span className="ml-auto text-sm text-muted-foreground">Cerrado</span>}
            </div>
            {!d.closed && (
              <div className="mt-3 grid grid-cols-2 gap-3 lg:grid-cols-4">
                <TimeField label="Abre" value={d.open} onChange={(v) => patch(wd, { open: v })} />
                <TimeField label="Cierra" value={d.close} onChange={(v) => patch(wd, { close: v })} />
                <TimeField label="Corte desde" value={d.breakStart} onChange={(v) => patch(wd, { breakStart: v })} />
                <TimeField label="Corte hasta" value={d.breakEnd} onChange={(v) => patch(wd, { breakEnd: v })} />
              </div>
            )}
          </div>
        );
      })}
      <div className="flex items-center gap-3 pt-3">
        <Button onClick={save} disabled={pending}>
          {pending && <Loader2 className="h-4 w-4 animate-spin" />}
          Guardar horarios
        </Button>
        {saved && !pending && (
          <span className="flex items-center gap-1 text-sm text-flow-cyan"><Check className="h-4 w-4" /> Guardado</span>
        )}
      </div>
    </div>
  );
}

function TimeField({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <label className="flex flex-col gap-1">
      <span className="text-xs text-muted-foreground">{label}</span>
      <Input type="time" value={value} onChange={(e) => onChange(e.target.value)} className="h-9 w-full" />
    </label>
  );
}
