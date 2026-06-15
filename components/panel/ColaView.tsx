"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { AnimatePresence, motion } from "motion/react";
import { Check, X, UserPlus, Zap, Loader2 } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { formatARS } from "@/lib/money";
import { empezarTurnoAction, noShowTurnoAction, terminarTurnoAction } from "@/lib/actions";

type QueueItem = {
  id: string;
  startMs: number;
  endMs: number;
  time: string;
  client: string;
  phone: string;
  service: string;
  status: string;
  balanceCents: number;
  balancePaid: boolean;
};
type BarberQueue = { id: string; name: string; img: string; items: QueueItem[] };

function fmtClock(ms: number): string {
  return new Intl.DateTimeFormat("es-AR", { timeZone: "America/Argentina/Buenos_Aires", hour: "2-digit", minute: "2-digit", hour12: false }).format(new Date(ms));
}

function split(items: QueueItem[]) {
  const atendiendo = items.find((i) => i.status === "en_curso");
  const pendientes = items.filter((i) => i.status === "confirmada").sort((a, b) => a.startMs - b.startMs);
  return { atendiendo, siguiente: pendientes[0], espera: pendientes.slice(1), atendidos: items.filter((i) => i.status === "completada" || i.status === "no_show") };
}

function waLink(phone: string, client: string): string {
  const txt = encodeURIComponent(`¡Hola ${client.split(" ")[0]}! Soy de Flow Site 💈 Se liberó un lugar, si querés podés venir antes. Avisanos 🙌`);
  return `https://wa.me/${phone}?text=${txt}`;
}

export function ColaView({ barbers, single, serverNow }: { barbers: BarberQueue[]; single: boolean; serverNow: number }) {
  const [now, setNow] = useState(serverNow);
  const [selected, setSelected] = useState<string | null>(null);
  useEffect(() => {
    setNow(Date.now());
    const t = setInterval(() => setNow(Date.now()), 20000);
    return () => clearInterval(t);
  }, []);
  const selectedBarber = selected ? barbers.find((b) => b.id === selected) ?? null : null;

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="font-display text-3xl">Cola del día</h1>
          <p className="text-sm text-muted-foreground">Atendé, cobrá y llamá al siguiente.</p>
        </div>
        <div className="flex items-center gap-2">
          <motion.span className="h-2.5 w-2.5 rounded-full bg-flow-red" animate={{ opacity: [1, 0.3, 1], scale: [1, 0.85, 1] }} transition={{ duration: 1.6, repeat: Infinity }} />
          <span className="text-xs font-semibold uppercase tracking-widest text-flow-red">En vivo</span>
          <span className="ml-3 font-display text-2xl tabular-nums" suppressHydrationWarning>{fmtClock(now)}</span>
        </div>
      </div>

      {barbers.length === 0 ? (
        <p className="rounded-xl border border-border bg-card px-4 py-10 text-center text-muted-foreground">No hay barberos para mostrar (¿franco hoy?).</p>
      ) : single ? (
        <SingleQueue barber={barbers[0]} />
      ) : selectedBarber ? (
        <div>
          <button onClick={() => setSelected(null)} className="mb-5 flex items-center gap-2 text-sm text-muted-foreground transition-colors hover:text-foreground">← Volver a todos los barberos</button>
          <div className="mb-5 flex items-center gap-3">
            <Avatar className="h-11 w-11"><AvatarImage src={selectedBarber.img} alt={selectedBarber.name} /><AvatarFallback>{selectedBarber.name[0]}</AvatarFallback></Avatar>
            <h2 className="font-display text-2xl">Cola de {selectedBarber.name}</h2>
          </div>
          <SingleQueue barber={selectedBarber} />
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {barbers.map((b) => <BarberCard key={b.id} barber={b} onClick={() => setSelected(b.id)} />)}
        </div>
      )}
    </div>
  );
}

