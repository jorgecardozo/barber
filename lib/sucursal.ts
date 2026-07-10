import { cookies } from "next/headers";
import { supabaseAdmin } from "./supabase/admin";

export type Sucursal = { id: string; nombre: string; direccion: string; activa: boolean };

const COOKIE = "sucursalId";

export async function listSucursales(): Promise<Sucursal[]> {
  const { data } = await supabaseAdmin
    .from("sucursales")
    .select("id,nombre,direccion,activa")
    .eq("activa", true)
    .order("created_at");
  return (data as Sucursal[]) ?? [];
}

// Sucursal activa del usuario (cookie), o la primera disponible.
export async function getCurrentSucursalId(): Promise<string | null> {
  const jar = await cookies();
  const saved = jar.get(COOKIE)?.value;
  const list = await listSucursales();
  if (saved && list.some((s) => s.id === saved)) return saved;
  return list[0]?.id ?? null;
}

export async function getCurrentSucursal(): Promise<Sucursal | null> {
  const id = await getCurrentSucursalId();
  if (!id) return null;
  const list = await listSucursales();
  return list.find((s) => s.id === id) ?? null;
}
