"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { format } from "date-fns";
import { CircleDollarSign, ChevronDown } from "lucide-react";
import { Drawer, Field, inputClass } from "@/shared/ui/Drawer";
import { DatePicker } from "@/shared/ui/date-picker";
import { TimePicker } from "@/shared/ui/time-picker";
import { Button } from "@/shared/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/shared/ui/popover";
import { Badge } from "@/shared/ui/panel-kit";
import { METODO, ESTADOS, STATUS_TONE, statusLabel, type TurnoRow } from "@/entities/appointment/model/turno";
import { PayHint } from "@/entities/appointment/ui/PayHint";
import type { AppointmentStatus } from "@/shared/model/types";

// Selector de estado con badges de color (el <select> nativo no colorea las
// opciones). Popover por encima del drawer, igual que los pickers de fecha/hora.
function StatusSelect({ value, onChange }: { value: AppointmentStatus; onChange: (v: AppointmentStatus) => void }) {
  const [open, setOpen] = useState(false);
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button type="button" variant="outline" className="w-full justify-between font-normal">
          <Badge tone={STATUS_TONE[value]}>{statusLabel(value)}</Badge>
          <ChevronDown className="size-4 opacity-70" />
        </Button>
      </PopoverTrigger>
      <PopoverContent align="start" style={{ zIndex: 100 }} className="w-(--radix-popover-trigger-width) p-1">
        {ESTADOS.map((e) => (
          <button
            key={e.v}
            type="button"
            onClick={() => { onChange(e.v); setOpen(false); }}
            className="flex w-full items-center rounded-md px-2 py-1.5 hover:bg-accent"
          >
            <Badge tone={STATUS_TONE[e.v]}>{e.l}</Badge>
          </button>
        ))}
      </PopoverContent>
    </Popover>
  );
}
import { formatARS } from "@/shared/lib/money";
import {
  registrarSaldoAction,
  registrarSenaEfectivoAction,
  updateTurnoAction,
} from "@/shared/api/actions";

function Info({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-0.5">
      <span className="text-xs font-medium text-muted-foreground">{label}</span>
      <span className="text-sm text-foreground">{children}</span>
    </div>
  );
}

