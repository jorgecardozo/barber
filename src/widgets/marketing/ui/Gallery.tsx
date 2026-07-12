import Image from "next/image";
import { SectionHeading } from "@/shared/ui/SectionHeading";
import { Reveal } from "@/shared/ui/Motion";
import { GALLERY } from "@/shared/config/data";

export function Gallery() {
  return (
    <section id="galeria" className="border-y border-white/5 bg-ink-2/40">
      <div className="mx-auto max-w-6xl px-5 py-24">
        <Reveal>
          <SectionHeading eyebrow="El poder del corte" title="Galería de" accent="trabajos" />
        </Reveal>

        {/* ⚠️ Fotos de muestra (Unsplash). Reemplazar por trabajos reales de Flow. */}
        <Reveal className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {GALLERY.map((g, i) => (
            <div
              key={g.id}
              className={`group relative overflow-hidden rounded-xl border border-white/8 ${
                i === 0 ? "col-span-2 row-span-2 aspect-square" : "aspect-square"
              }`}
            >
              <Image
                src={g.img}
                alt={g.label}
                fill
                sizes="(max-width: 640px) 50vw, 33vw"
                className="object-cover transition-transform duration-500 group-hover:scale-105"
              />
              {/* Degradado para legibilidad */}
              <div className="absolute inset-0 bg-gradient-to-t from-ink/90 via-transparent to-transparent" />
              <span className="absolute bottom-3 left-3 text-sm font-semibold drop-shadow">
                {g.label}
              </span>
              <span className="absolute right-2 top-2 rounded-full bg-ink/70 px-2 py-0.5 text-[9px] uppercase tracking-wider text-ash backdrop-blur-sm">
                Muestra
              </span>
            </div>
          ))}
        </Reveal>
      </div>
    </section>
  );
}
