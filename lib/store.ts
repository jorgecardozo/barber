/**
 * CAPA DE DATOS — Supabase (Postgres) vía service_role (server-only).
 *
 * Reemplaza al store en memoria. Cada función mapea filas del esquema
 * (supabase/migrations) a los tipos de la app (lib/types.ts), así el resto de
 * la app no cambia. La autorización la imponen las server actions
 * (requireStaff / getSessionUser) antes de llamar acá; la RLS protege la API
 * pública. El anti-doble-reserva lo hace la DB (EXCLUDE no_double_booking):
 * un insert que solapa devuelve 23P01 → lo traducimos a SlotTakenError.
 */
import { supabaseAdmin as sb } from "./supabase/admin";
import { depositForPrice } from "./decisions";
import { hhmmToMin, minToHHMM, nowMs } from "./time";
import type { Appointment, Barber, Payment, PaymentMethod, Service, User, WorkingHours } from "./types";

// estados que "ocupan" agenda (mismo conjunto que el EXCLUDE / slots_publicos + en_curso)
const OCCUPYING = ["hold", "confirmada", "en_curso", "completada", "no_show"] as const;

// ---------- mapeos fila → tipo de la app ----------
type Row = Record<string, unknown>;

function mapService(r: Row): Service {
  return {
    id: r.id as string,
    name: r.name as string,
    description: (r.description as string) ?? "",
    priceCents: r.price_cents as number,
    durationMin: r.duration_min as number,
    depositPct: r.deposit_pct as number,
    featured: (r.is_featured as boolean) || undefined,
  };
}

function mapBarber(r: Row): Barber {
  const bs = (r.barber_services as { service_id: string }[] | undefined) ?? [];
  return {
    id: r.id as string,
    name: r.name as string,
    role: (r.role_label as string) ?? "Barbero",
    specialty: (r.specialty as string) ?? "",
    img: (r.img_url as string) ?? "/barbers/br1.jpg",
    serviceIds: bs.map((x) => x.service_id),
    active: r.is_active as boolean,
    userId: (r.profile_id as string) ?? undefined,
  };
}

function mapAppt(r: Row): Appointment {
  const pays = (r.payments as { kind: string; method: string | null; status: string }[] | undefined) ?? [];
  const sena = pays.find((p) => p.kind === "sena");
  const saldo = pays.find((p) => p.kind === "saldo");
  const prof = r.profiles as { full_name?: string; phone?: string } | null;
  const status = r.status as Appointment["status"];
  return {
    id: r.id as string,
    serviceId: r.service_id as string,
    barberId: r.barber_id as string,
    customerId: (r.customer_id as string) ?? null,
    customerName: (r.customer_name_snapshot as string) || prof?.full_name || "Cliente",
    customerPhone: (r.customer_phone_snapshot as string) || prof?.phone || "",
    customerNotes: (r.customer_notes as string) ?? "",
    start: r.starts_at as string,
    end: r.ends_at as string,
    status,
    priceCents: r.price_cents as number,
    depositCents: r.deposit_cents as number,
    holdExpiresAt: status === "hold" ? (r.hold_expires_at as string) : null,
    depositMethod: (sena?.method as PaymentMethod) ?? null,
    depositStatus: sena?.status === "approved" ? "pagado" : "pendiente",
    balanceMethod: (saldo?.method as PaymentMethod) ?? null,
    balanceStatus: saldo?.status === "approved" ? "pagado" : "pendiente",
    createdAt: (r.created_at as string) ?? (r.starts_at as string),
  };
}

const APPT_SEL =
  "id,service_id,barber_id,customer_id,customer_name_snapshot,customer_phone_snapshot,customer_notes,starts_at,ends_at,status,price_cents,deposit_cents,hold_expires_at,created_at,profiles:customer_id(full_name,phone),payments(kind,method,status)";
