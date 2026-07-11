import "server-only";
import { createClient } from "@supabase/supabase-js";

/**
 * Cliente con service_role: SOLO server-side. Bypassa RLS.
 * Lo usa la capa de datos (lib/store.ts) para operaciones del servidor; la
 * autorización (quién puede hacer qué) la imponen las server actions
 * (requireStaff / getSessionUser) antes de llamar acá. La RLS sigue siendo la
 * defensa de la API pública (anon key) desde el browser.
 */
export const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { persistSession: false, autoRefreshToken: false } },
);
