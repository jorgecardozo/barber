// Seed de datos DEMO para ver paginación/tablas. Todo va marcado para poder
// borrarlo después con scripts/clean-demo.mjs:
//   - services.slug  empieza con  "demo-"
//   - barbers.name   empieza con  "Demo · "
//   - appointments.customer_name_snapshot empieza con "Demo · "
//
// Uso:  node --env-file=.env.local scripts/seed-demo.mjs
import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) {
  console.error("Faltan NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY (usá --env-file=.env.local)");
  process.exit(1);
}
const sb = createClient(url, key, { auth: { persistSession: false } });

const N = 100;
const pad = (n) => String(n).padStart(3, "0");
const pick = (arr, i) => arr[i % arr.length];

const NOMBRES = ["Corte clásico", "Fade", "Barba", "Corte + Barba", "Diseño", "Color", "Platinado", "Perfilado", "Ritual", "Niños"];
const ESPEC = ["Fades & diseños", "Barbas", "Clásico", "Color", "Freestyle", "Degradés"];
const CLIENTES = ["Juan", "Thiago", "Mateo", "Bruno", "Lucas", "Nico", "Facu", "Santi", "Ale", "Gonza", "Pedro", "Iván"];

async function seedServices() {
  const rows = Array.from({ length: N }, (_, i) => {
    const price = 4000 + (i % 12) * 1000;
    return {
      slug: `demo-servicio-${pad(i)}`,
      name: `Demo · ${pick(NOMBRES, i)} ${pad(i)}`,
      description: "Servicio de prueba para ver la tabla y el paginado.",
      price_cents: price * 100,
      duration_min: 20 + (i % 6) * 10,
      deposit_pct: [0, 30, 40, 50][i % 4],
      is_active: true,
      sort_order: i,
    };
  });
  const { error } = await sb.from("services").insert(rows);
  if (error) throw new Error("services: " + error.message);
  console.log(`✓ ${N} servicios demo`);
}

async function seedBarbers() {
  const rows = Array.from({ length: N }, (_, i) => ({
    name: `Demo · Barbero ${pad(i)}`,
    role_label: "Barbero",
    specialty: pick(ESPEC, i),
    is_active: i % 5 !== 0, // 1 de cada 5 queda "pendiente"
    sort_order: i,
  }));
  const { error } = await sb.from("barbers").insert(rows);
  if (error) throw new Error("barbers: " + error.message);
  console.log(`✓ ${N} barberos demo`);
}

async function seedAppointments() {
  // Usamos barberos/servicios existentes (o los demo recién creados).
  const [{ data: barbers }, { data: services }] = await Promise.all([
    sb.from("barbers").select("id,name,is_active").eq("is_active", true).limit(20),
    sb.from("services").select("id,name,price_cents,duration_min,deposit_pct").limit(20),
  ]);
  if (!barbers?.length || !services?.length) throw new Error("no hay barberos/servicios activos");

  // Generamos candidatos: por (día, barbero) slots cada 45 min → sin solaparse.
  // Orden de días con HOY primero para que el paginado se vea sin cambiar filtros.
  const dayOffsets = [0, 1, -1, 2, -2, 3, -3, 4];
  const candidates = [];
  for (const off of dayOffsets) {
    for (let b = 0; b < barbers.length; b++) {
      for (let slot = 0; slot < 10; slot++) {
        candidates.push({ off, b, slot });
        if (candidates.length >= N * 3) break;
      }
    }
  }

  const now = new Date();
  const rows = [];
  for (let i = 0; i < N && i < candidates.length; i++) {
    const { off, b, slot } = candidates[i];
    const barber = barbers[b];
    const svc = pick(services, i);
    const dur = svc.duration_min || 30;

    const d = new Date(now);
    d.setDate(d.getDate() + off);
    d.setHours(9, 0, 0, 0);
    const start = new Date(d.getTime() + slot * 45 * 60000);
    const end = new Date(start.getTime() + dur * 60000);

    const deposit = Math.round((svc.price_cents * (svc.deposit_pct || 0)) / 100);
    const status = off < 0 ? (i % 4 === 0 ? "no_show" : "completada") : off === 0 && slot % 3 === 0 ? "en_curso" : "confirmada";

    rows.push({
      barber_id: barber.id,
      service_id: svc.id,
      service_name_snapshot: svc.name,
      duration_min_snapshot: dur,
      customer_name_snapshot: `Demo · ${pick(CLIENTES, i)} ${pad(i)}`,
      customer_phone_snapshot: `11${String(50000000 + i)}`,
      starts_at: start.toISOString(),
      ends_at: end.toISOString(),
      status,
      price_cents: svc.price_cents,
      deposit_cents: deposit,
      hold_expires_at: end.toISOString(),
    });
  }

  // Insertamos de a uno tolerando choques del EXCLUDE (por si hay turnos reales).
  let ok = 0;
  for (const r of rows) {
    const { error } = await sb.from("appointments").insert(r);
    if (!error) ok++;
    else if (!/exclusion|23P01/i.test(error.message)) console.warn("appt:", error.message);
  }
  console.log(`✓ ${ok} turnos demo`);
}

await seedServices();
await seedBarbers();
await seedAppointments();
console.log("Listo. Para borrar: node --env-file=.env.local scripts/clean-demo.mjs");
