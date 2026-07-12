import type { BadgeTone } from "@/shared/ui/panel-kit";
import type { AppointmentStatus } from "@/shared/model/types";

// Fila de turno para las tablas del panel (proyección serializable).
export type TurnoRow = {
  id: string;
  startMs: number;
  dateValue: string;
  dateLabel: string;
  time: string;
  customerName: string;
  customerPhone: string;
  notes: string;
  barberId: string;
  barberName: string;
  serviceId: string;
  serviceName: string;
  priceCents: number;
  depositCents: number;
  balanceCents: number;
  depositMethod: string | null;
  depositStatus: "pendiente" | "pagado";
  balanceMethod: string | null;
  balanceStatus: "pendiente" | "pagado";
  status: AppointmentStatus;
};

export const METODO: Record<string, string> = { mercadopago: "MercadoPago", efectivo: "Efectivo" };

export const ESTADOS: { v: AppointmentStatus; l: string }[] = [
  { v: "confirmada", l: "Confirmado" },
  { v: "en_curso", l: "En el sillón" },
  { v: "completada", l: "Completado" },
  { v: "no_show", l: "Ausente" },
  { v: "cancelada", l: "Cancelado" },
];

export const STATUS_TONE: Record<AppointmentStatus, BadgeTone> = {
  hold: "amber",
  confirmada: "cyan",
  en_curso: "cyan",
  completada: "green",
  no_show: "amber",
  cancelada: "red",
  expirada: "gray",
};

export function statusLabel(s: AppointmentStatus): string {
  return ESTADOS.find((e) => e.v === s)?.l ?? s;
}
