// Seed de DEV para Supabase local: crea usuarios de auth (admin/barberos/cliente),
// promueve roles, vincula barberos a su profile y carga turnos+pagos de hoy.
// Uso:  node scripts/seed-dev.mjs   (lee .env.local)
// Idempotente: si el usuario ya existe, lo reutiliza.
import { readFileSync } from "node:fs";
import { createClient } from "@supabase/supabase-js";

// --- leer .env.local ---
const env = Object.fromEntries(
  readFileSync(new URL("../.env.local", import.meta.url), "utf8")
    .split("\n")
    .filter((l) => l.includes("=") && !l.trimStart().startsWith("#"))
    .map((l) => {
      const i = l.indexOf("=");
      return [l.slice(0, i).trim(), l.slice(i + 1).trim()];
    }),
);
const URL_ = env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE = env.SUPABASE_SERVICE_ROLE_KEY;
const db = createClient(URL_, SERVICE, { auth: { persistSession: false } });

// --- usuarios demo (mismas credenciales que la simulación) ---
const USERS = [
  { email: "admin@flowsite.com", password: "admin123", full_name: "Admin Flow", phone: "5492995550000", role: "admin" },
  { email: "gavazz@flowsite.com", password: "barber123", full_name: "Gavazz", phone: "5492995550001", role: "barbero", barber: "Gavazz", photo: "/barbers/br1.jpg" },
  { email: "thiago@flowsite.com", password: "barber123", full_name: "Thiago", phone: "5492995550010", role: "barbero", barber: "Thiago", photo: "/barbers/br2.jpg" },
  { email: "barbero@demo.com", password: "barbero123", full_name: "Lucio", phone: "5492995550002", role: "barbero", barber: "Lucio", photo: "/barbers/br3.jpg" },
  { email: "cliente@demo.com", password: "cliente123", full_name: "Cliente Demo", phone: "5492995551234", role: "cliente" },
];

async function findUserByEmail(email) {
  // admin.listUsers pagina; para dev alcanza la primera página.
  const { data } = await db.auth.admin.listUsers({ page: 1, perPage: 200 });
  return data?.users?.find((u) => u.email === email) ?? null;
}

const ids = {};
for (const u of USERS) {
  let existing = await findUserByEmail(u.email);
  if (!existing) {
    const { data, error } = await db.auth.admin.createUser({
      email: u.email,
      password: u.password,
      email_confirm: true,
      user_metadata: { full_name: u.full_name, phone: u.phone },
    });
    if (error) throw new Error(`createUser ${u.email}: ${error.message}`);
    existing = data.user;
    console.log("creado:", u.email);
  } else {
    console.log("ya existía:", u.email);
  }
  ids[u.email] = existing.id;
  // rol + datos en profile (el trigger ya creó la fila)
  const { error: pe } = await db
    .from("profiles")
    .update({ role: u.role, full_name: u.full_name, phone: u.phone })
    .eq("id", existing.id);
  if (pe) throw new Error(`profile ${u.email}: ${pe.message}`);
  // vincular barbero por nombre + restaurar su foto real (que no sea un avatar
  // DiceBear, que se ve mal como "foto" en el wizard de reserva)
  if (u.barber) {
    const { error: be } = await db.from("barbers").update({ profile_id: existing.id, img_url: u.photo }).eq("name", u.barber);
    if (be) throw new Error(`link barber ${u.barber}: ${be.message}`);
  }
}

// --- turnos de hoy para Lucio (para ver la Cola/Dashboard) ---
const { data: lucio } = await db.from("barbers").select("id,name").eq("name", "Lucio").single();
const { data: services } = await db.from("services").select("id,slug,name,price_cents,duration_min,deposit_pct");
const svc = (slug) => services.find((s) => s.slug === slug);
const customerId = ids["cliente@demo.com"];

// limpio turnos de hoy de Lucio para re-correr limpio
const today = new Date();
const y = today.getFullYear(), m = today.getMonth(), d = today.getDate();
// timestamptz: armo horas locales AR (-03:00)
const atAR = (h, min = 0) => new Date(Date.UTC(y, m, d, h + 3, min)).toISOString();

await db.from("appointments").delete().eq("barber_id", lucio.id).gte("starts_at", atAR(0)).lte("starts_at", atAR(23, 59));

const plan = [
  { slug: "corte-clasico", h: 10, status: "completada", balancePaid: true, client: "Tomás G." },
  { slug: "corte-barba", h: 11, status: "en_curso", balancePaid: false, client: "Nico R." },
  { slug: "diseno-lineas", h: 12, status: "confirmada", balancePaid: false, client: "Joaco P." },
  { slug: "corte-ninos", h: 14, status: "confirmada", balancePaid: false, client: "Benja S." },
  { slug: "degradado-fade", h: 15, status: "confirmada", balancePaid: false, client: "Lautaro M." },
  { slug: "corte-clasico", h: 16, status: "confirmada", balancePaid: false, client: "Facu D." },
  { slug: "corte-barba", h: 17, status: "confirmada", balancePaid: false, client: "Iván T." },
  { slug: "diseno-lineas", h: 18, status: "confirmada", balancePaid: false, client: "Gael M." },
  { slug: "corte-ninos", h: 19, status: "confirmada", balancePaid: false, client: "Santi V." },
  { slug: "corte-clasico", h: 20, status: "confirmada", balancePaid: false, client: "Bruno A." },
];

let nApt = 0, nPay = 0;
for (const p of plan) {
  const s = svc(p.slug);
  const dep = Math.min(s.price_cents, Math.max(100000, Math.ceil((s.price_cents * s.deposit_pct) / 100)));
  const start = atAR(p.h);
  const end = new Date(new Date(start).getTime() + (s.duration_min + 5) * 60000).toISOString();
  const { data: apt, error } = await db
    .from("appointments")
    .insert({
      customer_id: customerId,
      customer_name_snapshot: p.client,
      customer_phone_snapshot: "549299555" + (1300 + p.h),
      barber_id: lucio.id,
      service_id: s.id,
      service_name_snapshot: s.name,
      duration_min_snapshot: s.duration_min,
      starts_at: start,
      ends_at: end,
      status: p.status,
      price_cents: s.price_cents,
      deposit_cents: dep,
      hold_expires_at: start,
    })
    .select("id")
    .single();
  if (error) throw new Error(`insert appt ${p.slug}: ${error.message}`);
  nApt++;
  // seña pagada (registro)
  await db.from("payments").insert({
    appointment_id: apt.id, amount_cents: dep, status: "approved",
    kind: "sena", method: p.h % 2 ? "efectivo" : "mercadopago", is_current: false, paid_at: start,
  });
  nPay++;
  // saldo si está pago
  if (p.balancePaid) {
    await db.from("payments").insert({
      appointment_id: apt.id, amount_cents: s.price_cents - dep, status: "approved",
      kind: "saldo", method: "efectivo", is_current: false, paid_at: end,
    });
    nPay++;
  }
}

console.log(`\nOK → usuarios: ${USERS.length}, turnos hoy (Lucio): ${nApt}, pagos: ${nPay}`);
console.log("profiles roles:");
const { data: profs } = await db.from("profiles").select("full_name,role").order("role");
for (const p of profs) console.log("  ", p.role.padEnd(8), p.full_name);
