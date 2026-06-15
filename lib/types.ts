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
  active: boolean; // el admin lo activa; inactivo = no aparece para reservar
  userId?: string; // usuario (rol barbero) dueño de este perfil
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
  | "en_curso"
  | "completada"
  | "no_show"
  | "cancelada"
  | "expirada";

export type PaymentMethod = "mercadopago" | "efectivo";
export type PaymentKind = "sena" | "saldo";
export type PaymentState = "pendiente" | "pagado";

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
  // Pago de la seña
  depositMethod: PaymentMethod | null;
  depositStatus: PaymentState;
  // Pago del saldo (lo que se paga en el local)
  balanceMethod: PaymentMethod | null;
  balanceStatus: PaymentState;
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
  avatarUrl?: string; // avatar personalizado (DiceBear)
}

export interface Payment {
  id: string;
  appointmentId: string;
  barberId: BarberId;
  kind: PaymentKind; // seña o saldo
  method: PaymentMethod; // mercadopago o efectivo
  amountCents: number;
  createdAt: string;
}
