"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import {
  createBarber,
  createService,
  createWalkIn,
  deleteService,
  getBarber,
  setBarberActive,
  setWorkingHours,
  updateBarber,
  updateService,
} from "@/lib/store";
import { requireAdmin, requireStaff } from "@/lib/auth";
import { createClient } from "@/shared/api/supabase/server";
import { supabaseAdmin } from "@/shared/api/supabase/admin";
import type { PaymentMethod, WorkingHours } from "@/lib/types";

// ---------------- Auth: Google (OAuth) + registro barbero ----------------
export async function loginGoogleAction(formData: FormData) {
  const next = String(formData.get("next") || "/mis-turnos");
  const supabase = await createClient();
  const origin = (await headers()).get("origin") ?? process.env.NEXT_PUBLIC_SITE_URL ?? "http://127.0.0.1:3000";
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: { redirectTo: `${origin}/auth/callback?next=${encodeURIComponent(next)}` },
  });
  // Requiere configurar el proveedor Google en Supabase + un route handler /auth/callback.
  if (error || !data?.url) redirect(`/ingresar?error=google`);
  redirect(data.url);
}

export async function registerBarberAction(formData: FormData) {
  const email = String(formData.get("email") || "").trim();
  const name = String(formData.get("name") || "").trim();
  const phone = String(formData.get("phone") || "").trim();
  const password = String(formData.get("password") || "");
  if (!email || !name || !phone || password.length < 4) {
    redirect(`/ingresar?tab=barbero&error=campos`);
  }
  const supabase = await createClient();
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: { data: { full_name: name, phone } },
  });
  if (error || !data.user) {
    redirect(`/ingresar?tab=barbero&error=existe`);
  }
  // Promover a barbero (service_role) + crear su perfil de barbero INACTIVO.
  await supabaseAdmin.from("profiles").update({ role: "barbero", full_name: name, phone }).eq("id", data.user.id);
  await createBarber({ name, specialty: "Barbería", active: false, userId: data.user.id });
  redirect("/panel"); // mostrará "pendiente de activación"
}

// ---------------- Alta de turno por staff (walk-in) ----------------
export async function crearTurnoWalkInAction(formData: FormData) {
  if (!(await requireStaff())) redirect("/panel/ingresar");
  await createWalkIn({
    serviceId: String(formData.get("serviceId") || ""),
    barberId: String(formData.get("barberId") || ""),
    startISO: String(formData.get("startISO") || ""),
    customerName: String(formData.get("customerName") || "").trim(),
    customerPhone: String(formData.get("customerPhone") || "").trim(),
    depositMethod: String(formData.get("depositMethod") || "efectivo") as PaymentMethod,
    depositPaid: formData.get("depositPaid") === "on",
  });
  revalidatePath("/panel/turnos");
  revalidatePath("/panel");
}

// ---------------- ABM Servicios (admin + barbero) ----------------
function parsePrice(v: FormDataEntryValue | null): number {
  return Math.round(Number(String(v || "0").replace(/[^\d.]/g, "")) * 100);
}

export async function createServiceAction(formData: FormData) {
  if (!(await requireStaff())) redirect("/panel/ingresar");
  await createService({
    name: String(formData.get("name") || "").trim(),
    description: String(formData.get("description") || "").trim(),
    priceCents: parsePrice(formData.get("price")),
    durationMin: Number(formData.get("duration") || 30),
    depositPct: Number(formData.get("depositPct") || 40),
  });
  revalidatePath("/panel/servicios");
}

export async function updateServiceAction(formData: FormData) {
  if (!(await requireStaff())) redirect("/panel/ingresar");
  await updateService(String(formData.get("id") || ""), {
    name: String(formData.get("name") || "").trim(),
    description: String(formData.get("description") || "").trim(),
    priceCents: parsePrice(formData.get("price")),
    durationMin: Number(formData.get("duration") || 30),
    depositPct: Number(formData.get("depositPct") || 40),
  });
  revalidatePath("/panel/servicios");
}

export async function deleteServiceAction(formData: FormData) {
  if (!(await requireAdmin())) redirect("/panel");
  await deleteService(String(formData.get("id") || ""));
  revalidatePath("/panel/servicios");
}

// ---------------- ABM Barberos (admin) ----------------
export async function createBarberAction(formData: FormData) {
  if (!(await requireAdmin())) redirect("/panel");
  await createBarber({
    name: String(formData.get("name") || "").trim(),
    specialty: String(formData.get("specialty") || "").trim(),
    active: formData.get("active") === "on",
  });
  revalidatePath("/panel/barberos");
}

export async function setBarberActiveAction(formData: FormData) {
  if (!(await requireAdmin())) redirect("/panel");
  await setBarberActive(String(formData.get("id") || ""), formData.get("active") === "true");
  revalidatePath("/panel/barberos");
  revalidatePath("/panel");
}

export async function updateBarberAction(formData: FormData) {
  const staff = await requireStaff();
  if (!staff) redirect("/panel/ingresar");
  const id = String(formData.get("id") || "");
  const b = await getBarber(id);
  if (!b) redirect("/panel/barberos");
  // barbero solo edita su propio perfil
  if (staff.role === "barbero" && b.userId !== staff.id) redirect("/panel");
  await updateBarber(id, {
    name: String(formData.get("name") || b.name).trim(),
    specialty: String(formData.get("specialty") || b.specialty).trim(),
  });
  revalidatePath("/panel/barberos");
}

// ---------------- Horarios (barbero propio / admin cualquiera) ----------------
export async function setWorkingHoursAction(formData: FormData) {
  const staff = await requireStaff();
  if (!staff) redirect("/panel/ingresar");
  const barberId = String(formData.get("barberId") || "");
  const b = await getBarber(barberId);
  if (!b) redirect("/panel/horarios");
  if (staff.role === "barbero" && b.userId !== staff.id) redirect("/panel");

  const hours: Omit<WorkingHours, "barberId">[] = [];
  for (let wd = 0; wd < 7; wd++) {
    if (formData.get(`d${wd}_closed`) === "on") continue; // día cerrado
    const open = String(formData.get(`d${wd}_open`) || "");
    const close = String(formData.get(`d${wd}_close`) || "");
    if (!open || !close) continue;
    const breakStart = String(formData.get(`d${wd}_break_start`) || "");
    const breakEnd = String(formData.get(`d${wd}_break_end`) || "");
    hours.push({
      weekday: wd,
      open,
      close,
      breakStart: breakStart || undefined,
      breakEnd: breakEnd || undefined,
    });
  }
  await setWorkingHours(barberId, hours);
  revalidatePath("/panel/horarios");
}
