/** Formateo de dinero en pesos argentinos. Montos siempre en centavos. */

export function formatARS(cents: number): string {
  return new Intl.NumberFormat("es-AR", {
    style: "currency",
    currency: "ARS",
    maximumFractionDigits: 0,
  }).format(cents / 100);
}
