"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

type QueueItem = {
  id: string;
  startMs: number;
  endMs: number;
  time: string;
  client: string;
  service: string;
  status: string;
};
type BarberQueue = { id: string; name: string; img: string; items: QueueItem[] };

function fmtClock(ms: number): string {
  return new Intl.DateTimeFormat("es-AR", {
    timeZone: "America/Argentina/Buenos_Aires",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(new Date(ms));
}

function split(items: QueueItem[], now: number) {
  const live = items.filter((i) => i.status === "confirmada" || i.status === "completada");
  const atendiendo = live.find((i) => i.startMs <= now && now < i.endMs && i.status === "confirmada");
  const upcoming = live
    .filter((i) => i.startMs > now && i.status === "confirmada")
    .sort((a, b) => a.startMs - b.startMs);
  const siguiente = atendiendo ? upcoming[0] : upcoming[0];
  const espera = atendiendo ? upcoming : upcoming.slice(1);
  const atendidos = items.filter((i) => i.status === "completada" || i.endMs <= now);
  return { atendiendo, siguiente: atendiendo ? upcoming[0] : siguiente, espera, atendidos };
}

function relMin(ms: number, now: number): string {
  const m = Math.round((ms - now) / 60000);
  if (m <= 0) return "ahora";
  if (m < 60) return `en ${m} min`;
  return `en ${Math.floor(m / 60)}h ${m % 60}m`;
}

export function ColaView({ barbers, single, serverNow }: { barbers: BarberQueue[]; single: boolean; serverNow: number }) {
  const [now, setNow] = useState(serverNow);
  useEffect(() => {
    setNow(Date.now());
    const t = setInterval(() => setNow(Date.now()), 15000);
    return () => clearInterval(t);
  }, []);

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="font-display text-3xl">Cola del día</h1>
          <p className="text-sm text-muted-foreground">Quién se está atendiendo y quién sigue.</p>
        </div>
        <div className="flex items-center gap-2">
          <motion.span
            className="h-2.5 w-2.5 rounded-full bg-flow-red"
            animate={{ opacity: [1, 0.3, 1], scale: [1, 0.85, 1] }}
            transition={{ duration: 1.6, repeat: Infinity }}
          />
          <span className="text-xs font-semibold uppercase tracking-widest text-flow-red">En vivo</span>
          <span className="ml-3 font-display text-2xl tabular-nums" suppressHydrationWarning>{fmtClock(now)}</span>
        </div>
      </div>

      {barbers.length === 0 ? (
        <p className="rounded-xl border border-border bg-card px-4 py-10 text-center text-muted-foreground">
          No hay barberos para mostrar.
        </p>
      ) : single ? (
        <SingleQueue barber={barbers[0]} now={now} />
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {barbers.map((b) => (
            <BarberCard key={b.id} barber={b} now={now} />
          ))}
        </div>
      )}
    </div>
  );
}

/* ---------- Vista del barbero (full) ---------- */
function SingleQueue({ barber, now }: { barber: BarberQueue; now: number }) {
  const { atendiendo, siguiente, espera, atendidos } = split(barber.items, now);
  return (
    <div className="grid gap-5 lg:grid-cols-[1.3fr_1fr]">
      {/* Atendiendo ahora */}
      <motion.div layout className="relative overflow-hidden rounded-2xl border border-flow-cyan/30 bg-card p-6">
        <div className="glow-cyan pointer-events-none absolute -right-16 -top-16 h-48 w-48 opacity-20" />
        <div className="mb-3 flex items-center gap-2">
          <motion.span className="h-2 w-2 rounded-full bg-flow-cyan" animate={{ opacity: [1, 0.3, 1] }} transition={{ duration: 1.4, repeat: Infinity }} />
          <span className="text-xs font-semibold uppercase tracking-[0.25em] text-flow-cyan">En el sillón</span>
        </div>
        <AnimatePresence mode="wait">
          {atendiendo ? (
            <motion.div key={atendiendo.id} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -12 }}>
              <p className="font-display text-4xl leading-tight">{atendiendo.client}</p>
              <p className="mt-1 text-muted-foreground">{atendiendo.service} · empezó {atendiendo.time}</p>
              <Progress start={atendiendo.startMs} end={atendiendo.endMs} now={now} />
            </motion.div>
          ) : (
            <motion.div key="libre" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="py-6">
              <p className="font-display text-3xl text-muted-foreground">Sillón libre</p>
              <p className="mt-1 text-sm text-muted-foreground">{siguiente ? `Próximo: ${siguiente.client} ${relMin(siguiente.startMs, now)}` : "Sin más turnos hoy"}</p>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>

      {/* Siguiente */}
      <motion.div layout className="rounded-2xl border border-amber-400/30 bg-card p-6">
        <span className="text-xs font-semibold uppercase tracking-[0.25em] text-amber-300">Siguiente</span>
        <AnimatePresence mode="wait">
          {siguiente ? (
            <motion.div key={siguiente.id} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -12 }} className="mt-2">
              <p className="font-display text-3xl">{siguiente.client}</p>
              <p className="mt-1 text-muted-foreground">{siguiente.service}</p>
              <p className="mt-2 text-sm"><span className="text-amber-300">{siguiente.time} hs</span> · {relMin(siguiente.startMs, now)}</p>
            </motion.div>
          ) : (
            <p className="mt-3 text-muted-foreground">No hay nadie esperando.</p>
          )}
        </AnimatePresence>
      </motion.div>

      {/* En espera */}
      <div className="lg:col-span-2">
        <div className="mb-2 flex items-center justify-between">
          <h2 className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">En espera ({espera.length})</h2>
          <span className="text-xs text-muted-foreground">Atendidos hoy: {atendidos.length}</span>
        </div>
        <motion.ol layout className="space-y-2">
          <AnimatePresence>
            {espera.map((i, idx) => (
              <motion.li
                key={i.id}
                layout
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="flex items-center gap-4 rounded-xl border border-border bg-card px-4 py-3"
              >
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-secondary font-display text-sm">{idx + 1}</span>
                <div className="flex-1">
                  <p className="font-medium">{i.client}</p>
                  <p className="text-xs text-muted-foreground">{i.service}</p>
                </div>
                <div className="text-right">
                  <p className="font-display text-lg text-flow-cyan">{i.time}</p>
                  <p className="text-xs text-muted-foreground">{relMin(i.startMs, now)}</p>
                </div>
              </motion.li>
            ))}
          </AnimatePresence>
          {espera.length === 0 && <p className="rounded-xl border border-border bg-card px-4 py-6 text-center text-sm text-muted-foreground">Nadie en espera.</p>}
        </motion.ol>
      </div>
    </div>
  );
}