const BARBER_SEL = "id,name,role_label,specialty,img_url,is_active,profile_id,sort_order,barber_services(service_id)";
const SERVICE_SEL = "id,name,description,price_cents,duration_min,deposit_pct,is_featured,is_active,sort_order,slug";

class StoreError extends Error {}
export class SlotTakenError extends Error {
  constructor() {
    super("Ese horario ya fue tomado. Elegí otro.");
    this.name = "SlotTakenError";
  }
}
function isExclusion(error: { code?: string } | null): boolean {
  return error?.code === "23P01";
}

// ---------- Catálogo (lecturas) ----------
export async function listServices(): Promise<Service[]> {
  const { data } = await sb.from("services").select(SERVICE_SEL).eq("is_active", true).order("sort_order");
  return (data ?? []).map(mapService);
}
export async function getService(id: string): Promise<Service | undefined> {
  const { data } = await sb.from("services").select(SERVICE_SEL).eq("id", id).maybeSingle();
  return data ? mapService(data) : undefined;
}
export async function listBarbers(): Promise<Barber[]> {
  const { data } = await sb.from("barbers").select(BARBER_SEL).order("sort_order");
  return (data ?? []).map(mapBarber);
}
export async function getBarber(id: string): Promise<Barber | undefined> {
  const { data } = await sb.from("barbers").select(BARBER_SEL).eq("id", id).maybeSingle();
  return data ? mapBarber(data) : undefined;
}
export async function barbersForService(serviceId: string): Promise<Barber[]> {
  return (await listBarbers()).filter((b) => b.active && b.serviceIds.includes(serviceId));
}
export async function getBarberByUserId(userId: string): Promise<Barber | undefined> {
  const { data } = await sb.from("barbers").select(BARBER_SEL).eq("profile_id", userId).maybeSingle();
  return data ? mapBarber(data) : undefined;
}
export async function listPendingBarbers(): Promise<Barber[]> {
  return (await listBarbers()).filter((b) => !b.active);
}

// ---------- Horarios (colapsa franjas start_min/end_min → open/close/break) ----------
function collapseDay(barberId: string, weekday: number, franjas: { start_min: number; end_min: number }[]): WorkingHours {
  const sorted = [...franjas].sort((a, b) => a.start_min - b.start_min);
  const open = minToHHMM(sorted[0].start_min);
  const close = minToHHMM(sorted[sorted.length - 1].end_min);
  let breakStart: string | undefined;
  let breakEnd: string | undefined;
  for (let i = 0; i < sorted.length - 1; i++) {
    if (sorted[i].end_min < sorted[i + 1].start_min) {
      breakStart = minToHHMM(sorted[i].end_min);
      breakEnd = minToHHMM(sorted[i + 1].start_min);
      break;
    }
  }
  return { barberId, weekday, open, close, breakStart, breakEnd };
}
export async function workingHoursForBarber(barberId: string): Promise<WorkingHours[]> {
  const { data } = await sb
    .from("working_hours")
    .select("weekday,start_min,end_min")
    .eq("barber_id", barberId)
    .eq("is_active", true);
  const byDay = new Map<number, { start_min: number; end_min: number }[]>();
  for (const r of data ?? []) {
    const wd = r.weekday as number;
    if (!byDay.has(wd)) byDay.set(wd, []);
    byDay.get(wd)!.push({ start_min: r.start_min as number, end_min: r.end_min as number });
  }
  return [...byDay.entries()].map(([wd, franjas]) => collapseDay(barberId, wd, franjas));
}
export async function workingHoursFor(barberId: string, weekday: number): Promise<WorkingHours | undefined> {
  return (await workingHoursForBarber(barberId)).find((w) => w.weekday === weekday);
}
export async function setWorkingHours(barberId: string, hours: Omit<WorkingHours, "barberId">[]): Promise<void> {
  await sb.from("working_hours").delete().eq("barber_id", barberId);
  const rows: Row[] = [];
  for (const h of hours) {
    const open = hhmmToMin(h.open);
    const close = hhmmToMin(h.close);
    const bs = h.breakStart ? hhmmToMin(h.breakStart) : null;
    const be = h.breakEnd ? hhmmToMin(h.breakEnd) : null;
    if (bs != null && be != null && bs > open && be < close && be > bs) {
      rows.push({ barber_id: barberId, weekday: h.weekday, start_min: open, end_min: bs, is_active: true });
      rows.push({ barber_id: barberId, weekday: h.weekday, start_min: be, end_min: close, is_active: true });
    } else {
      rows.push({ barber_id: barberId, weekday: h.weekday, start_min: open, end_min: close, is_active: true });
    }
  }
  if (rows.length) await sb.from("working_hours").insert(rows);
}

