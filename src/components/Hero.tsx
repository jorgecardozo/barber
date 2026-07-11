"use client";

import Link from "next/link";
import Image from "next/image";
import { motion, type Variants } from "motion/react";
import { BUSINESS } from "@/lib/data";

const EASE = [0.22, 1, 0.36, 1] as const;

const container: Variants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.12, delayChildren: 0.1 } },
};

const item: Variants = {
  hidden: { opacity: 0, y: 24 },
  show: { opacity: 1, y: 0, transition: { duration: 0.6, ease: EASE } },
};

export function Hero() {
  return (
    <section className="relative overflow-hidden grid-bg">
      {/* Halos de color */}
      <div className="glow-red pointer-events-none absolute -left-40 -top-40 h-[480px] w-[480px] opacity-60" />
      <div className="glow-cyan pointer-events-none absolute -bottom-52 -right-40 h-[420px] w-[420px] opacity-50" />

      <div className="relative mx-auto grid max-w-6xl items-center gap-10 px-5 py-20 md:grid-cols-[1.1fr_0.9fr] md:py-28">
        {/* Texto */}
        <motion.div variants={container} initial="hidden" animate="show">
          <motion.p
            variants={item}
            className="mb-4 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-1.5 text-xs font-medium tracking-widest text-flow-cyan"
          >
            <span className="h-1.5 w-1.5 rounded-full bg-flow-cyan" />
            BARBERÍA & FRAGANCIAS
          </motion.p>

          <motion.h1
            variants={item}
            className="font-display text-5xl leading-[0.95] sm:text-6xl md:text-7xl"
          >
            EL SITIO
            <br />
            DEL <span className="chrome-text italic">FLOW</span>
          </motion.h1>

          <motion.p variants={item} className="mt-6 max-w-md text-lg text-ash">
            Cortes con flow y fragancias árabes originales.{" "}
            <span className="text-bone">{BUSINESS.hours}</span> en{" "}
            {BUSINESS.address}.
          </motion.p>

          <motion.div
            variants={item}
            className="mt-8 flex flex-wrap items-center gap-4"
          >
            <Link
              href="/reservar"
              className="rounded-full bg-flow-red px-7 py-3.5 font-semibold text-white shadow-[0_10px_30px_-10px] shadow-flow-red/60 ring-1 ring-white/10 transition-transform hover:scale-105"
            >
              Reservar turno →
            </Link>
            <a
              href="#fragancias"
              className="rounded-full border border-flow-cyan/60 bg-flow-cyan/5 px-7 py-3.5 font-semibold text-flow-cyan transition-colors hover:bg-flow-cyan/15"
            >
              Ver fragancias
            </a>
          </motion.div>

          {/* Mini stats */}
          <motion.dl variants={item} className="mt-14 flex">
            {[
              { n: "2.3k+", l: "Seguidores" },
              { n: "129+", l: "Trabajos" },
              { n: "7", l: "Días/semana" },
            ].map((s, i) => (
              <div
                key={s.l}
                className={i === 0 ? "pr-6" : "border-l border-white/10 px-6"}
              >
                <dt className="font-display text-3xl leading-none">{s.n}</dt>
                <dd className="mt-1.5 text-xs uppercase tracking-wider text-ash">
                  {s.l}
                </dd>
              </div>
            ))}
          </motion.dl>
        </motion.div>

        {/* Logo gigante */}
        <motion.div
          className="relative flex justify-center md:justify-end"
          initial={{ opacity: 0, scale: 0.8, rotate: -6 }}
          animate={{ opacity: 1, scale: 1, rotate: 0 }}
          transition={{ duration: 0.9, ease: EASE, delay: 0.2 }}
        >
          <div className="glow-red absolute inset-0 scale-90 opacity-70" />
          <Image
            src="/logo-5.png"
            alt="Flow Site"
            width={555}
            height={590}
            priority
            className="relative w-56 mix-blend-screen [animation:var(--animate-float)] [mask-image:radial-gradient(circle_at_center,black_45%,transparent_70%)] sm:w-72 md:w-96"
          />
        </motion.div>
      </div>
    </section>
  );
}
