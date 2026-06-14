/**
 * BACKEND SIMULADO — store en memoria con datos sembrados.
 *
 * ⚠️ Esto reemplaza temporalmente a Supabase para que la app CORRA sin
 * credenciales. La lógica anti-doble-reserva acá está en código; en producción
 * la hace la base de datos con un EXCLUDE constraint (ver supabase/migrations).
 *
 * El estado vive en globalThis para sobrevivir el hot-reload de Next en dev.
 */
import { DECISIONS, depositForPrice } from "./decisions";
import { arDateTime, nowMs, todayAR, addDays } from "./time";
import type {
  Appointment,
  Barber,
  Payment,
  Service,
  User,
  WorkingHours,
} from "./types";

// ---------- Seed ----------
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

// Horarios: abierto todos los días 10:00–20:00 con corte 13:00–14:00.
// Cada barbero descansa un día distinto (para mostrar "sin disponibilidad").
const DAYS_OFF: Record<string, number> = { gavazz: 0 /*Dom*/, thiago: 1 /*Lun*/, lucio: 2 /*Mar*/ };
const WORKING_HOURS: WorkingHours[] = BARBERS.flatMap((b) =>
  [0, 1, 2, 3, 4, 5, 6]
    .filter((wd) => wd !== DAYS_OFF[b.id])
    .map((wd) => ({
      barberId: b.id,
      weekday: wd,
      open: "10:00",
      close: "20:00",
      breakStart: "13:00",
      breakEnd: "14:00",
    })),
);

const ADMIN_USER: User = { id: "u-admin", email: "admin@flowsite.com", name: "Admin Flow", phone: "5492995550000", password: "admin123", role: "admin" };
const SEED_USERS: User[] = [
  ADMIN_USER,
  { id: "u-gavazz", email: "gavazz@flowsite.com", name: "Gavazz", phone: "5492995550001", password: "barber123", role: "barbero", barberId: "gavazz" },
  { id: "u-cliente", email: "cliente@demo.com", name: "Cliente Demo", phone: "5492995551234", password: "cliente123", role: "cliente" },
];

/** Algunos turnos confirmados para que se vean huecos en la agenda. */
function seedAppointments(): Appointment[] {
  const t1 = addDays(todayAR(), 1);
  const t2 = addDays(todayAR(), 2);
  const mk = (
    id: string,
    barberId: string,
    serviceId: string,
    date: string,
    hhmm: string,
    name: string,
  ): Appointment => {
    const svc = SERVICES.find((s) => s.id === serviceId)!;
    const start = arDateTime(date, hhmm);
    const end = new Date(start.getTime() + svc.durationMin * 60_000);
    return {
      id,
      serviceId,
      barberId,
      customerId: null,
      customerName: name,
      customerPhone: "549299555" + id.slice(-4),
      start: start.toISOString(),
      end: end.toISOString(),
      status: "confirmada",
      priceCents: svc.priceCents,
      depositCents: depositForPrice(svc.priceCents),
      holdExpiresAt: null,
      paymentId: "seed",
      createdAt: new Date().toISOString(),
    };
  };
  return [
    mk("seed-0001", "gavazz", "corte-barba", t1, "11:00", "Juan P."),
    mk("seed-0002", "gavazz", "fade", t1, "15:30", "Mateo R."),
    mk("seed-0003", "thiago", "corte", t1, "10:30", "Brian M."),
    mk("seed-0004", "lucio", "color", t2, "14:00", "Nico G."),
  ];
}

// ---------- Store singleton ----------
interface DB {
  services: Service[];
  barbers: Barber[];
  workingHours: WorkingHours[];
  appointments: Appointment[];
  users: User[];
  payments: Payment[];
  seq: number;
}

const g = globalThis as unknown as { __flowDB?: DB };