// ---------- ABM: servicios ----------
function slugify(name: string): string {
  return name.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}
export async function createService(input: Omit<Service, "id">): Promise<Service> {
  const slug = slugify(input.name) || `svc-${Date.now()}`;
  const { data, error } = await sb
    .from("services")
    .insert({ slug, name: input.name, description: input.description, price_cents: input.priceCents, duration_min: input.durationMin, deposit_pct: input.depositPct, is_featured: input.featured ?? false })
    .select(SERVICE_SEL)
    .single();
  if (error) throw new StoreError(error.message);
  // todos los barberos lo ofrecen por defecto
  const { data: barbers } = await sb.from("barbers").select("id");
  if (barbers?.length) {
    await sb.from("barber_services").insert(barbers.map((b) => ({ barber_id: b.id, service_id: data.id }))).select();
  }
  return mapService(data);
}
export async function updateService(id: string, patch: Partial<Omit<Service, "id">>): Promise<Service> {
  const upd: Row = {};
  if (patch.name !== undefined) upd.name = patch.name;
  if (patch.description !== undefined) upd.description = patch.description;
  if (patch.priceCents !== undefined) upd.price_cents = patch.priceCents;
  if (patch.durationMin !== undefined) upd.duration_min = patch.durationMin;
  if (patch.depositPct !== undefined) upd.deposit_pct = patch.depositPct;
  if (patch.featured !== undefined) upd.is_featured = patch.featured;
  const { data, error } = await sb.from("services").update(upd).eq("id", id).select(SERVICE_SEL).single();
  if (error) throw new StoreError(error.message);
  return mapService(data);
}
export async function deleteService(id: string): Promise<void> {
  // soft-delete: appointments referencian service_id (on delete restrict)
  await sb.from("services").update({ is_active: false }).eq("id", id);
}

// ---------- ABM: barberos ----------
export async function createBarber(input: { name: string; specialty: string; img?: string; active?: boolean; userId?: string; role?: string }): Promise<Barber> {
  const { data, error } = await sb
    .from("barbers")
    .insert({ name: input.name, specialty: input.specialty || "Barbería", img_url: input.img, role_label: input.role ?? "Barbero", is_active: input.active ?? false, profile_id: input.userId })
    .select("id")
    .single();
  if (error) throw new StoreError(error.message);
  // ofrece todos los servicios + horario por defecto 10–20 con corte 13–14
  const { data: services } = await sb.from("services").select("id").eq("is_active", true);
  if (services?.length) await sb.from("barber_services").insert(services.map((s) => ({ barber_id: data.id, service_id: s.id })));
  const wh: Row[] = [];
  for (const wd of [0, 1, 2, 3, 4, 5, 6]) {
    wh.push({ barber_id: data.id, weekday: wd, start_min: 600, end_min: 780, is_active: true });
    wh.push({ barber_id: data.id, weekday: wd, start_min: 840, end_min: 1200, is_active: true });
  }
  await sb.from("working_hours").insert(wh);
  return (await getBarber(data.id))!;
}
export async function updateBarber(id: string, patch: Partial<Pick<Barber, "name" | "specialty" | "img" | "role">>): Promise<Barber> {
  const upd: Row = {};
  if (patch.name !== undefined) upd.name = patch.name;
  if (patch.specialty !== undefined) upd.specialty = patch.specialty;
  if (patch.img !== undefined) upd.img_url = patch.img;
  if (patch.role !== undefined) upd.role_label = patch.role;
  const { error } = await sb.from("barbers").update(upd).eq("id", id);
  if (error) throw new StoreError(error.message);
  return (await getBarber(id))!;
}
export async function setBarberActive(id: string, active: boolean): Promise<Barber> {
  await sb.from("barbers").update({ is_active: active }).eq("id", id);
  return (await getBarber(id))!;
}

