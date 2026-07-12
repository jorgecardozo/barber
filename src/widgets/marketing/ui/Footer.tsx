import Image from "next/image";
import { BUSINESS } from "@/shared/config/data";

export function Footer() {
  return (
    <footer className="border-t border-white/5 bg-ink">
      <div className="mx-auto flex max-w-6xl flex-col items-center gap-6 px-5 py-12 text-center">
        <div className="flex items-center gap-2">
          <Image
            src="/logo-5.png"
            alt="Flow Site"
            width={555}
            height={590}
            className="h-10 w-auto mix-blend-screen"
          />
          <span className="font-display text-xl tracking-wide">FLOW SITE</span>
        </div>
        <p className="max-w-sm text-sm text-ash">
          {BUSINESS.description} · {BUSINESS.address}. {BUSINESS.hours}, turnos
          online.
        </p>
        <div className="flex gap-6 text-sm text-ash">
          <a
            href={BUSINESS.instagram}
            target="_blank"
            rel="noopener noreferrer"
            className="transition-colors hover:text-bone"
          >
            Instagram
          </a>
          <a
            href={`https://wa.me/${BUSINESS.whatsapp}`}
            target="_blank"
            rel="noopener noreferrer"
            className="transition-colors hover:text-bone"
          >
            WhatsApp
          </a>
          <a href="#ubicacion" className="transition-colors hover:text-bone">
            Cómo llegar
          </a>
        </div>
        <p className="text-xs text-ash/60">
          © {new Date().getFullYear()} {BUSINESS.name}. Hecho con flow.
        </p>
      </div>
    </footer>
  );
}
