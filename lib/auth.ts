/**
 * Auth SIMULADA — sesión por cookie. En producción esto es Supabase Auth.
 * La cookie guarda solo el id de usuario (es una simulación; no es seguro
 * para prod). Las server actions de login/registro setean la sesión.
 */
import { cookies } from "next/headers";
import { getUser } from "./store";
import type { User } from "./types";

const COOKIE = "flow_session";

export async function getSessionUser(): Promise<User | null> {
  const jar = await cookies();
  const id = jar.get(COOKIE)?.value;
  if (!id) return null;
  return getUser(id) ?? null;
}

export async function setSession(userId: string): Promise<void> {
  const jar = await cookies();
  jar.set(COOKIE, userId, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
  });
}

export async function clearSession(): Promise<void> {
  const jar = await cookies();
  jar.delete(COOKIE);
}

/** Helper de autorización para el panel. */
export async function requireStaff(): Promise<User | null> {
  const u = await getSessionUser();
  if (!u) return null;
  if (u.role !== "admin" && u.role !== "barbero") return null;
  return u;
}