// ---------- Disponibilidad / turnos ----------
export async function activeAppointmentsForBarber(barberId: string): Promise<Appointment[]> {
  const nowIso = new Date(nowMs()).toISOString();
  const { data } = await sb
    .from("appointments")
    .select(APPT_SEL)
    .eq("barber_id", barberId)
    .in("status", OCCUPYING as unknown as string[]);
  return (data ?? [])
    .map(mapAppt)
    .filter((a) => a.status !== "hold" || (a.holdExpiresAt != null && a.holdExpiresAt > nowIso));
}
export async function expireHolds(): Promise<number> {
  const nowIso = new Date(nowMs()).toISOString();
  const { data } = await sb
    .from("appointments")
    .update({ status: "expirada" })
    .eq("status", "hold")
    .lte("hold_expires_at", nowIso)
    .select("id");
  return data?.length ?? 0;
}

export async function getAppointment(id: string): Promise<Appointment | undefined> {
  const { data } = await sb.from("appointments").select(APPT_SEL).eq("id", id).maybeSingle();
  return data ? mapAppt(data) : undefined;
}

async function insertAppointment(row: Row): Promise<Appointment> {
  const { data, error } = await sb.from("appointments").insert(row).select(APPT_SEL).single();
  if (isExclusion(error)) throw new SlotTakenError();
  if (error) throw new StoreError(error.message);
  return mapAppt(data);
}
async function insertPayment(appointmentId: string, kind: "sena" | "saldo", method: PaymentMethod, amountCents: number, status: "approved" | "pending" = "approved"): Promise<void> {
  await sb.from("payments").insert({
    appointment_id: appointmentId,
    amount_cents: amountCents,
    kind,
    method,
    status,
    is_current: false,
    paid_at: status === "approved" ? new Date().toISOString() : null,
  });
}

export async function createHold(input: {
  serviceId: string;
  barberId: string;
  startISO: string;
  depositMethod: PaymentMethod;
  customerId: string | null;
  customerName: string;
  customerPhone: string;
}): Promise<Appointment> {
  const svc = await getService(input.serviceId);
  if (!svc) throw new StoreError("Servicio inexistente");
  const start = new Date(input.startISO);
  const end = new Date(start.getTime() + svc.durationMin * 60_000);
  return insertAppointment({
    customer_id: input.customerId,
    customer_name_snapshot: input.customerId ? null : input.customerName,
    customer_phone_snapshot: input.customerId ? null : input.customerPhone,
    barber_id: input.barberId,
    service_id: svc.id,
    service_name_snapshot: svc.name,
    duration_min_snapshot: svc.durationMin,
    starts_at: start.toISOString(),
    ends_at: end.toISOString(),
    status: "hold",
    price_cents: svc.priceCents,
    deposit_cents: depositForPrice(svc.priceCents),
    hold_expires_at: new Date(nowMs() + 12 * 60_000).toISOString(),
  });
}

