"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { AnimatePresence, motion } from "motion/react";
import { Check, X, UserPlus, Zap, Loader2, Scissors } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/shared/ui/avatar";
import { Button } from "@/shared/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@/shared/ui/dropdown-menu";
import { formatARS } from "@/shared/lib/money";
import { empezarTurnoAction, noShowTurnoAction, terminarTurnoAction } from "@/shared/api/actions";

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
  avatar?: string;
};
type BarberQueue = { id: string; name: string; img: string; barberAvatar?: string; items: QueueItem[] };

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

// Avatar ilustrado y determinístico por nombre (DiceBear)
function avatarUrl(name: string): string {
  return `https://api.dicebear.com/9.x/avataaars/svg?seed=${encodeURIComponent(name)}&radius=50`;
}
// Usa el avatar que armó el cliente; si no, uno por su nombre
function avOf(i: QueueItem): string {
  return i.avatar ?? avatarUrl(i.client);
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
      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
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
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
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

  // Sentar a alguien que NO es el siguiente → confirma que se saltea el orden
  function sentar(item: QueueItem) {
    if (siguiente && item.id !== siguiente.id) {
      if (!confirm(`Vas a saltear a ${siguiente.client} y sentar a ${item.client}. ¿Seguro?`)) return;
    }
    act(empezarTurnoAction, item.id, `${item.client} pasó al sillón`);
  }

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,360px)_1fr]">
      {/* Sillón */}
      <motion.div layout className="relative overflow-hidden rounded-3xl border border-flow-cyan/25 bg-card p-6">
        <div className="mb-2 flex items-center gap-2">
          <motion.span className="h-2 w-2 rounded-full bg-flow-cyan" animate={{ opacity: atendiendo ? [1, 0.3, 1] : 0.4 }} transition={{ duration: 1.4, repeat: Infinity }} />
          <span className="text-xs font-semibold uppercase tracking-[0.25em] text-teal-700 dark:text-flow-cyan">{atendiendo ? "En el sillón" : "Sillón libre"}</span>
        </div>

        <div className="flex flex-col items-center">
          <BarberChair occupied={!!atendiendo} avatar={atendiendo ? avOf(atendiendo) : undefined} name={atendiendo?.client} barberAvatar={barber.barberAvatar} barberName={barber.name} />
          <AnimatePresence mode="wait">
            {atendiendo ? (
              <motion.div key={atendiendo.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="-mt-2 text-center">
                <p className="font-display text-3xl leading-tight">{atendiendo.client}</p>
                <p className="text-sm text-muted-foreground">{atendiendo.service}</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  Saldo: {atendiendo.balancePaid ? <span className="text-teal-700 dark:text-flow-cyan">pago</span> : <span className="text-amber-700 dark:text-amber-300">{formatARS(atendiendo.balanceCents)} pendiente</span>}
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
            <Button className="w-full" disabled={pending} onClick={() => sentar(siguiente)}>
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
            <motion.div key={siguiente.id} layout initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, x: -28, transition: { duration: 0.18 } }} transition={{ type: "spring", stiffness: 320, damping: 26 }} className="mb-4 flex items-center gap-4 rounded-2xl border border-amber-400/30 bg-amber-400/5 p-4">
              <Avatar className="h-14 w-14 ring-2 ring-amber-400/40">
                <AvatarImage src={avOf(siguiente)} alt={siguiente.client} />
                <AvatarFallback>{siguiente.client[0]}</AvatarFallback>
              </Avatar>
              <div className="min-w-0 flex-1">
                <span className="text-[10px] font-semibold uppercase tracking-[0.25em] text-amber-700 dark:text-amber-300">Siguiente</span>
                <p className="truncate font-display text-2xl leading-tight">{siguiente.client}</p>
                <p className="truncate text-sm text-muted-foreground">{siguiente.service} · turno {siguiente.time}</p>
              </div>
              <div className="flex flex-col gap-2">
                <Button size="sm" disabled={!!atendiendo || pending} onClick={() => sentar(siguiente)}>
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

        <motion.ol
          layout
          className="max-h-[58vh] space-y-2 overflow-y-auto overscroll-contain pr-1 [scrollbar-color:var(--border)_transparent] [scrollbar-width:thin]"
        >
          <AnimatePresence>
            {espera.map((i, idx) => (
              <motion.li key={i.id} layout initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, x: -28, transition: { duration: 0.18 } }} transition={{ type: "spring", stiffness: 340, damping: 26 }} className="flex items-center gap-3 rounded-xl border border-border bg-card px-4 py-2.5">
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-secondary font-display text-xs text-muted-foreground">{idx + 2}</span>
                <Avatar className="h-10 w-10 shrink-0">
                  <AvatarImage src={avOf(i)} alt={i.client} />
                  <AvatarFallback>{i.client[0]}</AvatarFallback>
                </Avatar>
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium">{i.client}</p>
                  <p className="truncate text-xs text-muted-foreground">{i.service} · {i.time}</p>
                </div>
                <Button size="sm" variant="ghost" className="text-muted-foreground" asChild>
                  <a href={waLink(i.phone, i.client)} target="_blank" rel="noopener noreferrer" title="Avisar por WhatsApp"><Zap className="h-4 w-4" /></a>
                </Button>
                <Button size="sm" variant="ghost" className="text-muted-foreground hover:text-foreground" disabled={!!atendiendo || pending} onClick={() => sentar(i)} title="Sentar (saltea el orden)">Sentar</Button>
              </motion.li>
            ))}
          </AnimatePresence>
          {espera.length === 0 && <p className="rounded-xl border border-border bg-card px-4 py-6 text-center text-sm text-muted-foreground">Nadie más en espera.</p>}
        </motion.ol>
      </div>
    </div>
  );
}

