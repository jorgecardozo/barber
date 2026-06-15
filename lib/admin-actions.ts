"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import {
  createBarber,
  createService,
  createUser,
  deleteService,
  findUserByEmail,
  getBarber,
  registerBarber,
  setBarberActive,
  setWorkingHours,
  updateBarber,
  updateService,
} from "./store";
import { getSessionUser, requireAdmin, requireStaff, setSession } from "./auth";
import type { WorkingHours } from "./types";

// ---------------- Auth: Google (simulado) + registro barbero ----------------
export async function loginGoogleAction(formData: FormData) {
  const next = String(formData.get("next") || "/mis-turnos");
  // SIMULADO: en prod esto es OAuth real de Google vía Supabase Auth.
  const email = "google.demo@gmail.com";
  let user = findUserByEmail(email);
  if (!user) user = createUser({ email, name: "Usuario Google", phone: "5492990000000", password: "google-oauth" });
  await setSession(user.id);
  redirect(next);
}

export async function registerBarberAction(formData: FormData) {
  const email = String(formData.get("email") || "").trim();
  const name = String(formData.get("name") || "").trim();
  const phone = String(formData.get("phone") || "").trim();
  const password = String(formData.get("password") || "");
  if (!email || !name || !phone || password.length < 4) {
    redirect(`/ingresar?tab=barbero&error=campos`);
  }
  if (findUserByEmail(email)) {
    redirect(`/ingresar?tab=barbero&error=existe`);
  }
  const { user } = registerBarber({ email, name, phone, password });
  await setSession(user.id);
  redirect("/panel"); // mostrará "pendiente de activación"
}

// ---------------- ABM Servicios (admin + barbero) ----------------
function parsePrice(v: FormDataEntryValue | null): number {
  return Math.round(Number(String(v || "0").replace(/[^\d.]/g, "")) * 100);
}

export async function createServiceAction(formData: FormData) {
  if (!(await requireStaff())) redirect("/panel/ingresar");
  createService({
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
  updateService(String(formData.get("id") || ""), {
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
  deleteService(String(formData.get("id") || ""));
  revalidatePath("/panel/servicios");
}

// ---------------- ABM Barberos (admin) ----------------
export async function createBarberAction(formData: FormData) {
  if (!(await requireAdmin())) redirect("/panel");
  createBarber({
    name: String(formData.get("name") || "").trim(),
    specialty: String(formData.get("specialty") || "").trim(),
    active: formData.get("active") === "on",
  });
  revalidatePath("/panel/barberos");
}

export async function setBarberActiveAction(formData: FormData) {
  if (!(await requireAdmin())) redirect("/panel");
  setBarberActive(String(formData.get("id") || ""), formData.get("active") === "true");
  revalidatePath("/panel/barberos");
  revalidatePath("/panel");
}

export async function updateBarberAction(formData: FormData) {
  const staff = await requireStaff();
  if (!staff) redirect("/panel/ingresar");
  const id = String(formData.get("id") || "");
  const b = getBarber(id);
  if (!b) redirect("/panel/barberos");
  // barbero solo edita su propio perfil
  if (staff.role === "barbero" && b.userId !== staff.id) redirect("/panel");
  updateBarber(id, {
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
  const b = getBarber(barberId);
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
  setWorkingHours(barberId, hours);
  revalidatePath("/panel/horarios");
}
