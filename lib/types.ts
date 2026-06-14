/** Tipos de dominio de la app de turnos. */

export type ServiceId = string;
export type BarberId = string;

export interface Service {
  id: ServiceId;
  name: string;
  description: string;
  priceCents: number;
  durationMin: number;
  depositPct: number;
  featured?: boolean;
}

export interface Barber {
  id: BarberId;
  name: string;
  role: string;
  specialty: string;
  img: string;
  serviceIds: ServiceId[];
}

/** Horario laboral de un barbero para un día de la semana (0=Dom … 6=Sáb). */
export interface WorkingHours {
  barberId: BarberId;
  weekday: number;
  open: string; // "HH:MM"
  close: string; // "HH:MM"
  breakStart?: string;
  breakEnd?: string;
}

export type AppointmentStatus =
  | "hold"
  | "confirmada"
  | "completada"
  | "no_show"
  | "cancelada"
  | "expirada";

export interface Appointment {
  id: string;
  serviceId: ServiceId;
  barberId: BarberId;
  customerId: string | null;
  customerName: string;
  customerPhone: string;
  start: string; // ISO con offset -03:00
  end: string; // ISO con offset -03:00
  status: AppointmentStatus;
  priceCents: number;
  depositCents: number;
  holdExpiresAt: string | null; // ISO, solo en estado "hold"
  paymentId: string | null;
  createdAt: string;
}

export type Role = "cliente" | "barbero" | "admin";

export interface User {
  id: string;
  email: string;
  name: string;
  phone: string;
  password: string; // ⚠️ simulado en texto plano; en prod = Supabase Auth (hash)
  role: Role;
  barberId?: BarberId;
}

export interface Payment {
  id: string;
  appointmentId: string;
  amountCents: number;
  status: "pendiente" | "aprobado" | "rechazado" | "expirado";
  createdAt: string;
}
