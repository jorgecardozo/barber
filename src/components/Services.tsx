import Link from "next/link";
import { SectionHeading } from "./SectionHeading";
import { Reveal, Stagger, StaggerItem } from "./Motion";
import { SERVICES } from "@/shared/config/data";

export function Services() {
  return (
    <section id="servicios" className="mx-auto max-w-6xl px-5 py-24">
      <Reveal>
        <SectionHeading eyebrow="Lo que hacemos" title="Cortes &" accent="servicios" />
      </Reveal>

      <Stagger className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {SERVICES.map((s) => (
          <StaggerItem key={s.name} className="h-full">
            <div
              className={`group relative flex h-full flex-col rounded-2xl border p-6 transition-all duration-300 hover:-translate-y-1 ${
                s.featured
                  ? "border-flow-red/40 bg-flow-red/5"
                  : "border-white/8 bg-ink-2 hover:border-white/15"
              }`}
            >
              {s.featured && (
                <span className="absolute right-4 top-4 rounded-full bg-flow-red px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-white">
                  Más pedido
                </span>
              )}
              <h3 className="font-display text-2xl">{s.name}</h3>
              <p className="mt-2 flex-1 text-sm text-ash">{s.description}</p>
              <div className="mt-6 flex items-end justify-between">
                <span className="font-display text-3xl text-flow-cyan">
                  {s.price}
                </span>
                <span className="text-xs uppercase tracking-wider text-ash">
                  {s.duration}
                </span>
              </div>
            </div>
          </StaggerItem>
        ))}
      </Stagger>

      <Reveal className="mt-12 text-center" delay={0.1}>
        <Link
          href="/reservar"
          className="inline-block rounded-full bg-flow-red px-8 py-3.5 font-semibold text-white shadow-xl shadow-flow-red/25 transition-transform hover:scale-105"
        >
          Reservar mi turno →
        </Link>
      </Reveal>
    </section>
  );
}
