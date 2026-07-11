"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";

// Cambia la sucursal activa (cookie) y refresca el panel.
export async function setSucursalAction(id: string) {
  const jar = await cookies();
  jar.set("sucursalId", id, { path: "/", maxAge: 60 * 60 * 24 * 365 });
  revalidatePath("/panel", "layout");
}