function db(): DB {
  if (!g.__flowDB) {
    g.__flowDB = {
      services: SERVICES,
      barbers: BARBERS,
      workingHours: WORKING_HOURS,
      appointments: seedAppointments(),
      users: SEED_USERS,
      payments: [],
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

// ---------- Lecturas catálogo ----------
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

// ---------- Turnos activos (lazy expiry de holds) ----------
/** Turnos que ocupan agenda: confirmados + holds no vencidos. */
export function activeAppointmentsForBarber(barberId: string): Appointment[] {
  const now = nowMs();
  return db().appointments.filter((a) => {
    if (a.barberId !== barberId) return false;
    if (a.status === "confirmada") return true;
    if (a.status === "hold" && a.holdExpiresAt && Date.parse(a.holdExpiresAt) > now) return true;
    return false;
  });
}

/** Marca como expirados los holds vencidos (lo haría un cron en prod). */
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

// ---------- Escritura: holds y confirmación ----------
function rangesOverlap(aStart: number, aEnd: number, bStart: number, bEnd: number): boolean {
  return aStart < bEnd && bStart < aEnd;
}

export class SlotTakenError extends Error {
  constructor() {
    super("Ese horario ya fue tomado. Elegí otro.");
    this.name = "SlotTakenError";
  }
}

/**
 * Crea un hold (reserva temporal) validando que no se solape con otro turno
 * del mismo barbero (anti-doble-reserva). En prod esto lo garantiza el
 * EXCLUDE constraint de Postgres de forma atómica.
 */
export function createHold(input: {
  serviceId: string;
  barberId: string;
  startISO: string;
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
    const aStart = Date.parse(a.start) - bufferMs;
    const aEnd = Date.parse(a.end) + bufferMs;
    if (rangesOverlap(sMs, eMs, aStart, aEnd)) {
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
    paymentId: null,
    createdAt: new Date().toISOString(),
  };
  db().appointments.push(appt);
  return appt;
}

export function getAppointment(id: string): Appointment | undefined {
  return db().appointments.find((a) => a.id === id);
}

/** Simula el pago de la seña aprobado → confirma el turno. */
export function confirmAppointmentPayment(appointmentId: string): Appointment {
  const appt = getAppointment(appointmentId);
  if (!appt) throw new Error("Turno inexistente");
  if (appt.status === "confirmada") return appt;
  if (appt.status !== "hold") throw new Error("El turno ya no está disponible para pagar.");
  if (appt.holdExpiresAt && Date.parse(appt.holdExpiresAt) <= nowMs()) {
    appt.status = "expirada";
    throw new Error("La reserva expiró. Volvé a empezar.");
  }
  const payment: Payment = {
    id: nextId("pago"),
    appointmentId,
    amountCents: appt.depositCents,
    status: "aprobado",
    createdAt: new Date().toISOString(),
  };
  db().payments.push(payment);
  appt.status = "confirmada";
  appt.paymentId = payment.id;
  appt.holdExpiresAt = null;
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

// ---------- Consultas para cliente / panel ----------
export function appointmentsForCustomer(customerId: string): Appointment[] {
  return db()
    .appointments.filter((a) => a.customerId === customerId && a.status !== "expirada")
    .sort((a, b) => Date.parse(b.start) - Date.parse(a.start));
}

export function appointmentsOnDate(dateStr: string): Appointment[] {
  return db()
    .appointments.filter(
      (a) =>
        (a.status === "confirmada" || a.status === "completada" || a.status === "no_show") &&
        a.start.slice(0, 10) === arDateTime(dateStr, "00:00").toISOString().slice(0, 10),
    )
    .sort((a, b) => Date.parse(a.start) - Date.parse(b.start));
}

export function allUpcomingAppointments(): Appointment[] {
  const now = nowMs();
  return db()
    .appointments.filter((a) => a.status === "confirmada" && Date.parse(a.start) >= now - 86_400_000)
    .sort((a, b) => Date.parse(a.start) - Date.parse(b.start));
}

// ---------- Usuarios (auth simulada) ----------
export function findUserByEmail(email: string): User | undefined {
  return db().users.find((u) => u.email.toLowerCase() === email.toLowerCase());
}
export function getUser(id: string): User | undefined {
  return db().users.find((u) => u.id === id);
}
export function createUser(input: { email: string; name: string; phone: string; password: string }): User {
  const user: User = {
    id: nextId("u"),
    email: input.email,
    name: input.name,
    phone: input.phone,
    password: input.password,
    role: "cliente",
  };
  db().users.push(user);
  return user;
}
