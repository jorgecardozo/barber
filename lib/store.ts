/**
 * BACKEND SIMULADO — store en memoria con datos sembrados.
 *
 * ⚠️ Reemplaza temporalmente a Supabase para que la app CORRA sin credenciales.
 * La lógica anti-doble-reserva acá está en código; en producción la hace la
 * base de datos con un EXCLUDE constraint (ver supabase/migrations).
 * El estado vive en globalThis para sobrevivir el hot-reload de Next en dev.
 */
import { DECISIONS, depositForPrice } from "./decisions";
import { arDateTime, addDays, hhmmToMin, minToHHMM, nowMs, todayAR, weekdayOf } from "./time";
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

const BARBER_DEFS = [
  { id: "gavazz", name: "Gavazz", role: "Co-founder & Barbero", specialty: "Fades & diseños", active: true, userId: "u-gavazz", off: 0 },
  { id: "thiago", name: "Thiago", role: "Barbero", specialty: "Clásicos & barba", active: true, off: 1 },
  { id: "lucio", name: "Lucio", role: "Barbero", specialty: "Color & platinados", active: true, off: 2 },
  { id: "brian", name: "Brian", role: "Barbero", specialty: "Degradados a piel", active: true, off: 3 },
  { id: "mati", name: "Mati", role: "Barbero", specialty: "Barba & ritual", active: true, off: 0 },
  { id: "nacho", name: "Nacho", role: "Barbero", specialty: "Cortes urbanos", active: true, off: 1 },
  { id: "lautaro", name: "Lautaro", role: "Barbero", specialty: "Diseños freestyle", active: true, off: 2 },
  { id: "fran", name: "Fran", role: "Barbero", specialty: "Clásicos & color", active: true, off: 4 },
  { id: "tobias", name: "Tobías", role: "Barbero", specialty: "Platinados", active: true, off: 3 },
  { id: "ramiro", name: "Ramiro", role: "Barbero", specialty: "Fades", active: false, userId: "u-ramiro", off: 0 },
] as const;
const BARBER_IMGS = ["/barbers/br1.jpg", "/barbers/br2.jpg", "/barbers/br3.jpg"];

const BARBERS: Barber[] = BARBER_DEFS.map((d, i) => ({
  id: d.id,
  name: d.name,
  role: d.role,
  specialty: d.specialty,
  img: BARBER_IMGS[i % BARBER_IMGS.length],
  serviceIds: ALL_SERVICE_IDS,
  active: d.active,
  userId: "userId" in d ? d.userId : undefined,
}));

// Abierto 10–20 con corte 13–14; cada barbero descansa un día.
const WORKING_HOURS: WorkingHours[] = BARBER_DEFS.flatMap((d) =>
  [0, 1, 2, 3, 4, 5, 6]
    .filter((wd) => wd !== d.off)
    .map((wd) => ({ barberId: d.id, weekday: wd, open: "10:00", close: "20:00", breakStart: "13:00", breakEnd: "14:00" })),
);

const SEED_USERS: User[] = [
  { id: "u-admin", email: "admin@flowsite.com", name: "Admin Flow", phone: "5492995550000", password: "admin123", role: "admin" },
  { id: "u-gavazz", email: "gavazz@flowsite.com", name: "Gavazz", phone: "5492995550001", password: "barber123", role: "barbero", barberId: "gavazz" },
  { id: "u-ramiro", email: "ramiro@flowsite.com", name: "Ramiro", phone: "5492995550009", password: "barber123", role: "barbero", barberId: "ramiro" },
  { id: "u-cliente", email: "cliente@demo.com", name: "Cliente Demo", phone: "5492995551234", password: "cliente123", role: "cliente" },
];

// ---------- Seed de turnos + pagos (para que el dashboard tenga números) ----------
const CLIENT_NAMES = [
  "Juan P.", "Brian M.", "Nico G.", "Lucas D.", "Fran T.", "Maxi A.", "Tomi V.",
  "Dilan F.", "Joaco P.", "Agus L.", "Ema S.", "Santi B.", "Thiago R.", "Ciro M.",
  "Benja S.", "Galo R.", "Lautaro P.", "Bauti G.", "Mateo R.", "Valentino A.",
  "Renzo C.", "Gael M.", "Dante R.", "Facu L.", "Joel V.", "Kevin A.", "Axel P.",
  "Bruno S.", "Iván D.", "Tiziano R.",
];

