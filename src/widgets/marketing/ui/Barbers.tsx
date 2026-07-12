import Image from "next/image";
import { SectionHeading } from "@/shared/ui/SectionHeading";
import { Reveal, Stagger, StaggerItem } from "@/shared/ui/Motion";
import { BARBERS } from "@/shared/config/data";

export function Barbers() {
  return (
    <section id="barberos" className="border-y border-white/5 bg-ink-2/40">
      <div className="mx-auto max-w-6xl px-5 py-24">
        <Reveal>
          <SectionHeading eyebrow="El equipo" title="Nuestros" accent="barberos" />
        </Reveal>

        {/* ⚠️ Fotos de muestra (Unsplash). Reemplazar por el equipo real de Flow. */}
        <Stagger className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {BARBERS.map((b) => (
            <StaggerItem key={b.name} className="h-full">
              <div className="group h-full overflow-hidden rounded-2xl border border-white/8 bg-ink-2 transition-all duration-300 hover:-translate-y-1 hover:border-flow-cyan/30">
                <div className="relative h-64 overflow-hidden">
                  <Image
                    src={b.img}
                    alt={b.name}
                    fill
                    sizes="(max-width: 1024px) 50vw, 33vw"
                    className="object-cover transition-transform duration-500 group-hover:scale-105"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-ink via-ink/10 to-transparent" />
                  <span className="absolute right-2 top-2 rounded-full bg-ink/70 px-2 py-0.5 text-[9px] uppercase tracking-wider text-ash backdrop-blur-sm">
                    Muestra
                  </span>
                </div>
                <div className="p-5">
                  <h3 className="font-display text-2xl">{b.name}</h3>
                  <p className="text-sm text-flow-cyan">{b.role}</p>
                  <p className="mt-2 text-sm text-ash">{b.specialty}</p>
                </div>
              </div>
            </StaggerItem>
          ))}
        </Stagger>

        <p className="mt-8 text-center text-sm text-ash">
          Al reservar vas a poder elegir con qué barbero atenderte.
        </p>
      </div>
    </section>
  );
}
