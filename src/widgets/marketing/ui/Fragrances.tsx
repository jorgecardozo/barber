import Image from "next/image";
import { SectionHeading } from "@/shared/ui/SectionHeading";
import { Reveal, Stagger, StaggerItem } from "@/shared/ui/Motion";
import { FRAGRANCES, BUSINESS } from "@/shared/config/data";

export function Fragrances() {
  return (
    <section id="fragancias" className="relative overflow-hidden">
      <div className="glow-cyan pointer-events-none absolute -right-40 top-20 h-96 w-96 opacity-30" />

      <div className="relative mx-auto max-w-6xl px-5 py-24">
        <Reveal>
          <SectionHeading
            eyebrow="Perfumes árabes G5 & Originales"
            title="Fragancias"
            accent="con flow"
          />
        </Reveal>

        <Stagger className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {FRAGRANCES.map((f) => (
            <StaggerItem key={f.name} className="h-full">
              <div className="group flex h-full items-center gap-4 overflow-hidden rounded-2xl border border-white/8 bg-gradient-to-br from-ink-2 to-ink p-5 transition-all duration-300 hover:-translate-y-1 hover:border-flow-cyan/30">
                {/* Foto del perfume (muestra) */}
                <div className="relative h-20 w-16 shrink-0 overflow-hidden rounded-md border border-white/8">
                  <Image
                    src={f.img}
                    alt={f.name}
                    fill
                    sizes="64px"
                    className="object-cover transition-transform duration-300 group-hover:scale-110"
                  />
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <h3 className="truncate font-display text-xl">{f.name}</h3>
                    <span
                      className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide ${
                        f.type === "Original"
                          ? "border border-flow-cyan/50 text-flow-cyan"
                          : "bg-flow-red text-white"
                      }`}
                    >
                      {f.type}
                    </span>
                  </div>
                  <p className="text-sm text-ash">{f.house}</p>
                  <p className="mt-1 truncate text-xs text-ash/70">{f.notes}</p>
                </div>
              </div>
            </StaggerItem>
          ))}
        </Stagger>

        <Reveal className="mt-12 text-center" delay={0.1}>
          <a
            href={BUSINESS.instagram}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-block rounded-full border border-flow-cyan/40 px-8 py-3.5 font-semibold text-flow-cyan transition-colors hover:bg-flow-cyan/10"
          >
            Ver catálogo completo en Instagram
          </a>
        </Reveal>
      </div>
    </section>
  );
}
