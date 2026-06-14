import Link from "next/link";
import type { Metadata } from "next";
import { BrandMark } from "@/components/BrandMark";
import { BUSINESS } from "@/lib/data";

export const metadata: Metadata = {
  title: "Reservar turno · Flow Site",
};

/**
 * ETAPA 2 — Acá va la app de reservas:
 *   1) elegir servicio  2) elegir barbero  3) elegir fecha/horario
 *   4) datos del cliente  5) confirmación + panel admin
 * Por ahora es un placeholder que dirige al turno por WhatsApp.
 */
export default function ReservarPage() {
  return (
    <main className="grid-bg flex flex-1 flex-col items-center justify-center px-5 py-24 text-center">
      <div className="glow-red pointer-events-none absolute h-96 w-96 opacity-40" />
      <BrandMark className="relative text-9xl" />
      <h1 className="relative mt-8 font-display text-4xl md:text-5xl">
        Reservas online <span className="chrome-text italic">en camino</span>
      </h1>
      <p className="relative mt-4 max-w-md text-ash">
        Estamos terminando el sistema de turnos online (elegí corte, barbero,
        día y horario). Mientras tanto, coordiná tu turno directo por WhatsApp o
        Instagram.
      </p>
      <div className="relative mt-8 flex flex-wrap justify-center gap-3">
        <a
          href={`https://wa.me/${BUSINESS.whatsapp}`}
          target="_blank"
          rel="noopener noreferrer"
          className="rounded-full bg-flow-red px-7 py-3.5 font-semibold text-white shadow-xl shadow-flow-red/25 transition-transform hover:scale-105"
        >
          Reservar por WhatsApp
        </a>
        <Link
          href="/"
          className="rounded-full border border-white/15 px-7 py-3.5 font-semibold text-bone transition-colors hover:bg-white/5"
        >
          ← Volver al inicio
        </Link>
      </div>
    </main>
  );
}
