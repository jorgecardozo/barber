"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import {
  cancelAppointment,
  confirmAppointmentPayment,
  createHold,
  createUser,
  findUserByEmail,
  getAppointment,
  setAppointmentStatus,
  SlotTakenError,
} from "./store";
import { clearSession, getSessionUser, requireStaff, setSession } from "./auth";
import { DECISIONS } from "./decisions";

// ---------------- Auth ----------------
export async function loginAction(formData: FormData) {
  const email = String(formData.get("email") || "").trim();
  const password = String(formData.get("password") || "");
  const next = String(formData.get("next") || "/mis-turnos");

  const user = findUserByEmail(email);
  if (!user || user.password !== password) {
    redirect(`/ingresar?error=cred&next=${encodeURIComponent(next)}`);
  }
  await setSession(user.id);
  redirect(user.role === "cliente" ? next : "/panel");
}

export async function registerAction(formData: FormData) {
  const email = String(formData.get("email") || "").trim();
  const name = String(formData.get("name") || "").trim();
  const phone = String(formData.get("phone") || "").trim();
  const password = String(formData.get("password") || "");
  const next = String(formData.get("next") || "/mis-turnos");

  if (!email || !name || !phone || password.length < 4) {
    redirect(`/ingresar?tab=registro&error=campos&next=${encodeURIComponent(next)}`);
  }
  if (findUserByEmail(email)) {
    redirect(`/ingresar?tab=registro&error=existe&next=${encodeURIComponent(next)}`);
  }
  const user = createUser({ email, name, phone, password });
  await setSession(user.id);
  redirect(next);
}

export async function logoutAction() {
  await clearSession();
  redirect("/");
}

// ---------------- Reserva ----------------
export async function crearReservaAction(formData: FormData) {
  const serviceId = String(formData.get("serviceId") || "");
  const barberId = String(formData.get("barberId") || "");
  const startISO = String(formData.get("startISO") || "");

  const user = await getSessionUser();
  if (!user) {
    redirect(`/ingresar?next=${encodeURIComponent("/reservar")}`);
  }

  let apptId: string;
  try {
    const appt = createHold({
      serviceId,
      barberId,
      startISO,
      customerId: user.id,
      customerName: user.name,
      customerPhone: user.phone,
    });
    apptId = appt.id;
  } catch (e) {
    if (e instanceof SlotTakenError) {
      redirect(`/reservar?error=tomado`);
    }
    throw e;
  }
  redirect(`/reservar/pago/${apptId}`);
}

/** Simula el pago de la seña en MercadoPago → confirma el turno. */
export async function pagarSeniaAction(formData: FormData) {
  const id = String(formData.get("id") || "");
  try {
    confirmAppointmentPayment(id);
  } catch (e) {
    redirect(`/reservar/pago/${id}?error=${encodeURIComponent((e as Error).message)}`);
  }
  redirect(`/reservar/confirmacion/${id}`);
}

// ---------------- Cliente: Mis turnos ----------------
export async function cancelarTurnoAction(formData: FormData) {
  const id = String(formData.get("id") || "");
  const user = await getSessionUser();
  const appt = getAppointment(id);
  if (!user || !appt || appt.customerId !== user.id) {
    redirect("/mis-turnos");
  }
  const horasRestantes = (Date.parse(appt.start) - Date.now()) / 3_600_000;
  if (horasRestantes < DECISIONS.cancelWindowHours) {
    redirect("/mis-turnos?error=tarde");
  }
  cancelAppointment(id);
  revalidatePath("/mis-turnos");
}

// ---------------- Panel (staff) ----------------
export async function panelSetStatusAction(formData: FormData) {
  const staff = await requireStaff();
  if (!staff) redirect("/panel/ingresar");
  const id = String(formData.get("id") || "");
  const status = String(formData.get("status") || "") as
    | "completada"
    | "no_show"
    | "cancelada";
  setAppointmentStatus(id, status);
  revalidatePath("/panel");
}
