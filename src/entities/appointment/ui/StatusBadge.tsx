import type { AppointmentStatus } from "@/shared/model/types";

const MAP: Record<AppointmentStatus, { label: string; cls: string }> = {
  hold: { label: "Pago pendiente", cls: "bg-amber-500/15 text-amber-700 dark:bg-amber-400/15 dark:text-amber-300" },
  confirmada: { label: "Confirmado", cls: "bg-teal-600/12 text-teal-700 dark:bg-flow-cyan/15 dark:text-flow-cyan" },
  en_curso: { label: "En el sillón", cls: "bg-teal-600/20 text-teal-700 dark:bg-flow-cyan/25 dark:text-flow-cyan" },
  completada: { label: "Completado", cls: "bg-muted text-muted-foreground" },
  no_show: { label: "Ausente", cls: "bg-rose-600/12 text-rose-700 dark:bg-flow-red/15 dark:text-flow-red" },
  cancelada: { label: "Cancelado", cls: "bg-muted text-muted-foreground line-through" },
  expirada: { label: "Expirado", cls: "bg-muted text-muted-foreground" },
};

export function StatusBadge({ status }: { status: AppointmentStatus }) {
  const s = MAP[status];
  return (
    <span className={`rounded-full px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-wide ${s.cls}`}>
      {s.label}
    </span>
  );
}
