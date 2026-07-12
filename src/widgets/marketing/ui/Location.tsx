import Link from "next/link";
import { Reveal } from "@/shared/ui/Motion";
import { MapPinIcon, ClockIcon, InstagramIcon } from "@/shared/ui/icons";
import { BUSINESS } from "@/shared/config/data";

export function Location() {
  const mapsQuery = encodeURIComponent(BUSINESS.address);

  return (
    <section id="ubicacion" className="mx-auto max-w-6xl px-5 py-24">
      <div className="grid items-stretch gap-6 md:grid-cols-2">
        {/* Info */}
        <Reveal className="flex flex-col justify-center rounded-2xl border border-white/8 bg-ink-2 p-8">
          <p className="mb-3 text-xs font-medium uppercase tracking-[0.3em] text-flow-cyan">
            Pasá por el local
          </p>
          <h2 className="font-display text-4xl">
            Te esperamos en <span className="chrome-text italic">Flow Site</span>
          </h2>

          <dl className="mt-8 space-y-5">
            <div className="flex items-start gap-3">
              <MapPinIcon className="mt-0.5 h-5 w-5 shrink-0 text-flow-red" />
              <div>
                <dt className="text-xs uppercase tracking-wider text-ash">Dirección</dt>
                <dd className="text-lg">{BUSINESS.address}</dd>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <ClockIcon className="mt-0.5 h-5 w-5 shrink-0 text-flow-red" />
              <div>
                <dt className="text-xs uppercase tracking-wider text-ash">Horarios</dt>
                <dd className="text-lg">{BUSINESS.hours} · turnos online</dd>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <InstagramIcon className="mt-0.5 h-5 w-5 shrink-0 text-flow-red" />
              <div>
                <dt className="text-xs uppercase tracking-wider text-ash">Instagram</dt>
                <dd className="text-lg">
                  <a
                    href={BUSINESS.instagram}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-flow-cyan hover:underline"
                  >
                    {BUSINESS.instagramHandle}
                  </a>
                </dd>
              </div>
            </div>
          </dl>

          <div className="mt-8 flex flex-wrap gap-3">
            <Link
              href="/reservar"
              className="rounded-full bg-flow-red px-6 py-3 font-semibold text-white shadow-lg shadow-flow-red/20 transition-transform hover:scale-105"
            >
              Reservar turno
            </Link>
            <a
              href={`https://wa.me/${BUSINESS.whatsapp}`}
              target="_blank"
              rel="noopener noreferrer"
              className="rounded-full border border-flow-cyan/40 px-6 py-3 font-semibold text-flow-cyan transition-colors hover:bg-flow-cyan/10"
            >
              Escribir por WhatsApp
            </a>
          </div>
        </Reveal>

        {/* Mapa */}
        <Reveal className="group relative min-h-[320px] overflow-hidden rounded-2xl border border-white/8" delay={0.1}>
          {/* Tinte para integrarlo al tema oscuro (se aclara al hover) */}
          <div className="pointer-events-none absolute inset-0 z-10 bg-flow-red/10 mix-blend-multiply transition-opacity duration-300 group-hover:opacity-0" />
          <iframe
            title="Ubicación de Flow Site"
            src={`https://maps.google.com/maps?q=${mapsQuery}&output=embed`}
            className="h-full min-h-[320px] w-full grayscale invert-[0.92] hue-rotate-180 contrast-110 transition-all duration-300 group-hover:grayscale-0 group-hover:invert-0 group-hover:hue-rotate-0"
            loading="lazy"
          />
        </Reveal>
      </div>
    </section>
  );
}