/* ---------- Vista interactiva del barbero ---------- */
function SingleQueue({ barber }: { barber: BarberQueue }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const { atendiendo, siguiente, espera, atendidos } = split(barber.items);

  function act(action: (fd: FormData) => Promise<void>, id: string, msg: string, extra?: Record<string, string>) {
    start(async () => {
      const fd = new FormData();
      fd.set("id", id);
      if (extra) for (const [k, v] of Object.entries(extra)) fd.set(k, v);
      try {
        await action(fd);
        router.refresh();
        toast.success(msg);
      } catch {
        toast.error("No se pudo completar la acción.");
      }
    });
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,360px)_1fr]">
      {/* Sillón */}
      <motion.div layout className="relative overflow-hidden rounded-3xl border border-flow-cyan/25 bg-card p-6">
        <div className="mb-2 flex items-center gap-2">
          <motion.span className="h-2 w-2 rounded-full bg-flow-cyan" animate={{ opacity: atendiendo ? [1, 0.3, 1] : 0.4 }} transition={{ duration: 1.4, repeat: Infinity }} />
          <span className="text-xs font-semibold uppercase tracking-[0.25em] text-flow-cyan">{atendiendo ? "En el sillón" : "Sillón libre"}</span>
        </div>

        <div className="flex flex-col items-center">
          <BarberChair occupied={!!atendiendo} />
          <AnimatePresence mode="wait">
            {atendiendo ? (
              <motion.div key={atendiendo.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="-mt-2 text-center">
                <p className="font-display text-3xl leading-tight">{atendiendo.client}</p>
                <p className="text-sm text-muted-foreground">{atendiendo.service}</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  Saldo: {atendiendo.balancePaid ? <span className="text-flow-cyan">pago</span> : <span className="text-amber-300">{formatARS(atendiendo.balanceCents)} pendiente</span>}
                </p>
              </motion.div>
            ) : (
              <motion.p key="libre" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="-mt-2 text-center text-muted-foreground">
                {siguiente ? "Llamá al siguiente para empezar" : "No hay nadie esperando"}
              </motion.p>
            )}
          </AnimatePresence>
        </div>

        {/* Acciones del sillón */}
        <div className="mt-5">
          {atendiendo ? (
            <div className="flex flex-col gap-2">
              {atendiendo.balancePaid ? (
                <Button disabled={pending} onClick={() => act(terminarTurnoAction, atendiendo.id, "Turno terminado")}>
                  <Check className="h-4 w-4" /> Terminé
                </Button>
              ) : (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button disabled={pending}><Check className="h-4 w-4" /> Terminé · cobrar saldo</Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="center">
                    <DropdownMenuLabel>Saldo {formatARS(atendiendo.balanceCents)}</DropdownMenuLabel>
                    <DropdownMenuItem onSelect={() => act(terminarTurnoAction, atendiendo.id, "Cobrado en efectivo. ¡Listo!", { method: "efectivo" })}>Cobré en efectivo</DropdownMenuItem>
                    <DropdownMenuItem onSelect={() => act(terminarTurnoAction, atendiendo.id, "Cobrado por MercadoPago. ¡Listo!", { method: "mercadopago" })}>Cobré por MercadoPago</DropdownMenuItem>
                    <DropdownMenuItem onSelect={() => act(terminarTurnoAction, atendiendo.id, "Turno terminado")}>Sin cobrar saldo</DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              )}
              <Button variant="outline" disabled={pending} onClick={() => act(noShowTurnoAction, atendiendo.id, "Marcado como ausente")}>
                <X className="h-4 w-4" /> No vino / faltó
              </Button>
            </div>
          ) : siguiente ? (
            <Button className="w-full" disabled={pending} onClick={() => act(empezarTurnoAction, siguiente.id, `${siguiente.client} pasó al sillón`)}>
              <UserPlus className="h-4 w-4" /> Llamar a {siguiente.client.split(" ")[0]}
            </Button>
          ) : null}
        </div>
      </motion.div>

      {/* Cola */}
      <div>
        {/* Siguiente */}
        <AnimatePresence mode="popLayout">
          {siguiente && (
            <motion.div key={siguiente.id} layout initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, x: -24 }} className="mb-4 flex items-center gap-4 rounded-2xl border border-amber-400/30 bg-amber-400/5 p-4">
              <div className="flex-1">
                <span className="text-[10px] font-semibold uppercase tracking-[0.25em] text-amber-300">Siguiente</span>
                <p className="font-display text-2xl leading-tight">{siguiente.client}</p>
                <p className="text-sm text-muted-foreground">{siguiente.service} · turno {siguiente.time}</p>
              </div>
              <div className="flex flex-col gap-2">
                <Button size="sm" disabled={!!atendiendo || pending} onClick={() => act(empezarTurnoAction, siguiente.id, `${siguiente.client} pasó al sillón`)}>
                  <UserPlus className="h-4 w-4" /> Sentar
                </Button>
                <Button size="sm" variant="outline" asChild>
                  <a href={waLink(siguiente.phone, siguiente.client)} target="_blank" rel="noopener noreferrer"><Zap className="h-4 w-4" /> Avisar</a>
                </Button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <div className="mb-2 flex items-center justify-between">
          <h2 className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">En espera ({espera.length})</h2>
          <span className="flex items-center gap-2 text-xs text-muted-foreground">
            {pending && <Loader2 className="h-3 w-3 animate-spin" />} Atendidos hoy: {atendidos.length}
          </span>
        </div>

        <motion.ol layout className="space-y-2">
          <AnimatePresence>
            {espera.map((i, idx) => (
              <motion.li key={i.id} layout initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, x: -24 }} className="flex items-center gap-3 rounded-xl border border-border bg-card px-4 py-2.5">
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-secondary font-display text-sm">{idx + 2}</span>
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium">{i.client}</p>
                  <p className="truncate text-xs text-muted-foreground">{i.service} · {i.time}</p>
                </div>
                <Button size="sm" variant="ghost" className="text-muted-foreground" asChild>
                  <a href={waLink(i.phone, i.client)} target="_blank" rel="noopener noreferrer" title="Avisar por WhatsApp"><Zap className="h-4 w-4" /></a>
                </Button>
                <Button size="sm" variant="outline" disabled={!!atendiendo || pending} onClick={() => act(empezarTurnoAction, i.id, `${i.client} pasó al sillón`)}>Sentar</Button>
              </motion.li>
            ))}
          </AnimatePresence>
          {espera.length === 0 && <p className="rounded-xl border border-border bg-card px-4 py-6 text-center text-sm text-muted-foreground">Nadie más en espera.</p>}
        </motion.ol>
      </div>
    </div>
  );
}