export function TurnoDetailDrawer({
  open,
  initial,
  items,
  barbers,
  services,
  onNavigate,
  onClose,
}: {
  open: boolean;
  initial: TurnoRow | null;
  items: TurnoRow[];
  barbers: { id: string; name: string }[];
  services: { id: string; name: string }[];
  onNavigate: (r: TurnoRow) => void;
  onClose: () => void;
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  // Fecha/Hora controladas (DatePicker + TimePicker). Se sincronizan al navegar.
  const [date, setDate] = useState<Date | undefined>(undefined);
  const [time, setTime] = useState("");
  const [status, setStatus] = useState<AppointmentStatus>("confirmada");
  useEffect(() => {
    if (initial) {
      setDate(new Date(`${initial.dateValue}T12:00:00`));
      setTime(initial.time);
      setStatus(initial.status);
    }
  }, [initial?.id, initial?.dateValue, initial?.time, initial?.status]);

  const idx = initial ? items.findIndex((x) => x.id === initial.id) : -1;
  const canPrev = idx > 0;
  const canNext = idx >= 0 && idx < items.length - 1;

  if (!initial) return <Drawer open={false} title="" onClose={onClose}>{null}</Drawer>;
  const r = initial;
  const dateStr = date ? format(date, "yyyy-MM-dd") : r.dateValue;

  const run = (action: (fd: FormData) => Promise<void>, msg: string, extra?: Record<string, string>) => {
    const fd = new FormData();
    fd.set("id", r.id);
    if (extra) for (const [k, v] of Object.entries(extra)) fd.set(k, v);
    start(async () => {
      try {
        await action(fd);
        router.refresh();
        toast.success(msg);
      } catch {
        toast.error("No se pudo completar la acción. Probá de nuevo.");
      }
    });
  };

  const save = (fd: FormData) => {
    fd.set("id", r.id);
    start(async () => {
      try {
        await updateTurnoAction(fd);
        router.refresh();
        toast.success("Turno actualizado");
        onClose();
      } catch {
        toast.error("No se pudo guardar. Puede que ese barbero ya tenga un turno en ese horario.");
      }
    });
  };

  const actBtn = "inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium disabled:opacity-60";

  return (
    <Drawer
      open={open}
      formKey={r.id}
      title={`Turno · ${r.customerName}`}
      subtitle={`${r.dateLabel} · ${r.time} hs`}
      onClose={onClose}
      onSubmit={save}
      submitting={pending}
      submitLabel="Guardar cambios"
      onPrev={canPrev ? () => onNavigate(items[idx - 1]) : undefined}
      onNext={canNext ? () => onNavigate(items[idx + 1]) : undefined}
      canPrev={canPrev}
      canNext={canNext}
      navLabel={idx >= 0 ? `${idx + 1} / ${items.length}` : undefined}
    >
      {/* Editables */}
      <Field label="Cliente">
        <input className={inputClass} name="customerName" defaultValue={r.customerName} required />
      </Field>
      <Field label="Teléfono">
        <input className={inputClass} name="customerPhone" defaultValue={r.customerPhone} placeholder="11…" />
      </Field>
      <Field label="Barbero">
        <select className={inputClass} name="barberId" defaultValue={r.barberId} disabled={barbers.length <= 1}>
          {barbers.some((b) => b.id === r.barberId) ? null : <option value={r.barberId}>{r.barberName}</option>}
          {barbers.map((b) => (
            <option key={b.id} value={b.id}>{b.name}</option>
          ))}
        </select>
      </Field>
      <Field label="Servicio">
        <select className={inputClass} name="serviceId" defaultValue={r.serviceId}>
          {services.some((s) => s.id === r.serviceId) ? null : <option value={r.serviceId}>{r.serviceName}</option>}
          {services.map((s) => (
            <option key={s.id} value={s.id}>{s.name}</option>
          ))}
        </select>
      </Field>
      <Field label="Fecha">
        <DatePicker value={date} onChange={setDate} placeholder="Elegí una fecha" className="w-full" />
        <input type="hidden" name="date" value={dateStr} />
      </Field>
      <Field label="Hora">
        <TimePicker value={time} onChange={setTime} className="w-full" />
        <input type="hidden" name="time" value={time} />
      </Field>

      <Field label="Estado">
        <StatusSelect value={status} onChange={setStatus} />
        <input type="hidden" name="status" value={status} />
      </Field>

      {/* Solo lectura */}
      <Info label="Precio">{formatARS(r.priceCents)}</Info>
      <Info label="Seña">
        {formatARS(r.depositCents)} <PayHint status={r.depositStatus} method={r.depositMethod} />
      </Info>
      <Info label="Saldo">
        {formatARS(r.balanceCents)} <PayHint status={r.balanceStatus} method={r.balanceMethod} />
      </Info>
      {(r.depositMethod || r.balanceMethod) && (
        <Info label="Métodos de pago">
          {[r.depositMethod && `Seña: ${METODO[r.depositMethod]}`, r.balanceMethod && `Saldo: ${METODO[r.balanceMethod]}`]
            .filter(Boolean)
            .join(" · ")}
        </Info>
      )}

      <Field label="Notas" full>
        <textarea className={inputClass} name="notes" rows={2} defaultValue={r.notes} placeholder="Observaciones del turno…" />
      </Field>

      {/* Cobros rápidos (el estado se cambia con el selector de arriba). */}
      <div className="sm:col-span-2">
        <span className="mb-2 block text-xs font-medium text-muted-foreground">Cobros</span>
        {r.depositStatus === "pendiente" || r.balanceStatus === "pendiente" ? (
          <div className="flex flex-wrap items-center gap-2">
            {r.depositStatus === "pendiente" && (
              <button type="button" disabled={pending} onClick={() => run(registrarSenaEfectivoAction, "Seña cobrada en efectivo")} className={`${actBtn} bg-flow-cyan/15 text-flow-cyan hover:bg-flow-cyan/25`}>
                <CircleDollarSign className="h-4 w-4" /> Cobrar seña
              </button>
            )}
            {r.balanceStatus === "pendiente" && (
              <>
                <button type="button" disabled={pending} onClick={() => run(registrarSaldoAction, "Saldo cobrado en efectivo", { method: "efectivo" })} className={`${actBtn} bg-flow-cyan/15 text-flow-cyan hover:bg-flow-cyan/25`}>
                  <CircleDollarSign className="h-4 w-4" /> Saldo efectivo
                </button>
                <button type="button" disabled={pending} onClick={() => run(registrarSaldoAction, "Saldo cobrado por MercadoPago", { method: "mercadopago" })} className={`${actBtn} bg-flow-cyan/15 text-flow-cyan hover:bg-flow-cyan/25`}>
                  <CircleDollarSign className="h-4 w-4" /> Saldo MP
                </button>
              </>
            )}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">Seña y saldo cobrados.</p>
        )}
      </div>
    </Drawer>
  );
}
