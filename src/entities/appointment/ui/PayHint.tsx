import { METODO } from "@/entities/appointment/model/turno";

// Indicador de pago (seña/saldo): pagado con método, o pendiente.
export function PayHint({ status, method }: { status: "pendiente" | "pagado"; method: string | null }) {
  return (
    <span className={`block text-[11px] ${status === "pagado" ? "text-teal-700 dark:text-flow-cyan" : "text-amber-700 dark:text-amber-300/80"}`}>
      {status === "pagado" ? `✓ ${method ? METODO[method] : ""}` : `pendiente${method ? " · " + METODO[method] : ""}`}
    </span>
  );
}
