/**
 * DECISIONES DE PRODUCTO — Etapa 2 (app de turnos)
 * Tomadas según el plan (docs/PLAN-etapa2-turnos.md §2). Centralizadas acá
 * para que sean fáciles de auditar y cambiar.
 */
export const DECISIONS = {
  // --- Seña / depósito ---
  // seña = max(piso, ceil(precio * pct/100)), tope = precio.
  // Sin "exención por precio bajo" (todo servicio pago tiene seña > 0).
  depositPct: 40,
  depositFloorCents: 100_000, // $1.000 ARS

  // --- Cancelación / reprogramación ---
  cancelWindowHours: 4,
  depositRefundable: false, // no reembolsable dentro de plazo (cubre el no-show)

  // --- Holds (reserva temporal mientras se paga la seña) ---
  holdTtlMinutes: 12,

  // --- Disponibilidad ---
  horizonDays: 14, // hasta cuántos días para adelante se puede reservar
  leadTimeMinutes: 60, // anticipación mínima
  slotGranularityMinutes: 15,
  bufferMinutes: 5, // descanso entre turnos

  // --- Timezone (Argentina, sin DST → offset fijo) ---
  timezone: "America/Argentina/Buenos_Aires",
  tzOffset: "-03:00",

  // --- Pagos ---
  // En esta build el checkout de MercadoPago está SIMULADO (no cobra de verdad).
  paymentMode: "mercadopago-simulado" as const,
  onlyOnlinePayments: true,

  // --- Negocio ---
  business: {
    name: "Flow Site",
    address: "San José Obrero 993",
    whatsapp: "5490000000000", // ⚠️ placeholder — reemplazar por el real
  },
} as const;

/** Seña en centavos para un precio dado (centavos). */
export function depositForPrice(priceCents: number): number {
  const pct = Math.ceil((priceCents * DECISIONS.depositPct) / 100);
  return Math.min(priceCents, Math.max(DECISIONS.depositFloorCents, pct));
}
