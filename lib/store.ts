/**
 * BACKEND SIMULADO — store en memoria con datos sembrados.
 *
 * ⚠️ Reemplaza temporalmente a Supabase para que la app CORRA sin credenciales.
 * La lógica anti-doble-reserva acá está en código; en producción la hace la
 * base de datos con un EXCLUDE constraint (ver supabase/migrations).
 * El estado vive en globalThis para sobrevivir el hot-reload de Next en dev.
 */
import { DECISIONS, depositForPrice } from "./decisions";
import { arDateTime, addDays, nowMs, todayAR } from "./time";
import type {
  Appointment,
  Barber,
  Payment,
  PaymentMethod,
  Service,
  User,
  WorkingHours,
} from "./types";

// ---------- Catálogo ----------
const SERVICES: Service[] = [
  { id: "corte", name: "Corte clásico", description: "Corte a máquina y tijera, terminación prolija.", priceCents: 600_000, durationMin: 30, depositPct: 40 },
  { id: "corte-barba", name: "Corte + Barba", description: "El combo completo: corte, perfilado y arreglo de barba.", priceCents: 850_000, durationMin: 45, depositPct: 40, featured: true },
  { id: "fade", name: "Degradado (Fade)", description: "Degradado a piel con diseño y definición.", priceCents: 700_000, durationMin: 40, depositPct: 40 },
  { id: "color", name: "Color / Platinado", description: "Decoloración y color al tono que quieras.", priceCents: 1_500_000, durationMin: 90, depositPct: 40 },
  { id: "diseno", name: "Diseño / Líneas", description: "Líneas y diseños freestyle a navaja.", priceCents: 200_000, durationMin: 15, depositPct: 40 },
  { id: "ninos", name: "Corte niños", description: "Para los más chicos, con paciencia y flow.", priceCents: 500_000, durationMin: 30, depositPct: 40 },
];
const ALL_SERVICE_IDS = SERVICES.map((s) => s.id);

const BARBERS: Barber[] = [
  { id: "gavazz", name: "Gavazz", role: "Co-founder & Barbero", specialty: "Fades & diseños", img: "/barbers/br1.jpg", serviceIds: ALL_SERVICE_IDS },
  { id: "thiago", name: "Thiago", role: "Barbero", specialty: "Clásicos & barba", img: "/barbers/br2.jpg", serviceIds: ALL_SERVICE_IDS },
  { id: "lucio", name: "Lucio", role: "Barbero", specialty: "Color & platinados", img: "/barbers/br3.jpg", serviceIds: ALL_SERVICE_IDS },
];

// Abierto todos los días 10–20 con corte 13–14; cada barbero descansa un día.
const DAYS_OFF: Record<string, number> = { gavazz: 0, thiago: 1, lucio: 2 };
const WORKING_HOURS: WorkingHours[] = BARBERS.flatMap((b) =>
  [0, 1, 2, 3, 4, 5, 6]
    .filter((wd) => wd !== DAYS_OFF[b.id])
    .map((wd) => ({ barberId: b.id, weekday: wd, open: "10:00", close: "20:00", breakStart: "13:00", breakEnd: "14:00" })),
);

const SEED_USERS: User[] = [
  { id: "u-admin", email: "admin@flowsite.com", name: "Admin Flow", phone: "5492995550000", password: "admin123", role: "admin" },
  { id: "u-gavazz", email: "gavazz@flowsite.com", name: "Gavazz", phone: "5492995550001", password: "barber123", role: "barbero", barberId: "gavazz" },
  { id: "u-cliente", email: "cliente@demo.com", name: "Cliente Demo", phone: "5492995551234", password: "cliente123", role: "cliente" },
];

// ---------- Seed de turnos + pagos (para que el dashboard tenga números) ----------
type Spec = {
  barberId: string;
  serviceId: string;
  day: number; // offset desde hoy
  hhmm: string;
  name: string;
  status: "completada" | "confirmada";
  senaMethod: PaymentMethod;
  senaPaid: boolean;
  saldoMethod?: PaymentMethod; // solo completadas
};