// PRNG determinístico (sin Math.random) → el mock es estable entre reinicios.
function mulberry32(seed: number) {
  return function () {
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Genera ~120 turnos repartidos en ~6 semanas para tener data de prueba. */
function buildSeed(): { appointments: Appointment[]; payments: Payment[] } {
  const appointments: Appointment[] = [];
  const payments: Payment[] = [];
  const rand = mulberry32(20260614);
  const pick = <T,>(arr: readonly T[]): T => arr[Math.floor(rand() * arr.length)];
  const activeBarbers = BARBERS.filter((b) => b.active);
  let aSeq = 0;
  let pSeq = 0;

  for (let day = -28; day <= 12; day++) {
    const date = addDays(todayAR(), day);
    const wd = weekdayOf(date);
    for (const b of activeBarbers) {
      const wh = WORKING_HOURS.find((w) => w.barberId === b.id && w.weekday === wd);
      if (!wh) continue;
      const count = Math.floor(rand() * 1.8); // 0..1 por barbero/día
      const used: [number, number][] = [];
      const openMin = hhmmToMin(wh.open);
      const closeMin = hhmmToMin(wh.close);
      const bs = wh.breakStart ? hhmmToMin(wh.breakStart) : -1;
      const be = wh.breakEnd ? hhmmToMin(wh.breakEnd) : -1;

      for (let k = 0; k < count; k++) {
        const svc = pick(SERVICES);
        const maxSlots = Math.floor((closeMin - openMin - svc.durationMin) / 15);
        if (maxSlots <= 0) continue;
        let placed = false;
        for (let attempt = 0; attempt < 6 && !placed; attempt++) {
          const startMin = openMin + Math.floor(rand() * maxSlots) * 15;
          const endMin = startMin + svc.durationMin;
          if (bs >= 0 && startMin < be && endMin > bs) continue; // corte mediodía
          if (used.some(([s, e]) => startMin < e + 5 && s - 5 < endMin)) continue;
          used.push([startMin, endMin]);
          placed = true;

          const start = arDateTime(date, minToHHMM(startMin));
          const end = new Date(start.getTime() + svc.durationMin * 60_000);
          const depositCents = depositForPrice(svc.priceCents);

          let status: Appointment["status"];
          if (day < 0) {
            const r = rand();
            status = r < 0.82 ? "completada" : r < 0.92 ? "no_show" : "cancelada";
          } else {
            status = "confirmada";
          }
          const completed = status === "completada";
          const senaMethod: PaymentMethod = rand() < 0.55 ? "mercadopago" : "efectivo";
          const senaPaid = status !== "cancelada" && (status !== "confirmada" || rand() < 0.85);
          const saldoMethod: PaymentMethod = rand() < 0.45 ? "mercadopago" : "efectivo";

          aSeq++;
          const appt: Appointment = {
            id: `seed-${String(aSeq).padStart(4, "0")}`,
            serviceId: svc.id,
            barberId: b.id,
            customerId: null,
            customerName: pick(CLIENT_NAMES),
            customerPhone: "54929955" + String(51000 + aSeq),
            start: start.toISOString(),
            end: end.toISOString(),
            status,
            priceCents: svc.priceCents,
            depositCents,
            holdExpiresAt: null,
            depositMethod: senaPaid ? senaMethod : status === "confirmada" ? "efectivo" : senaMethod,
            depositStatus: senaPaid ? "pagado" : "pendiente",
            balanceMethod: completed ? saldoMethod : null,
            balanceStatus: completed ? "pagado" : "pendiente",
            createdAt: start.toISOString(),
          };
          appointments.push(appt);
          if (senaPaid) {
            pSeq++;
            payments.push({ id: `pseed-${pSeq}`, appointmentId: appt.id, barberId: b.id, kind: "sena", method: senaMethod, amountCents: depositCents, createdAt: start.toISOString() });
          }
          if (completed) {
            pSeq++;
            payments.push({ id: `pseed-${pSeq}`, appointmentId: appt.id, barberId: b.id, kind: "saldo", method: saldoMethod, amountCents: svc.priceCents - depositCents, createdAt: end.toISOString() });
          }
        }
      }
    }
  }
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
/** Solo barberos ACTIVOS ofrecen turnos. */
export function barbersForService(serviceId: string): Barber[] {
  return db().barbers.filter((b) => b.active && b.serviceIds.includes(serviceId));
}
export function getBarberByUserId(userId: string): Barber | undefined {
  return db().barbers.find((b) => b.userId === userId);
}
export function workingHoursFor(barberId: string, weekday: number): WorkingHours | undefined {
  return db().workingHours.find((w) => w.barberId === barberId && w.weekday === weekday);
}
export function workingHoursForBarber(barberId: string): WorkingHours[] {
  return db().workingHours.filter((w) => w.barberId === barberId);
}

// ---------- ABM: servicios ----------
export function createService(input: Omit<Service, "id">): Service {
  const slug = input.name.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
  const svc: Service = { ...input, id: slug || nextId("svc") };
  db().services.push(svc);
  // todos los barberos pueden ofrecerlo por defecto
  for (const b of db().barbers) if (!b.serviceIds.includes(svc.id)) b.serviceIds.push(svc.id);
  return svc;
}
export function updateService(id: string, patch: Partial<Omit<Service, "id">>): Service {
  const svc = getService(id);
  if (!svc) throw new Error("Servicio inexistente");
  Object.assign(svc, patch);
  return svc;
}
export function deleteService(id: string): void {
  const d = db();
  d.services = d.services.filter((s) => s.id !== id);
  for (const b of d.barbers) b.serviceIds = b.serviceIds.filter((s) => s !== id);
}

// ---------- ABM: barberos ----------
export function createBarber(input: { name: string; specialty: string; img?: string; active?: boolean; userId?: string; role?: string }): Barber {
  const slug = input.name.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
  const barber: Barber = {
    id: db().barbers.some((b) => b.id === slug) ? nextId("barber") : slug || nextId("barber"),
    name: input.name,
    role: input.role ?? "Barbero",
    specialty: input.specialty || "Barbería",
    img: input.img || "/barbers/br1.jpg",
    serviceIds: db().services.map((s) => s.id),
    active: input.active ?? false,
    userId: input.userId,
  };
  db().barbers.push(barber);
  // Horario por defecto: todos los días 10–20 con corte 13–14
  for (const wd of [0, 1, 2, 3, 4, 5, 6]) {
    db().workingHours.push({ barberId: barber.id, weekday: wd, open: "10:00", close: "20:00", breakStart: "13:00", breakEnd: "14:00" });
  }
  return barber;
}
export function updateBarber(id: string, patch: Partial<Pick<Barber, "name" | "specialty" | "img" | "role">>): Barber {
  const b = getBarber(id);
  if (!b) throw new Error("Barbero inexistente");
  Object.assign(b, patch);
  return b;
}
export function setBarberActive(id: string, active: boolean): Barber {
  const b = getBarber(id);
  if (!b) throw new Error("Barbero inexistente");
  b.active = active;
  return b;
}

// ---------- Horarios ----------
export function setWorkingHours(barberId: string, hours: Omit<WorkingHours, "barberId">[]): void {
  const d = db();
  d.workingHours = d.workingHours.filter((w) => w.barberId !== barberId);
  for (const h of hours) d.workingHours.push({ ...h, barberId });
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

/** Alta de turno por el staff (walk-in): queda confirmado directo. */
export function createWalkIn(input: {
  serviceId: string;
  barberId: string;
  startISO: string;
  customerName: string;
  customerPhone: string;
  depositMethod: PaymentMethod;
  depositPaid: boolean;
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
  const depositCents = depositForPrice(svc.priceCents);
  const appt: Appointment = {
    id: nextId("turno"),
    serviceId: svc.id,
    barberId: input.barberId,
    customerId: null,
    customerName: input.customerName || "Walk-in",
    customerPhone: input.customerPhone,
    start: start.toISOString(),
    end: end.toISOString(),
    status: "confirmada",
    priceCents: svc.priceCents,
    depositCents,
    holdExpiresAt: null,
    depositMethod: input.depositMethod,
    depositStatus: input.depositPaid ? "pagado" : "pendiente",
    balanceMethod: null,
    balanceStatus: "pendiente",
    createdAt: new Date().toISOString(),
  };
  db().appointments.push(appt);
  if (input.depositPaid) pushPayment(appt, "sena", input.depositMethod, depositCents);
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
export function createUser(input: {
  email: string;
  name: string;
  phone: string;
  password: string;
  role?: "cliente" | "barbero";
  barberId?: string;
}): User {
  const user: User = {
    id: nextId("u"),
    email: input.email,
    name: input.name,
    phone: input.phone,
    password: input.password,
    role: input.role ?? "cliente",
    barberId: input.barberId,
  };
  db().users.push(user);
  return user;
}

/** Auto-registro de barbero: crea usuario (rol barbero) + perfil INACTIVO. */
export function registerBarber(input: { email: string; name: string; phone: string; password: string }): { user: User; barber: Barber } {
  const user = createUser({ ...input, role: "barbero" });
  const barber = createBarber({ name: input.name, specialty: "Barbería", active: false, userId: user.id });
  user.barberId = barber.id;
  return { user, barber };
}

export function listPendingBarbers(): Barber[] {
  return db().barbers.filter((b) => !b.active);
}
