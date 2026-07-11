/**
 * Motor de disponibilidad: genera los horarios disponibles de un barbero para
 * un servicio y una fecha, respetando horario laboral, corte de mediodía,
 * duración del servicio, buffer entre turnos, anticipación mínima y los turnos
 * ya tomados (holds no vencidos + confirmados).
 */
import { DECISIONS } from "@/shared/config/decisions";
import { activeAppointmentsForBarber, getService, workingHoursFor, workingHoursForBarber } from "@/shared/api/store";
import { addDays, arDateTime, hhmmToMin, minToHHMM, nowMs, todayAR, weekdayOf } from "@/shared/lib/time";

export interface Slot {
  hhmm: string;
  startISO: string;
}

export async function availableSlots(barberId: string, serviceId: string, dateStr: string): Promise<Slot[]> {
  const svc = await getService(serviceId);
  if (!svc) return [];
  const wh = await workingHoursFor(barberId, weekdayOf(dateStr));
  if (!wh) return []; // día no laborable de ese barbero

  const openMin = hhmmToMin(wh.open);
  const closeMin = hhmmToMin(wh.close);
  const breakStart = wh.breakStart ? hhmmToMin(wh.breakStart) : null;
  const breakEnd = wh.breakEnd ? hhmmToMin(wh.breakEnd) : null;

  const dur = svc.durationMin;
  const bufferMs = DECISIONS.bufferMinutes * 60_000;
  const step = Math.max(60, svc.durationMin); // un turno por hora (o por la duración si es más larga)
  const leadMs = DECISIONS.leadTimeMinutes * 60_000;
  const now = nowMs();

  const active = (await activeAppointmentsForBarber(barberId)).map((a) => ({
    s: Date.parse(a.start),
    e: Date.parse(a.end),
  }));

  const slots: Slot[] = [];
  for (let m = openMin; m + dur <= closeMin; m += step) {
    const slotEndMin = m + dur;

    // Se pisa con el corte de mediodía
    if (breakStart !== null && breakEnd !== null && m < breakEnd && slotEndMin > breakStart) continue;

    const startD = arDateTime(dateStr, minToHHMM(m));
    const startMs = startD.getTime();
    const endMs = startMs + dur * 60_000;

    // Anticipación mínima
    if (startMs < now + leadMs) continue;

    // Solape con turnos existentes (con buffer a ambos lados)
    const conflict = active.some((a) => startMs < a.e + bufferMs && a.s - bufferMs < endMs);
    if (conflict) continue;

    slots.push({ hhmm: minToHHMM(m), startISO: startD.toISOString() });
  }
  return slots;
}

export interface DaySlot {
  hhmm: string;
  startISO: string;
  available: boolean; // false = ocupado o ya pasó
}

/** Grilla completa del día: muestra TODOS los slots, marcando ocupados vs libres. */
export async function daySlotGrid(barberId: string, serviceId: string, dateStr: string): Promise<DaySlot[]> {
  const svc = await getService(serviceId);
  if (!svc) return [];
  const wh = await workingHoursFor(barberId, weekdayOf(dateStr));
  if (!wh) return [];

  const openMin = hhmmToMin(wh.open);
  const closeMin = hhmmToMin(wh.close);
  const breakStart = wh.breakStart ? hhmmToMin(wh.breakStart) : null;
  const breakEnd = wh.breakEnd ? hhmmToMin(wh.breakEnd) : null;
  const dur = svc.durationMin;
  const bufferMs = DECISIONS.bufferMinutes * 60_000;
  const step = Math.max(60, svc.durationMin); // un turno por hora (o por la duración si es más larga)
  const leadMs = DECISIONS.leadTimeMinutes * 60_000;
  const now = nowMs();

  const active = (await activeAppointmentsForBarber(barberId)).map((a) => ({ s: Date.parse(a.start), e: Date.parse(a.end) }));
  const grid: DaySlot[] = [];
  for (let m = openMin; m + dur <= closeMin; m += step) {
    const slotEndMin = m + dur;
    if (breakStart !== null && breakEnd !== null && m < breakEnd && slotEndMin > breakStart) continue; // corte mediodía
    const startD = arDateTime(dateStr, minToHHMM(m));
    const startMs = startD.getTime();
    const endMs = startMs + dur * 60_000;
    const past = startMs < now + leadMs;
    const conflict = active.some((a) => startMs < a.e + bufferMs && a.s - bufferMs < endMs);
    grid.push({ hhmm: minToHHMM(m), startISO: startD.toISOString(), available: !past && !conflict });
  }
  return grid;
}

/** Cantidad de horarios disponibles por día en el horizonte (para el calendario).
 *  `closed` = el barbero NO trabaja ese día (para distinguirlo de "lleno"). */
export async function horizonAvailability(
  barberId: string,
  serviceId: string,
): Promise<{ date: string; count: number; closed: boolean }[]> {
  const dates = horizonDates();
  const wh = await workingHoursForBarber(barberId);
  const workDays = new Set(wh.map((w) => w.weekday));
  const counts = await Promise.all(dates.map((d) => availableSlots(barberId, serviceId, d)));
  return dates.map((date, i) => ({
    date,
    count: counts[i].length,
    closed: !workDays.has(weekdayOf(date)),
  }));
}

/** ¿Tiene el barbero al menos un slot disponible en el horizonte? */
export async function hasAvailabilityInHorizon(barberId: string, serviceId: string): Promise<boolean> {
  const start = todayAR();
  for (let i = 0; i <= DECISIONS.horizonDays; i++) {
    if ((await availableSlots(barberId, serviceId, addDays(start, i))).length > 0) return true;
  }
  return false;
}

/** Lista de fechas "YYYY-MM-DD" del horizonte de reserva (desde hoy). */
export function horizonDates(): string[] {
  const start = todayAR();
  return Array.from({ length: DECISIONS.horizonDays + 1 }, (_, i) => addDays(start, i));
}
