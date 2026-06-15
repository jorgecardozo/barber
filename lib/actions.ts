"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import {
  cancelAppointment,
  confirmDepositEfectivo,
  createHold,
  createUser,
  findUserByEmail,
  getAppointment,
  payDepositMercadoPago,
  registrarSaldo,
  registrarSenaEfectivo,
  setAppointmentStatus,
  setUserAvatar,
  SlotTakenError,
  updateBarber,
} from "./store";
import { clearSession, getSessionUser, requireStaff, setSession } from "./auth";
import { DECISIONS } from "./decisions";
import type { PaymentMethod } from "./types";

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

/** Guarda el avatar personalizado del cliente. */
export async function guardarAvatarAction(formData: FormData) {
  const user = await getSessionUser();
  if (!user) redirect("/ingresar?next=/perfil");
  const url = String(formData.get("avatarUrl") || "");
  if (url.startsWith("https://api.dicebear.com/")) {
    setUserAvatar(user.id, url);
    // Si es barbero, su avatar se usa también en su perfil público (dashboard, cola, etc.)
    if (user.role === "barbero" && user.barberId) {
      updateBarber(user.barberId, { img: url });
    }
  }
  revalidatePath("/perfil");
  revalidatePath("/mis-turnos");
  revalidatePath("/panel");
  revalidatePath("/panel/cola");
}

// ---------------- Reserva ----------------
export async function crearReservaAction(formData: FormData) {
  const serviceId = String(formData.get("serviceId") || "");
  const barberId = String(formData.get("barberId") || "");
  const startISO = String(formData.get("startISO") || "");
  const metodo = (String(formData.get("metodo") || "mercadopago") as PaymentMethod);

  const user = await getSessionUser();
  if (!user) redirect(`/ingresar?next=${encodeURIComponent("/reservar")}`);

  let apptId: string;
  try {
    const appt = createHold({
      serviceId,
      barberId,
      startISO,
      depositMethod: metodo,
      customerId: user.id,
      customerName: user.name,
      customerPhone: user.phone,
    });
    apptId = appt.id;
  } catch (e) {
    if (e instanceof SlotTakenError) redirect(`/reservar?error=tomado`);
    throw e;
  }

  if (metodo === "efectivo") {
    confirmDepositEfectivo(apptId); // confirma directo, seña a pagar en el local
    redirect(`/reservar/confirmacion/${apptId}`);
  }
  redirect(`/reservar/pago/${apptId}`);
}

/** Simula el pago de la seña en MercadoPago → confirma el turno. */
export async function pagarSeniaAction(formData: FormData) {
  const id = String(formData.get("id") || "");
  try {
    payDepositMercadoPago(id);
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
  if (!user || !appt || appt.customerId !== user.id) redirect("/mis-turnos");
  const horas = (Date.parse(appt.start) - Date.now()) / 3_600_000;
  if (horas < DECISIONS.cancelWindowHours) redirect("/mis-turnos?error=tarde");
  cancelAppointment(id);
  revalidatePath("/mis-turnos");
}

// ---------------- Panel (staff) ----------------
export async function panelSetStatusAction(formData: FormData) {
  const staff = await requireStaff();
  if (!staff) redirect("/panel/ingresar");
  const id = String(formData.get("id") || "");
  const status = String(formData.get("status") || "") as "completada" | "no_show" | "cancelada";
  setAppointmentStatus(id, status);
  revalidatePath("/panel");
  revalidatePath("/panel/turnos");
  revalidatePath("/panel/cola");
}

/** Cola: sentar al cliente en el sillón (en curso). */
export async function empezarTurnoAction(formData: FormData) {
  if (!(await requireStaff())) redirect("/panel/ingresar");
  setAppointmentStatus(String(formData.get("id") || ""), "en_curso");
  revalidatePath("/panel/cola");
  revalidatePath("/panel/turnos");
}

/** Cola: terminar la atención cobrando el saldo (efectivo/MP) o sin cobro. */
export async function terminarTurnoAction(formData: FormData) {
  if (!(await requireStaff())) redirect("/panel/ingresar");
  const id = String(formData.get("id") || "");
  const method = String(formData.get("method") || "");
  const appt = getAppointment(id);
  if (appt && appt.balanceStatus === "pendiente" && (method === "efectivo" || method === "mercadopago")) {
    registrarSaldo(id, method as PaymentMethod);
  }
  setAppointmentStatus(id, "completada");
  revalidatePath("/panel/cola");
  revalidatePath("/panel/turnos");
  revalidatePath("/panel");
}

/** Cola: marcar que el cliente no vino (no-show). */
export async function noShowTurnoAction(formData: FormData) {
  if (!(await requireStaff())) redirect("/panel/ingresar");
  setAppointmentStatus(String(formData.get("id") || ""), "no_show");
  revalidatePath("/panel/cola");
  revalidatePath("/panel/turnos");
}

/** Registra el cobro de la seña en efectivo. */
export async function registrarSenaEfectivoAction(formData: FormData) {
  const staff = await requireStaff();
  if (!staff) redirect("/panel/ingresar");
  registrarSenaEfectivo(String(formData.get("id") || ""));
  revalidatePath("/panel/turnos");
  revalidatePath("/panel");
}

/** Registra el cobro del saldo (en el local) por efectivo o MercadoPago. */
export async function registrarSaldoAction(formData: FormData) {
  const staff = await requireStaff();
  if (!staff) redirect("/panel/ingresar");
  const id = String(formData.get("id") || "");
  const method = String(formData.get("method") || "efectivo") as PaymentMethod;
  registrarSaldo(id, method);
  revalidatePath("/panel/turnos");
  revalidatePath("/panel");
}
