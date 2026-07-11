"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";

const LINKS = [
  { href: "#servicios", label: "Servicios" },
  { href: "#barberos", label: "Barberos" },
  { href: "#fragancias", label: "Fragancias" },
  { href: "#galeria", label: "Galería" },
  { href: "#ubicacion", label: "Ubicación" },
];

export function Nav() {
  const [open, setOpen] = useState(false);

  return (
    <header className="sticky top-0 z-50 border-b border-white/5 bg-ink/80 backdrop-blur-md">
      <nav className="mx-auto flex max-w-6xl items-center justify-between px-5 py-3">
        <Link href="/" className="flex items-center gap-2" aria-label="Inicio">
          <Image
            src="/logo-5.png"
            alt="Flow Site"
            width={555}
            height={590}
            className="h-8 w-auto mix-blend-screen"
          />
          <span className="font-display text-lg tracking-wide">FLOW SITE</span>
        </Link>

        {/* Links desktop */}
        <ul className="hidden items-center gap-7 md:flex">
          {LINKS.map((l) => (
            <li key={l.href}>
              <a
                href={l.href}
                className="text-sm text-ash transition-colors hover:text-bone"
              >
                {l.label}
              </a>
            </li>
          ))}
        </ul>

        <div className="flex items-center gap-3">
          <Link
            href="/reservar"
            className="hidden rounded-full bg-flow-red px-5 py-2 text-sm font-semibold text-white shadow-lg shadow-flow-red/20 transition-transform hover:scale-105 sm:inline-block"
          >
            Reservar turno
          </Link>

          {/* Hamburguesa mobile */}
          <button
            onClick={() => setOpen((v) => !v)}
            className="flex h-9 w-9 items-center justify-center rounded-lg border border-white/10 md:hidden"
            aria-label="Menú"
            aria-expanded={open}
          >
            <span className="text-lg">{open ? "✕" : "☰"}</span>
          </button>
        </div>
      </nav>

      {/* Menú mobile */}
      {open && (
        <ul className="flex flex-col gap-1 border-t border-white/5 px-5 pb-4 pt-2 md:hidden">
          {LINKS.map((l) => (
            <li key={l.href}>
              <a
                href={l.href}
                onClick={() => setOpen(false)}
                className="block rounded-lg px-3 py-2.5 text-ash transition-colors hover:bg-white/5 hover:text-bone"
              >
                {l.label}
              </a>
            </li>
          ))}
          <li>
            <Link
              href="/reservar"
              onClick={() => setOpen(false)}
              className="mt-1 block rounded-full bg-flow-red px-4 py-2.5 text-center font-semibold text-white"
            >
              Reservar turno
            </Link>
          </li>
        </ul>
      )}
    </header>
  );
}
