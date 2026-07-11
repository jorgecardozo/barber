"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Check, X, CircleDollarSign, Ban } from "lucide-react";
import { Drawer, Field, inputClass } from "@/components/panel/Drawer";
import { Badge } from "@/components/panel/ui";
import { METODO, STATUS_TONE, statusLabel, PayHint, type TurnoRow } from "@/components/panel/TurnosTable";
import { formatARS } from "@/lib/money";
import {
  panelSetStatusAction,
  registrarSaldoAction,
  registrarSenaEfectivoAction,
  updateTurnoAction,
} from "@/lib/actions";

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

  const idx = initial ? items.findIndex((x) => x.id === initial.id) : -1;
  const canPrev = idx > 0;
  const canNext = idx >= 0 && idx < items.length - 1;

  if (!initial) return <Drawer open={false} title="" onClose={onClose}>{null}</Drawer>;
  const r = initial;

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

  const finalizado = r.status === "cancelada" || r.status === "completada";
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
        <input className={inputClass} type="date" name="date" defaultValue={r.dateValue} />
      </Field>
      <Field label="Hora">
        <input className={inputClass} type="time" name="time" defaultValue={r.time} step={300} />
      </Field>

      {/* Solo lectura */}
      <Info label="Estado">
        <Badge tone={STATUS_TONE[r.status]}>{statusLabel(r.status)}</Badge>
      </Info>
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

      {/* Acciones operativas del turno */}
      <div className="sm:col-span-2">
        <span className="mb-2 block text-xs font-medium text-muted-foreground">Acciones</span>
        {finalizado ? (
          <p className="text-sm text-muted-foreground">Este turno ya está {statusLabel(r.status).toLowerCase()}.</p>
        ) : (
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
            {r.status === "confirmada" && (
              <>
                <button type="button" disabled={pending} onClick={() => run(panelSetStatusAction, "Turno marcado como hecho", { status: "completada" })} className={`${actBtn} bg-emerald-500/15 text-emerald-400 hover:bg-emerald-500/25`}>
                  <Check className="h-4 w-4" /> Marcar hecho
                </button>
                <button type="button" disabled={pending} onClick={() => run(panelSetStatusAction, "Turno marcado como ausente", { status: "no_show" })} className={`${actBtn} bg-amber-400/15 text-amber-300 hover:bg-amber-400/25`}>
                  <X className="h-4 w-4" /> Ausente
                </button>
                <button type="button" disabled={pending} onClick={() => run(panelSetStatusAction, "Turno cancelado", { status: "cancelada" })} className={`${actBtn} bg-rose-500/15 text-rose-400 hover:bg-rose-500/25`}>
                  <Ban className="h-4 w-4" /> Cancelar turno
                </button>
              </>
            )}
          </div>
        )}
      </div>
    </Drawer>
  );
}