const SEED_SPECS: Spec[] = [
  // Pasados (completados, seña + saldo cobrados)
  { barberId: "gavazz", serviceId: "corte-barba", day: -1, hhmm: "11:00", name: "Juan P.", status: "completada", senaMethod: "mercadopago", senaPaid: true, saldoMethod: "efectivo" },
  { barberId: "thiago", serviceId: "corte", day: -1, hhmm: "10:30", name: "Brian M.", status: "completada", senaMethod: "efectivo", senaPaid: true, saldoMethod: "efectivo" },
  { barberId: "lucio", serviceId: "fade", day: -1, hhmm: "16:00", name: "Nico G.", status: "completada", senaMethod: "mercadopago", senaPaid: true, saldoMethod: "mercadopago" },
  { barberId: "gavazz", serviceId: "fade", day: -2, hhmm: "12:00", name: "Lucas D.", status: "completada", senaMethod: "mercadopago", senaPaid: true, saldoMethod: "efectivo" },
  { barberId: "thiago", serviceId: "color", day: -2, hhmm: "14:30", name: "Fran T.", status: "completada", senaMethod: "efectivo", senaPaid: true, saldoMethod: "efectivo" },
  { barberId: "lucio", serviceId: "corte-barba", day: -3, hhmm: "11:30", name: "Maxi A.", status: "completada", senaMethod: "mercadopago", senaPaid: true, saldoMethod: "mercadopago" },
  { barberId: "gavazz", serviceId: "corte", day: -3, hhmm: "17:00", name: "Tomi V.", status: "completada", senaMethod: "mercadopago", senaPaid: true, saldoMethod: "efectivo" },
  // Futuros (confirmados, seña cobrada, saldo pendiente)
  { barberId: "gavazz", serviceId: "corte-barba", day: 1, hhmm: "11:00", name: "Mateo R.", status: "confirmada", senaMethod: "mercadopago", senaPaid: true },
  { barberId: "thiago", serviceId: "corte", day: 1, hhmm: "10:30", name: "Agus L.", status: "confirmada", senaMethod: "efectivo", senaPaid: false },
  { barberId: "lucio", serviceId: "color", day: 2, hhmm: "14:00", name: "Ema S.", status: "confirmada", senaMethod: "mercadopago", senaPaid: true },
  { barberId: "gavazz", serviceId: "fade", day: 2, hhmm: "15:30", name: "Santi B.", status: "confirmada", senaMethod: "mercadopago", senaPaid: true },
];

function buildSeed(): { appointments: Appointment[]; payments: Payment[] } {
  const appointments: Appointment[] = [];
  const payments: Payment[] = [];
  let pSeq = 1;
  SEED_SPECS.forEach((spec, i) => {
    const svc = SERVICES.find((s) => s.id === spec.serviceId)!;
    const date = addDays(todayAR(), spec.day);
    const start = arDateTime(date, spec.hhmm);
    const end = new Date(start.getTime() + svc.durationMin * 60_000);
    const depositCents = depositForPrice(svc.priceCents);
    const completed = spec.status === "completada";
    const appt: Appointment = {
      id: `seed-${String(i + 1).padStart(4, "0")}`,
      serviceId: svc.id,
      barberId: spec.barberId,
      customerId: null,
      customerName: spec.name,
      customerPhone: "549299555" + String(1000 + i),
      start: start.toISOString(),
      end: end.toISOString(),
      status: spec.status,
      priceCents: svc.priceCents,
      depositCents,
      holdExpiresAt: null,
      depositMethod: spec.senaMethod,
      depositStatus: spec.senaPaid ? "pagado" : "pendiente",
      balanceMethod: completed ? (spec.saldoMethod ?? "efectivo") : null,
      balanceStatus: completed ? "pagado" : "pendiente",
      createdAt: start.toISOString(),
    };
    appointments.push(appt);
    // Pagos correspondientes
    if (spec.senaPaid) {
      payments.push({ id: `pseed-${pSeq++}`, appointmentId: appt.id, barberId: spec.barberId, kind: "sena", method: spec.senaMethod, amountCents: depositCents, createdAt: start.toISOString() });
    }
    if (completed) {
      payments.push({ id: `pseed-${pSeq++}`, appointmentId: appt.id, barberId: spec.barberId, kind: "saldo", method: spec.saldoMethod ?? "efectivo", amountCents: svc.priceCents - depositCents, createdAt: end.toISOString() });
    }
  });
  return { appointments, payments };
}

