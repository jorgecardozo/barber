import type { AppointmentStatus } from "@/lib/types";

const MAP: Record<AppointmentStatus, { label: string; cls: string }> = {
  hold: { label: "Pago pendiente", cls: "bg-amber-400/15 text-amber-300" },
  confirmada: { label: "Confirmado", cls: "bg-flow-cyan/15 text-flow-cyan" },
  en_curso: { label: "En el sillón", cls: "bg-flow-cyan/25 text-flow-cyan" },
  completada: { label: "Completado", cls: "bg-white/10 text-ash" },
  no_show: { label: "Ausente", cls: "bg-flow-red/15 text-flow-red" },
  cancelada: { label: "Cancelado", cls: "bg-white/5 text-ash line-through" },
  expirada: { label: "Expirado", cls: "bg-white/5 text-ash" },
};

export function StatusBadge({ status }: { status: AppointmentStatus }) {
  const s = MAP[status];
  return (
    <span className={`rounded-full px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-wide ${s.cls}`}>
      {s.label}
    </span>
  );
}