/* ---------- Escena: retrato del cliente en el sillón + barbero al lado ---------- */
function BarberChair({
  occupied,
  avatar,
  name,
  barberAvatar,
  barberName,
}: {
  occupied: boolean;
  avatar?: string;
  name?: string;
  barberAvatar?: string;
  barberName?: string;
}) {
  const accent = occupied ? "var(--chart-2)" : "rgba(255,255,255,0.16)";
  const bob = { y: [0, -2.5, 0] };
  const bobT = { duration: 3.4, repeat: Infinity, ease: "easeInOut" as const };
  return (
    <div className="relative mx-auto my-1 aspect-[260/240] w-64 max-w-full">
      {/* halo sobre el cliente */}
      {occupied && (
        <motion.div
          className="absolute inset-0"
          style={{ background: "radial-gradient(circle at 66% 40%, color-mix(in srgb, var(--chart-2) 26%, transparent) 0%, transparent 56%)" }}
          animate={{ opacity: [0.45, 0.85, 0.45], scale: [0.97, 1.05, 0.97] }}
          transition={{ duration: 2.6, repeat: Infinity }}
        />
      )}

      <svg viewBox="0 0 260 240" className="relative h-full w-full">
        <defs>
          <linearGradient id="bc-chrome" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="#3a3a44" />
            <stop offset="38%" stopColor="#9aa0aa" />
            <stop offset="62%" stopColor="#cfd5dc" />
            <stop offset="100%" stopColor="#454550" />
          </linearGradient>
          <linearGradient id="bc-leather" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#c33a2c" />
            <stop offset="100%" stopColor="#7c1f17" />
          </linearGradient>
        </defs>

        {/* sombras en el piso */}
        <ellipse cx="170" cy="226" rx="72" ry="9" fill="rgba(0,0,0,0.45)" />
        {barberAvatar && <ellipse cx="52" cy="214" rx="30" ry="6" fill="rgba(0,0,0,0.4)" />}

        {/* sillón: base cromada + apoyapiés */}
        <rect x="162" y="168" width="16" height="42" rx="4" fill="url(#bc-chrome)" />
        <rect x="126" y="206" width="88" height="8" rx="4" fill="url(#bc-chrome)" />
        <circle cx="130" cy="214" r="5.5" fill="#24242b" stroke="url(#bc-chrome)" strokeWidth="2" />
        <circle cx="210" cy="214" r="5.5" fill="#24242b" stroke="url(#bc-chrome)" strokeWidth="2" />
        <rect x="140" y="190" width="60" height="6" rx="3" fill="url(#bc-chrome)" />
        {/* respaldo de cuero rojo (enmarca el retrato) */}
        <rect x="116" y="30" width="108" height="138" rx="28" fill="url(#bc-leather)" stroke={accent} strokeWidth="2" />
        <rect x="126" y="40" width="88" height="46" rx="20" fill="rgba(255,255,255,0.06)" />
        {/* asiento */}
        <rect x="122" y="150" width="96" height="22" rx="10" fill="url(#bc-leather)" stroke={accent} strokeWidth="1.5" />
        {/* apoyabrazos */}
        <rect x="106" y="120" width="14" height="40" rx="7" fill="#202028" stroke="rgba(255,255,255,0.10)" strokeWidth="1" />
        <rect x="220" y="120" width="14" height="40" rx="7" fill="#202028" stroke="rgba(255,255,255,0.10)" strokeWidth="1" />
      </svg>

      {/* Avatar del cliente: retrato grande dentro del sillón */}
      <AnimatePresence>
        {occupied && (
          <motion.div
            key={avatar}
            initial={{ opacity: 0, scale: 0.85 }}
            animate={{ opacity: 1, scale: 1, ...bob }}
            exit={{ opacity: 0, scale: 0.85 }}
            transition={{ y: bobT, default: { duration: 0.45, type: "spring", stiffness: 200, damping: 18 } }}
            className="absolute left-[65.4%] top-[40%] aspect-square w-[39%] -translate-x-1/2 -translate-y-1/2"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={avatar}
              alt={name}
              className="h-full w-full rounded-full border-[3px] border-flow-cyan/70 bg-[#0c0c12] object-cover shadow-[0_0_22px_color-mix(in_srgb,var(--chart-2)_50%,transparent)]"
            />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Tijera haciendo snip cuando atiende */}
      {occupied && (
        <motion.div
          className="absolute left-[47%] top-[30%] text-teal-700 dark:text-flow-cyan drop-shadow-[0_0_6px_var(--chart-2)]"
          animate={{ rotate: [0, -26, 0], y: [0, -2, 0] }}
          transition={{ duration: 0.5, repeat: Infinity, ease: "easeInOut" }}
        >
          <Scissors className="h-6 w-6" />
        </motion.div>
      )}

      {/* Barbero: avatar limpio al lado, con badge de tijera */}
      {barberAvatar && (
        <>
          <div className="absolute left-[20%] top-[45%] aspect-square w-[24%] -translate-x-1/2 -translate-y-1/2">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={barberAvatar}
              alt={barberName}
              className="h-full w-full rounded-full border-2 border-white/25 bg-[#0c0c12] object-cover"
            />
            <span className="absolute -right-0.5 -bottom-0.5 flex h-5 w-5 items-center justify-center rounded-full bg-flow-cyan text-background ring-2 ring-card">
              <Scissors className="h-3 w-3" />
            </span>
          </div>
          {barberName && (
            <span className="absolute left-[20%] top-[62%] -translate-x-1/2 whitespace-nowrap text-[11px] font-medium text-muted-foreground">
              {barberName.split(" ")[0]}
            </span>
          )}
        </>
      )}
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
          <span className="text-[10px] font-semibold uppercase tracking-widest text-teal-700 dark:text-flow-cyan">En el sillón</span>
        </div>
        {atendiendo ? (
          <div className="mt-1 flex items-center gap-2">
            <Avatar className="h-9 w-9 ring-1 ring-flow-cyan/40">
              <AvatarImage src={avOf(atendiendo)} alt={atendiendo.client} />
              <AvatarFallback>{atendiendo.client[0]}</AvatarFallback>
            </Avatar>
            <div>
              <p className="font-display text-lg leading-tight">{atendiendo.client}</p>
              <p className="text-xs text-muted-foreground">{atendiendo.service}</p>
            </div>
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">Sillón libre</p>
        )}
      </div>
      <div className="flex items-center justify-between rounded-xl border border-amber-400/20 px-3 py-2">
        <span className="text-[10px] font-semibold uppercase tracking-widest text-amber-700 dark:text-amber-300">Sigue</span>
        {siguiente ? <span className="text-sm"><span className="text-foreground">{siguiente.client}</span> · <span className="text-amber-700 dark:text-amber-300">{siguiente.time}</span></span> : <span className="text-sm text-muted-foreground">—</span>}
      </div>
    </motion.div>
  );
}