// ---------- Store singleton ----------
interface DB {
  services: Service[];
  barbers: Barber[];
  workingHours: WorkingHours[];
  appointments: Appointment[];
  payments: Payment[];
  users: User[];
  seq: number;
}
const g = globalThis as unknown as { __flowDB?: DB };
function db(): DB {
  if (!g.__flowDB) {
    const seed = buildSeed();
    g.__flowDB = {
      services: SERVICES,
      barbers: BARBERS,
      workingHours: WORKING_HOURS,
      appointments: seed.appointments,
      payments: seed.payments,
      users: SEED_USERS,
      seq: 1,
    };
  }
  return g.__flowDB;
}
function nextId(prefix: string): string {
  const d = db();
  d.seq += 1;
  return `${prefix}-${d.seq}-${Math.floor(Math.random() * 1e6)}`;
}

// ---------- Catálogo (lecturas) ----------
export function listServices(): Service[] {
  return db().services;
}
export function getService(id: string): Service | undefined {
  return db().services.find((s) => s.id === id);
}
export function listBarbers(): Barber[] {
  return db().barbers;
}
export function getBarber(id: string): Barber | undefined {
  return db().barbers.find((b) => b.id === id);
}
export function barbersForService(serviceId: string): Barber[] {
  return db().barbers.filter((b) => b.serviceIds.includes(serviceId));
}
export function workingHoursFor(barberId: string, weekday: number): WorkingHours | undefined {
  return db().workingHours.find((w) => w.barberId === barberId && w.weekday === weekday);
}

// ---------- Disponibilidad / holds ----------
export function activeAppointmentsForBarber(barberId: string): Appointment[] {
  const now = nowMs();
  return db().appointments.filter((a) => {
    if (a.barberId !== barberId) return false;
    if (a.status === "confirmada" || a.status === "completada" || a.status === "no_show") return true;
    if (a.status === "hold" && a.holdExpiresAt && Date.parse(a.holdExpiresAt) > now) return true;
    return false;
  });
}
export function expireHolds(): number {
  const now = nowMs();
  let n = 0;
  for (const a of db().appointments) {
    if (a.status === "hold" && a.holdExpiresAt && Date.parse(a.holdExpiresAt) <= now) {
      a.status = "expirada";
      n++;
    }
  }
  return n;
}

function rangesOverlap(aS: number, aE: number, bS: number, bE: number): boolean {
  return aS < bE && bS < aE;
}
export class SlotTakenError extends Error {
  constructor() {
    super("Ese horario ya fue tomado. Elegí otro.");
    this.name = "SlotTakenError";
  }
}

export function createHold(input: {
  serviceId: string;
  barberId: string;
  startISO: string;
  depositMethod: PaymentMethod;
  customerId: string | null;
  customerName: string;
  customerPhone: string;
}): Appointment {
  const svc = getService(input.serviceId);
  if (!svc) throw new Error("Servicio inexistente");
  const start = new Date(input.startISO);
  const end = new Date(start.getTime() + svc.durationMin * 60_000);
  const bufferMs = DECISIONS.bufferMinutes * 60_000;
  const sMs = start.getTime();
  const eMs = end.getTime();
  for (const a of activeAppointmentsForBarber(input.barberId)) {
    if (rangesOverlap(sMs, eMs, Date.parse(a.start) - bufferMs, Date.parse(a.end) + bufferMs)) {
      throw new SlotTakenError();
    }
  }
  const appt: Appointment = {
    id: nextId("turno"),
    serviceId: svc.id,
    barberId: input.barberId,
    customerId: input.customerId,
    customerName: input.customerName,
    customerPhone: input.customerPhone,
    start: start.toISOString(),
    end: end.toISOString(),
    status: "hold",
    priceCents: svc.priceCents,
    depositCents: depositForPrice(svc.priceCents),
    holdExpiresAt: new Date(nowMs() + DECISIONS.holdTtlMinutes * 60_000).toISOString(),
    depositMethod: input.depositMethod,
    depositStatus: "pendiente",
    balanceMethod: null,
    balanceStatus: "pendiente",
    createdAt: new Date().toISOString(),
  };
  db().appointments.push(appt);
  return appt;
}

export function getAppointment(id: string): Appointment | undefined {
  return db().appointments.find((a) => a.id === id);
}

function pushPayment(appt: Appointment, kind: "sena" | "saldo", method: PaymentMethod, amountCents: number): void {
  db().payments.push({
    id: nextId("pago"),
    appointmentId: appt.id,
    barberId: appt.barberId,
    kind,
    method,
    amountCents,
    createdAt: new Date().toISOString(),
  });
}