/* ---------- Tarjeta por barbero (admin) ---------- */
function BarberCard({ barber, now }: { barber: BarberQueue; now: number }) {
  const { atendiendo, siguiente, espera } = split(barber.items, now);
  return (
    <motion.div layout className="rounded-2xl border border-border bg-card p-5">
      <div className="mb-4 flex items-center gap-3">
        <Avatar className="h-10 w-10">
          <AvatarImage src={barber.img} alt={barber.name} />
          <AvatarFallback>{barber.name[0]}</AvatarFallback>
        </Avatar>
        <div>
          <p className="font-display text-lg">{barber.name}</p>
          <p className="text-xs text-muted-foreground">{espera.length} en espera</p>
        </div>
      </div>

      <div className={`mb-3 rounded-xl border p-3 ${atendiendo ? "border-flow-cyan/30 bg-flow-cyan/5" : "border-border"}`}>
        <div className="flex items-center gap-1.5">
          {atendiendo && <motion.span className="h-1.5 w-1.5 rounded-full bg-flow-cyan" animate={{ opacity: [1, 0.3, 1] }} transition={{ duration: 1.4, repeat: Infinity }} />}
          <span className="text-[10px] font-semibold uppercase tracking-widest text-flow-cyan">Ahora</span>
        </div>
        <AnimatePresence mode="wait">
          <motion.div key={atendiendo?.id ?? "libre"} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            {atendiendo ? (
              <>
                <p className="font-display text-xl leading-tight">{atendiendo.client}</p>
                <p className="text-xs text-muted-foreground">{atendiendo.service}</p>
                <Progress start={atendiendo.startMs} end={atendiendo.endMs} now={now} thin />
              </>
            ) : (
              <p className="text-sm text-muted-foreground">Sillón libre</p>
            )}
          </motion.div>
        </AnimatePresence>
      </div>

      <div className="flex items-center justify-between rounded-xl border border-amber-400/20 px-3 py-2">
        <span className="text-[10px] font-semibold uppercase tracking-widest text-amber-300">Sigue</span>
        {siguiente ? (
          <span className="text-sm"><span className="text-foreground">{siguiente.client}</span> · <span className="text-amber-300">{siguiente.time}</span></span>
        ) : (
          <span className="text-sm text-muted-foreground">—</span>
        )}
      </div>
    </motion.div>
  );
}

function Progress({ start, end, now, thin }: { start: number; end: number; now: number; thin?: boolean }) {
  const pct = Math.max(0, Math.min(100, ((now - start) / (end - start)) * 100));
  return (
    <div className={`mt-3 overflow-hidden rounded-full bg-secondary ${thin ? "h-1" : "h-1.5"}`}>
      <motion.div className="h-full rounded-full bg-flow-cyan" initial={{ width: 0 }} animate={{ width: `${pct}%` }} transition={{ duration: 0.6 }} />
    </div>
  );
}
