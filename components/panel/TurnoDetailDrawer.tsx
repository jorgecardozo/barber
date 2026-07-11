"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Check, X, CircleDollarSign, Ban } from "lucide-react";
import { Drawer } from "@/components/panel/Drawer";
import { Badge } from "@/components/panel/ui";
import { METODO, STATUS_TONE, statusLabel, PayHint, type TurnoRow } from "@/components/panel/TurnosTable";
import { formatARS } from "@/lib/money";
import {
  panelSetStatusAction,
  registrarSaldoAction,
  registrarSenaEfectivoAction,
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
  onNavigate,
  onClose,
}: {
  open: boolean;
  initial: TurnoRow | null;
  items: TurnoRow[];
  onNavigate: (r: TurnoRow) => void;
  onClose: () => void;
}) {
  const router = useRouter();
  const [pending, start] = useTransition();

  const idx = initial ? items.findIndex((x) => x.id === initial.id) : -1;
  const canPrev = idx > 0;
  const canNext = idx >= 0 && idx < items.length - 1;

  if (!initial) return <Drawer open={false} title="" onClose={onClose} footer={null}>{null}</Drawer>;
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

  const finalizado = r.status === "cancelada" || r.status === "completada";
  const btn =
    "inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium disabled:opacity-60";

  const actions = (
    <div className="flex flex-wrap items-center gap-2">
      {r.depositStatus === "pendiente" && (
        <button
          type="button"
          disabled={pending}
          onClick={() => run(registrarSenaEfectivoAction, "Seña cobrada en efectivo")}
          className={`${btn} bg-flow-cyan/15 text-flow-cyan hover:bg-flow-cyan/25`}
        >
          <CircleDollarSign className="h-4 w-4" /> Cobrar seña
        </button>
      )}
      {r.balanceStatus === "pendiente" && (
        <>
          <button
            type="button"
            disabled={pending}
            onClick={() => run(registrarSaldoAction, "Saldo cobrado en efectivo", { method: "efectivo" })}
            className={`${btn} bg-flow-cyan/15 text-flow-cyan hover:bg-flow-cyan/25`}
          >
            <CircleDollarSign className="h-4 w-4" /> Saldo efectivo
          </button>
          <button
            type="button"
            disabled={pending}
            onClick={() => run(registrarSaldoAction, "Saldo cobrado por MercadoPago", { method: "mercadopago" })}
            className={`${btn} bg-flow-cyan/15 text-flow-cyan hover:bg-flow-cyan/25`}
          >
            <CircleDollarSign className="h-4 w-4" /> Saldo MP
          </button>
        </>
      )}
      {r.status === "confirmada" && (
        <>
          <button
            type="button"
            disabled={pending}
            onClick={() => run(panelSetStatusAction, "Turno marcado como hecho", { status: "completada" })}
            className={`${btn} bg-emerald-500/15 text-emerald-400 hover:bg-emerald-500/25`}
          >
            <Check className="h-4 w-4" /> Marcar hecho
          </button>
          <button
            type="button"
            disabled={pending}
            onClick={() => run(panelSetStatusAction, "Turno marcado como ausente", { status: "no_show" })}
            className={`${btn} bg-amber-400/15 text-amber-300 hover:bg-amber-400/25`}
          >
            <X className="h-4 w-4" /> Ausente
          </button>
          <button
            type="button"
            disabled={pending}
            onClick={() => run(panelSetStatusAction, "Turno cancelado", { status: "cancelada" })}
            className={`${btn} bg-rose-500/15 text-rose-400 hover:bg-rose-500/25`}
          >
            <Ban className="h-4 w-4" /> Cancelar turno
          </button>
        </>
      )}
      {finalizado && <span className="text-sm text-muted-foreground">Este turno ya está {statusLabel(r.status).toLowerCase()}.</span>}
    </div>
  );

  return (
    <Drawer
      open={open}
      title={`Turno · ${r.customerName}`}
      subtitle={`${r.dateLabel} · ${r.time} hs`}
      onClose={onClose}
      onPrev={canPrev ? () => onNavigate(items[idx - 1]) : undefined}
      onNext={canNext ? () => onNavigate(items[idx + 1]) : undefined}
      canPrev={canPrev}
      canNext={canNext}
      navLabel={idx >= 0 ? `${idx + 1} / ${items.length}` : undefined}
      footer={actions}
    >
      <Info label="Cliente">{r.customerName}</Info>
      <Info label="Teléfono">{r.customerPhone || "—"}</Info>
      <Info label="Barbero">{r.barberName}</Info>
      <Info label="Servicio">{r.serviceName}</Info>
      <Info label="Fecha y hora">{r.dateLabel} · {r.time} hs</Info>
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
        <Info label="Métodos">
          {[r.depositMethod && `Seña: ${METODO[r.depositMethod]}`, r.balanceMethod && `Saldo: ${METODO[r.balanceMethod]}`]
            .filter(Boolean)
            .join(" · ") || "—"}
        </Info>
      )}
    </Drawer>
  );
}
