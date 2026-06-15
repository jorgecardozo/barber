/**
 * Auth real con Supabase Auth. La sesión vive en cookies (manejadas por
 * @supabase/ssr); acá solo la leemos y mapeamos el profile al tipo User.
 */
import { createClient } from "./supabase/server";
import { supabaseAdmin } from "./supabase/admin";
import type { User } from "./types";

export async function getSessionUser(): Promise<User | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: profile } = await supabase
    .from("profiles")
    .select("id,email,full_name,phone,role,avatar_url")
    .eq("id", user.id)
    .maybeSingle();
  if (!profile) return null;

  let barberId: string | undefined;
  if (profile.role === "barbero") {
    const { data: b } = await supabaseAdmin.from("barbers").select("id").eq("profile_id", user.id).maybeSingle();
    barberId = b?.id ?? undefined;
  }

  return {
    id: user.id,
    email: (profile.email as string) ?? user.email ?? "",
    name: (profile.full_name as string) ?? "",
    phone: (profile.phone as string) ?? "",
    password: "",
    role: profile.role as User["role"],
    barberId,
    avatarUrl: (profile.avatar_url as string) ?? undefined,
  };
}

/** Admin o barbero (cualquiera, activo o pendiente). */
export async function requireStaff(): Promise<User | null> {
  const u = await getSessionUser();
  if (!u || (u.role !== "admin" && u.role !== "barbero")) return null;
  return u;
}

export async function requireAdmin(): Promise<User | null> {
  const u = await getSessionUser();
  if (!u || u.role !== "admin") return null;
  return u;
}