export async function payDepositMercadoPago(id: string): Promise<Appointment> {
  const appt = await getAppointment(id);
  if (!appt) throw new StoreError("Turno inexistente");
  if (appt.status === "confirmada") return appt;
  if (appt.status !== "hold") throw new StoreError("El turno ya no está disponible.");
  if (appt.holdExpiresAt && Date.parse(appt.holdExpiresAt) <= nowMs()) {
    await sb.from("appointments").update({ status: "expirada" }).eq("id", id);
    throw new StoreError("La reserva expiró. Volvé a empezar.");
  }
  await sb.from("appointments").update({ status: "confirmada" }).eq("id", id);
  await insertPayment(id, "sena", "mercadopago", appt.depositCents, "approved");
  return (await getAppointment(id))!;
}
export async function confirmDepositEfectivo(id: string): Promise<Appointment> {
  const appt = await getAppointment(id);
  if (!appt) throw new StoreError("Turno inexistente");
  if (appt.status === "confirmada") return appt;
  if (appt.status !== "hold") throw new StoreError("El turno ya no está disponible.");
  await sb.from("appointments").update({ status: "confirmada" }).eq("id", id);
  await insertPayment(id, "sena", "efectivo", appt.depositCents, "pending");
  return (await getAppointment(id))!;
}
export async function registrarSenaEfectivo(id: string): Promise<Appointment> {
  const appt = await getAppointment(id);
  if (!appt) throw new StoreError("Turno inexistente");
  if (appt.depositStatus === "pagado") return appt;
  const { data: existing } = await sb.from("payments").select("id").eq("appointment_id", id).eq("kind", "sena").maybeSingle();
  if (existing) {
    await sb.from("payments").update({ status: "approved", method: "efectivo", paid_at: new Date().toISOString() }).eq("id", existing.id);
  } else {
    await insertPayment(id, "sena", "efectivo", appt.depositCents, "approved");
  }
  return (await getAppointment(id))!;
}
export async function registrarSaldo(id: string, method: PaymentMethod): Promise<Appointment> {
  const appt = await getAppointment(id);
  if (!appt) throw new StoreError("Turno inexistente");
  if (appt.balanceStatus === "pagado") return appt;
  await insertPayment(id, "saldo", method, appt.priceCents - appt.depositCents, "approved");
  return (await getAppointment(id))!;
}

export async function createWalkIn(input: {
  serviceId: string;
  barberId: string;
  startISO: string;
  customerName: string;
  customerPhone: string;
  depositMethod: PaymentMethod;
  depositPaid: boolean;
}): Promise<Appointment> {
  const svc = await getService(input.serviceId);
  if (!svc) throw new StoreError("Servicio inexistente");
  const start = new Date(input.startISO);
  const end = new Date(start.getTime() + svc.durationMin * 60_000);
  const appt = await insertAppointment({
    customer_id: null,
    customer_name_snapshot: input.customerName || "Walk-in",
    customer_phone_snapshot: input.customerPhone,
    barber_id: input.barberId,
    service_id: svc.id,
    service_name_snapshot: svc.name,
    duration_min_snapshot: svc.durationMin,
    starts_at: start.toISOString(),
    ends_at: end.toISOString(),
    status: "confirmada",
    price_cents: svc.priceCents,
    deposit_cents: depositForPrice(svc.priceCents),
    hold_expires_at: new Date().toISOString(),
  });
  if (input.depositPaid) await insertPayment(appt.id, "sena", input.depositMethod, appt.depositCents, "approved");
  return appt;
}

export async function cancelAppointment(id: string): Promise<Appointment> {
  await sb.from("appointments").update({ status: "cancelada", cancelled_at: new Date().toISOString() }).eq("id", id);
  return (await getAppointment(id))!;
}
export async function setAppointmentStatus(id: string, status: Appointment["status"]): Promise<Appointment> {
  await sb.from("appointments").update({ status }).eq("id", id);
  return (await getAppointment(id))!;
}

// Edita los datos del cliente del turno (snapshot) + notas. No toca
// barbero/servicio/horario (eso lo gobierna la reserva y el anti-solape).
export async function updateAppointmentCustomer(
  id: string,
  input: { customerName: string; customerPhone: string; notes?: string },
): Promise<Appointment> {
  await sb
    .from("appointments")
    .update({
      customer_name_snapshot: input.customerName,
      customer_phone_snapshot: input.customerPhone,
      customer_notes: input.notes ?? null,
    })
    .eq("id", id);
  return (await getAppointment(id))!;
}

