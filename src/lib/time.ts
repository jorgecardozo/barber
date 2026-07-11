/**
 * Utilidades de tiempo, todo anclado a la zona horaria de Argentina.
 * Argentina no usa horario de verano → offset fijo -03:00 (documentado en
 * DECISIONS.tzOffset). En producción con Supabase se persiste timestamptz UTC
 * y se computa con la zona IANA; acá usamos el offset fijo para la simulación.
 */
import { DECISIONS } from "./decisions";

const OFF = DECISIONS.tzOffset; // "-03:00"
const TZ = DECISIONS.timezone;

export function nowMs(): number {
  return Date.now();
}

/** "YYYY-MM-DD" de hoy en Argentina. */
export function todayAR(): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: TZ,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

/** Suma n días a una fecha "YYYY-MM-DD". */
export function addDays(dateStr: string, n: number): string {
  const d = new Date(dateStr + "T12:00:00Z");
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}

/** Día de la semana de una fecha "YYYY-MM-DD" (0=Dom … 6=Sáb). */
export function weekdayOf(dateStr: string): number {
  return new Date(dateStr + "T12:00:00Z").getUTCDay();
}

/** Construye un Date desde fecha local AR + "HH:MM". */
export function arDateTime(dateStr: string, hhmm: string): Date {
  return new Date(`${dateStr}T${hhmm}:00${OFF}`);
}

export function hhmmToMin(hhmm: string): number {
  const [h, m] = hhmm.split(":").map(Number);
  return h * 60 + m;
}

export function minToHHMM(min: number): string {
  const h = Math.floor(min / 60);
  const m = min % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

/** "HH:MM" de un Date, en hora de Argentina. */
export function fmtTime(d: Date): string {
  return new Intl.DateTimeFormat("es-AR", {
    timeZone: TZ,
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(d);
}

/** "lunes 16 de junio" desde "YYYY-MM-DD". */
export function fmtDateLong(dateStr: string): string {
  const d = new Date(dateStr + "T12:00:00Z");
  return new Intl.DateTimeFormat("es-AR", {
    timeZone: "UTC",
    weekday: "long",
    day: "numeric",
    month: "long",
  }).format(d);
}

/** "lun 16/6" corto desde "YYYY-MM-DD". */
export function fmtDateShort(dateStr: string): { weekday: string; day: string } {
  const d = new Date(dateStr + "T12:00:00Z");
  const weekday = new Intl.DateTimeFormat("es-AR", {
    timeZone: "UTC",
    weekday: "short",
  }).format(d);
  const day = new Intl.DateTimeFormat("es-AR", {
    timeZone: "UTC",
    day: "numeric",
    month: "numeric",
  }).format(d);
  return { weekday, day };
}