/* ---------- Sillón de barbero (SVG animado) ---------- */
function BarberChair({ occupied }: { occupied: boolean }) {
  const stroke = occupied ? "var(--chart-2)" : "rgba(255,255,255,0.12)";
  return (
    <div className="relative my-2 h-44 w-44">
      {occupied && (
        <motion.div
          className="absolute inset-0 rounded-full"
          style={{ background: "radial-gradient(circle, color-mix(in srgb, var(--chart-2) 30%, transparent) 0%, transparent 65%)" }}
          animate={{ opacity: [0.45, 0.8, 0.45], scale: [0.95, 1.05, 0.95] }}
          transition={{ duration: 2.2, repeat: Infinity }}
        />
      )}
      <svg viewBox="0 0 160 180" className="relative h-full w-full">
        {/* base */}
        <ellipse cx="80" cy="162" rx="46" ry="9" fill="#15151c" />
        <rect x="73" y="120" width="14" height="40" rx="4" fill="#26262e" />
        <rect x="54" y="134" width="52" height="9" rx="4" fill="#2a2a33" />
        {/* armrests */}
        <rect x="32" y="92" width="13" height="34" rx="5" fill="#22222a" />
        <rect x="115" y="92" width="13" height="34" rx="5" fill="#22222a" />
        {/* seat */}
        <motion.rect x="40" y="94" width="80" height="24" rx="9" fill={occupied ? "#1b1b24" : "#16161d"} stroke={stroke} strokeWidth="1.5" animate={{ y: occupied ? 94 : 96 }} />
        {/* backrest */}
        <rect x="46" y="28" width="68" height="74" rx="16" fill="#16161d" stroke={stroke} strokeWidth="1.5" />
        <rect x="64" y="18" width="32" height="18" rx="9" fill="#16161d" stroke={stroke} strokeWidth="1.5" />
        {/* persona */}
        <AnimatePresence>
          {occupied && (
            <motion.g key="persona" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 8 }}>
              <circle cx="80" cy="60" r="15" fill="var(--chart-2)" opacity="0.9" />
              <path d="M58 98 q22 -24 44 0 z" fill="var(--chart-2)" opacity="0.9" />
              {/* capa de corte */}
              <path d="M56 96 q24 -8 48 0 l-2 22 q-22 6 -44 0 z" fill="#0e0e13" opacity="0.85" />
            </motion.g>
          )}
        </AnimatePresence>
      </svg>
    </div>
  );
}

/* ---------- Tarjeta por barbero (admin, clickeable) ---------- */
function BarberCard({ barber, onClick }: { barber: BarberQueue; onClick: () => void }) {
  const { atendiendo, siguiente, espera } = split(barber.items);
  return (
    <motion.div layout onClick={onClick} whileHover={{ y: -2 }} className="group cursor-pointer rounded-2xl border border-border bg-card p-5 transition-colors hover:border-flow-cyan/40">
      <div className="mb-4 flex items-center gap-3">
        <Avatar className="h-10 w-10"><AvatarImage src={barber.img} alt={barber.name} /><AvatarFallback>{barber.name[0]}</AvatarFallback></Avatar>
        <div className="flex-1">
          <p className="font-display text-lg">{barber.name}</p>
          <p className="text-xs text-muted-foreground">{espera.length} en espera</p>
        </div>
        <span className="text-xs text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100">Ver cola →</span>
      </div>
      <div className={`mb-3 rounded-xl border p-3 ${atendiendo ? "border-flow-cyan/30 bg-flow-cyan/5" : "border-border"}`}>
        <div className="flex items-center gap-1.5">
          {atendiendo && <motion.span className="h-1.5 w-1.5 rounded-full bg-flow-cyan" animate={{ opacity: [1, 0.3, 1] }} transition={{ duration: 1.4, repeat: Infinity }} />}
          <span className="text-[10px] font-semibold uppercase tracking-widest text-flow-cyan">En el sillón</span>
        </div>
        {atendiendo ? (
          <>
            <p className="font-display text-xl leading-tight">{atendiendo.client}</p>
            <p className="text-xs text-muted-foreground">{atendiendo.service}</p>
          </>
        ) : (
          <p className="text-sm text-muted-foreground">Sillón libre</p>
        )}
      </div>
      <div className="flex items-center justify-between rounded-xl border border-amber-400/20 px-3 py-2">
        <span className="text-[10px] font-semibold uppercase tracking-widest text-amber-300">Sigue</span>
        {siguiente ? <span className="text-sm"><span className="text-foreground">{siguiente.client}</span> · <span className="text-amber-300">{siguiente.time}</span></span> : <span className="text-sm text-muted-foreground">—</span>}
      </div>
    </motion.div>
  );
}