// ---------- Consultas cliente / panel ----------
export async function appointmentsForCustomer(customerId: string): Promise<Appointment[]> {
  const { data } = await sb
    .from("appointments")
    .select(APPT_SEL)
    .eq("customer_id", customerId)
    .neq("status", "expirada")
    .order("starts_at", { ascending: false });
  return (data ?? []).map(mapAppt);
}
export async function appointmentsOnDate(dateStr: string): Promise<Appointment[]> {
  const lo = new Date(`${dateStr}T00:00:00-03:00`).toISOString();
  const hi = new Date(`${dateStr}T00:00:00-03:00`);
  hi.setDate(hi.getDate() + 1);
  const { data } = await sb
    .from("appointments")
    .select(APPT_SEL)
    .in("status", ["confirmada", "en_curso", "completada", "no_show"])
    .gte("starts_at", lo)
    .lt("starts_at", hi.toISOString())
    .order("starts_at", { ascending: true });
  return (data ?? []).map(mapAppt);
}
export async function allUpcomingAppointments(): Promise<Appointment[]> {
  const lo = new Date(nowMs() - 86_400_000).toISOString();
  const { data } = await sb
    .from("appointments")
    .select(APPT_SEL)
    .eq("status", "confirmada")
    .gte("starts_at", lo)
    .order("starts_at", { ascending: true });
  return (data ?? []).map(mapAppt);
}
export async function listAllAppointments(): Promise<Appointment[]> {
  const { data } = await sb
    .from("appointments")
    .select(APPT_SEL)
    .not("status", "in", "(hold,expirada)")
    .order("starts_at", { ascending: false });
  return (data ?? []).map(mapAppt);
}
export async function listPayments(): Promise<Payment[]> {
  const { data } = await sb
    .from("payments")
    .select("id,appointment_id,kind,method,amount_cents,paid_at,created_at,status,appointments(barber_id)")
    .eq("status", "approved");
  return (data ?? []).map((r) => {
    const appt = r.appointments as { barber_id?: string } | null;
    return {
      id: r.id as string,
      appointmentId: r.appointment_id as string,
      barberId: (appt?.barber_id as string) ?? "",
      kind: (r.kind as "sena" | "saldo") ?? "sena",
      method: (r.method as PaymentMethod) ?? "efectivo",
      amountCents: r.amount_cents as number,
      createdAt: (r.paid_at as string) ?? (r.created_at as string),
    };
  });
}

// ---------- Usuarios (profiles + auth) ----------
function mapUser(profile: Row, barberId?: string): User {
  return {
    id: profile.id as string,
    email: (profile.email as string) ?? "",
    name: (profile.full_name as string) ?? "",
    phone: (profile.phone as string) ?? "",
    password: "",
    role: profile.role as User["role"],
    barberId,
    avatarUrl: (profile.avatar_url as string) ?? undefined,
  };
}
export async function getUser(id: string): Promise<User | undefined> {
  const { data } = await sb.from("profiles").select("id,email,full_name,phone,role,avatar_url").eq("id", id).maybeSingle();
  if (!data) return undefined;
  let barberId: string | undefined;
  if (data.role === "barbero") {
    const { data: b } = await sb.from("barbers").select("id").eq("profile_id", id).maybeSingle();
    barberId = b?.id;
  }
  return mapUser(data, barberId);
}
export async function findUserByEmail(email: string): Promise<User | undefined> {
  const { data } = await sb.from("profiles").select("id,email,full_name,phone,role,avatar_url").ilike("email", email).maybeSingle();
  return data ? mapUser(data) : undefined;
}
export async function setUserAvatar(userId: string, url: string): Promise<void> {
  await sb.from("profiles").update({ avatar_url: url }).eq("id", userId);
}