/** Seña pagada por MercadoPago (simulado) → confirma. */
export function payDepositMercadoPago(id: string): Appointment {
  const appt = getAppointment(id);
  if (!appt) throw new Error("Turno inexistente");
  if (appt.status === "confirmada") return appt;
  if (appt.status !== "hold") throw new Error("El turno ya no está disponible.");
  if (appt.holdExpiresAt && Date.parse(appt.holdExpiresAt) <= nowMs()) {
    appt.status = "expirada";
    throw new Error("La reserva expiró. Volvé a empezar.");
  }
  appt.status = "confirmada";
  appt.depositMethod = "mercadopago";
  appt.depositStatus = "pagado";
  appt.holdExpiresAt = null;
  pushPayment(appt, "sena", "mercadopago", appt.depositCents);
  return appt;
}

/** Seña a pagar en efectivo en el local → confirma el turno (seña pendiente). */
export function confirmDepositEfectivo(id: string): Appointment {
  const appt = getAppointment(id);
  if (!appt) throw new Error("Turno inexistente");
  if (appt.status === "confirmada") return appt;
  if (appt.status !== "hold") throw new Error("El turno ya no está disponible.");
  appt.status = "confirmada";
  appt.depositMethod = "efectivo";
  appt.depositStatus = "pendiente";
  appt.holdExpiresAt = null;
  return appt;
}

/** Panel: registra que la seña en efectivo se cobró. */
export function registrarSenaEfectivo(id: string): Appointment {
  const appt = getAppointment(id);
  if (!appt) throw new Error("Turno inexistente");
  if (appt.depositStatus === "pagado") return appt;
  appt.depositMethod = "efectivo";
  appt.depositStatus = "pagado";
  pushPayment(appt, "sena", "efectivo", appt.depositCents);
  return appt;
}

/** Panel: registra el cobro del saldo (en el local), por efectivo o MP. */
export function registrarSaldo(id: string, method: PaymentMethod): Appointment {
  const appt = getAppointment(id);
  if (!appt) throw new Error("Turno inexistente");
  if (appt.balanceStatus === "pagado") return appt;
  appt.balanceMethod = method;
  appt.balanceStatus = "pagado";
  pushPayment(appt, "saldo", method, appt.priceCents - appt.depositCents);
  return appt;
}

export function cancelAppointment(id: string): Appointment {
  const appt = getAppointment(id);
  if (!appt) throw new Error("Turno inexistente");
  appt.status = "cancelada";
  return appt;
}
export function setAppointmentStatus(id: string, status: Appointment["status"]): Appointment {
  const appt = getAppointment(id);
  if (!appt) throw new Error("Turno inexistente");
  appt.status = status;
  return appt;
}

// ---------- Consultas cliente / panel ----------
export function appointmentsForCustomer(customerId: string): Appointment[] {
  return db()
    .appointments.filter((a) => a.customerId === customerId && a.status !== "expirada")
    .sort((a, b) => Date.parse(b.start) - Date.parse(a.start));
}
export function appointmentsOnDate(dateStr: string): Appointment[] {
  const dayUtc = arDateTime(dateStr, "00:00").toISOString().slice(0, 10);
  return db()
    .appointments.filter(
      (a) =>
        (a.status === "confirmada" || a.status === "completada" || a.status === "no_show") &&
        a.start.slice(0, 10) === dayUtc,
    )
    .sort((a, b) => Date.parse(a.start) - Date.parse(b.start));
}
export function allUpcomingAppointments(): Appointment[] {
  const now = nowMs();
  return db()
    .appointments.filter((a) => a.status === "confirmada" && Date.parse(a.start) >= now - 86_400_000)
    .sort((a, b) => Date.parse(a.start) - Date.parse(b.start));
}
/** Todos los turnos relevantes para la tabla del panel. */
export function listAllAppointments(): Appointment[] {
  return db()
    .appointments.filter((a) => a.status !== "hold" && a.status !== "expirada")
    .sort((a, b) => Date.parse(b.start) - Date.parse(a.start));
}
export function listPayments(): Payment[] {
  return db().payments;
}

// ---------- Usuarios ----------
export function findUserByEmail(email: string): User | undefined {
  return db().users.find((u) => u.email.toLowerCase() === email.toLowerCase());
}
export function getUser(id: string): User | undefined {
  return db().users.find((u) => u.id === id);
}
export function createUser(input: { email: string; name: string; phone: string; password: string }): User {
  const user: User = { id: nextId("u"), email: input.email, name: input.name, phone: input.phone, password: input.password, role: "cliente" };
  db().users.push(user);
  return user;
}
