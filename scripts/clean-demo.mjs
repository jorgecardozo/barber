// Borra TODO lo sembrado por seed-demo.mjs.
//   node --env-file=.env.local scripts/clean-demo.mjs
import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) { console.error("Faltan env vars (--env-file=.env.local)"); process.exit(1); }
const sb = createClient(url, key, { auth: { persistSession: false } });

const a = await sb.from("appointments").delete().like("customer_name_snapshot", "Demo · %");
console.log("turnos demo borrados", a.error ? a.error.message : "ok");
const b = await sb.from("barbers").delete().like("name", "Demo · %");
console.log("barberos demo borrados", b.error ? b.error.message : "ok");
const s = await sb.from("services").delete().like("slug", "demo-%");
console.log("servicios demo borrados", s.error ? s.error.message : "ok");
