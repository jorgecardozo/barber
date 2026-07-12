"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { formatARS } from "@/shared/lib/money";
import { crearReservaAction } from "@/shared/api/actions";

type Service = {
  id: string;
  name: string;
  description: string;
  priceCents: number;
  durationMin: number;
  depositCents: number;
  featured: boolean;
};
type Barber = { id: string; name: string; specialty: string; img: string; serviceIds: string[] };
type DateOpt = { value: string; weekday: string; day: string; long: string };
type Slot = { hhmm: string; startISO: string };
type DaySlot = { hhmm: string; startISO: string; available: boolean };
type DayInfo = { count: number; closed: boolean };

const STEPS = ["Servicio", "Barbero y horario", "Confirmar"];

export function BookingWizard({
  services,
  barbers,
  dates,
  userName,
  slotTaken,
}: {
  services: Service[];
  barbers: Barber[];
  dates: DateOpt[];
  userName: string | null;
  slotTaken: boolean;
}) {
  const [step, setStep] = useState(1);
  const [serviceId, setServiceId] = useState<string | null>(null);
  const [barberIndex, setBarberIndex] = useState(0);
  const [date, setDate] = useState<string | null>(null);
  const [slot, setSlot] = useState<Slot | null>(null);
  const [grid, setGrid] = useState<DaySlot[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [resumen, setResumen] = useState<Record<string, DayInfo>>({});
  const [metodo, setMetodo] = useState<"mercadopago" | "efectivo">("mercadopago");

  const service = services.find((s) => s.id === serviceId) ?? null;
  const availBarbers = service ? barbers.filter((b) => b.serviceIds.includes(service.id)) : barbers;
  const barber = availBarbers[barberIndex] ?? null;
  const barberId = barber?.id ?? null;
  const dateOpt = dates.find((d) => d.value === date) ?? null;
  const today = dates[0]?.value ?? null;

  function chooseService(id: string) {
    setServiceId(id);
    setBarberIndex(0);
    setDate(today); // por defecto, el día de hoy
    setSlot(null);
    setGrid(null);
    setStep(2);
  }
  function chooseBarber(i: number) {
    if (i < 0 || i >= availBarbers.length) return;
    setBarberIndex(i);
    setSlot(null); // se mantiene el día elegido, cambia el barbero
  }

  // Resumen de disponibilidad por día del barbero centrado (calendario "de un vistazo")
  useEffect(() => {
    if (step !== 2 || !barberId || !serviceId) return;
    let cancel = false;
    fetch(`/api/disponibilidad?barber=${barberId}&service=${serviceId}&resumen=1`)
      .then((r) => r.json())
      .then((d) => {
        if (cancel) return;
        const map: Record<string, DayInfo> = {};
        for (const x of d.dias ?? []) map[x.date] = { count: x.count, closed: !!x.closed };
        setResumen(map);
        // Por defecto hoy; pero si hoy no tiene cupo (tarde/cerrado/lleno para este
        // barbero), saltar al primer día con horarios libres.
        setDate((cur) => {
          const ci = cur ? map[cur] : undefined;
          if (ci && !ci.closed && ci.count > 0) return cur;
          const firstOpen = dates.find((dd) => {
            const m = map[dd.value];
            return m && !m.closed && m.count > 0;
          });
          return firstOpen ? firstOpen.value : cur;
        });
      })
      .catch(() => {});
    return () => {
      cancel = true;
    };
  }, [step, barberId, serviceId]);

  // Grilla de horarios del barbero + día seleccionados
  useEffect(() => {
    if (step !== 2 || !barberId || !serviceId || !date) return;
    let cancel = false;
    setLoading(true);
    setGrid(null);
    fetch(`/api/disponibilidad?barber=${barberId}&service=${serviceId}&date=${date}`)
      .then((r) => r.json())
      .then((d) => {
        if (!cancel) setGrid(d.grid ?? []);
      })
      .catch(() => !cancel && setGrid([]))
      .finally(() => !cancel && setLoading(false));
    return () => {
      cancel = true;
    };
  }, [step, barberId, serviceId, date]);

  return (
    <section className="mx-auto max-w-3xl px-5 py-6 sm:py-12">
      <div className="mb-2 text-center">
        <p className="text-[10px] font-medium uppercase tracking-[0.3em] text-teal-600 dark:text-flow-cyan sm:text-xs">Reservá tu turno</p>
        <h1 className="mt-1 font-display text-2xl sm:mt-2 sm:text-4xl">
          Sacá tu <span className="chrome-text italic">turno</span>
        </h1>
      </div>

      {/* Stepper */}
      <ol className="mx-auto mb-5 mt-4 flex max-w-md items-center justify-between sm:mb-9 sm:mt-7">
        {STEPS.map((label, i) => {
          const n = i + 1;
          const done = n < step;
          const current = n === step;
          return (
            <li key={label} className="flex flex-1 items-center">
              <div className="flex flex-col items-center">
                <span
                  className={`flex h-8 w-8 items-center justify-center rounded-full border text-sm font-bold transition-colors ${
                    current
                      ? "border-flow-red bg-flow-red text-white"
                      : done
                        ? "border-flow-cyan/60 bg-flow-cyan/15 text-teal-600 dark:text-flow-cyan"
                        : "border-border text-muted-foreground"
                  }`}
                >
                  {done ? "✓" : n}
                </span>
                <span className={`mt-1.5 hidden text-[11px] sm:block ${current ? "text-foreground" : "text-muted-foreground"}`}>{label}</span>
              </div>
              {n < STEPS.length && <span className={`mx-1 h-px flex-1 ${done ? "bg-flow-cyan/40" : "bg-accent"}`} />}
            </li>
          );
        })}
      </ol>

      {slotTaken && (
        <p className="mb-6 rounded-xl border border-flow-red/40 bg-flow-red/10 px-4 py-3 text-sm text-foreground">
          Ese horario se tomó justo antes que vos. Elegí otro, ¡hay lugar!
        </p>
      )}

      {/* Paso 1: Servicio */}
      {step === 1 && (
        <div className="grid gap-3 sm:grid-cols-2">
          {services.map((s) => (
            <button
              key={s.id}
              onClick={() => chooseService(s.id)}
              className={`group rounded-2xl border p-5 text-left shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md dark:shadow-none ${
                s.featured ? "border-flow-red/40 bg-card shadow-flow-red/10 dark:bg-flow-red/5" : "border-border bg-card"
              }`}
            >
              <div className="flex items-start justify-between gap-2">
                <h3 className="font-display text-xl">{s.name}</h3>
                <span className="shrink-0 font-display text-xl text-teal-600 dark:text-flow-cyan">{formatARS(s.priceCents)}</span>
              </div>
              <p className="mt-1 text-sm text-muted-foreground">{s.description}</p>
              <p className="mt-3 text-xs uppercase tracking-wider text-muted-foreground">
                {s.durationMin} min · seña {formatARS(s.depositCents)}
              </p>
            </button>
          ))}
        </div>
      )}

      {/* Paso 2: Barbero (carrusel) + Día + Hora, todo en una vista */}
      {step === 2 && service && (
        <div>
          <BackBar onClick={() => setStep(1)} label={`Servicio: ${service.name}`} />

          {/* --- Carrusel de barberos (coverflow) --- */}
          <p className="mb-2 text-center text-xs text-muted-foreground sm:text-sm">Elegí tu barbero</p>
          <div className="relative mx-auto flex h-40 max-w-xl items-center justify-center overflow-hidden [perspective:1200px] sm:h-72">
            {availBarbers.length > 1 && (
              <button
                type="button"
                onClick={() => chooseBarber(barberIndex - 1)}
                disabled={barberIndex === 0}
                aria-label="Barbero anterior"
                className="absolute left-0 z-30 flex h-10 w-10 items-center justify-center rounded-full border border-border bg-card/80 text-foreground backdrop-blur transition-colors hover:bg-accent disabled:opacity-30"
              >
                <ChevronLeft className="h-5 w-5" />
              </button>
            )}

            {availBarbers.map((b, i) => {
              const offset = i - barberIndex;
              const abs = Math.abs(offset);
              const center = offset === 0;
              return (
                <button
                  key={b.id}
                  type="button"
                  onClick={() => chooseBarber(i)}
                  aria-label={b.name}
                  className={`absolute left-1/2 top-1/2 h-32 w-24 overflow-hidden rounded-2xl border bg-card shadow-2xl transition-all duration-500 ease-out sm:h-64 sm:w-52 ${
                    center ? "border-flow-cyan/50" : "border-border"
                  }`}
                  style={{
                    transform: `translate(-50%, -50%) translateX(${offset * 64}%) rotateY(${offset * -25}deg) scale(${center ? 1 : 0.82})`,
                    zIndex: 20 - abs,
                    opacity: abs > 2 ? 0 : 1,
                    filter: center ? "none" : "grayscale(1) brightness(0.5)",
                    pointerEvents: abs > 2 ? "none" : "auto",
                  }}
                >
                  <Image src={b.img} alt={b.name} fill sizes="220px" className="object-cover" />
                  <div className="absolute inset-0 bg-gradient-to-t from-ink via-ink/25 to-transparent" />
                  {center && (
                    <div className="absolute inset-x-0 bottom-0 p-2 text-left sm:p-4">
                      <h3 className="font-display text-sm leading-tight sm:text-xl">{b.name}</h3>
                      <p className="text-[10px] text-muted-foreground sm:text-xs">{b.specialty}</p>
                    </div>
                  )}
                </button>
              );
            })}

            {availBarbers.length > 1 && (
              <button
                type="button"
                onClick={() => chooseBarber(barberIndex + 1)}
                disabled={barberIndex === availBarbers.length - 1}
                aria-label="Barbero siguiente"
                className="absolute right-0 z-30 flex h-10 w-10 items-center justify-center rounded-full border border-border bg-card/80 text-foreground backdrop-blur transition-colors hover:bg-accent disabled:opacity-30"
              >
                <ChevronRight className="h-5 w-5" />
              </button>
            )}
          </div>

          {/* dots */}
          {availBarbers.length > 1 && (
            <div className="mb-3 mt-2 flex justify-center gap-1.5 sm:mb-5 sm:mt-3">
              {availBarbers.map((b, i) => (
                <button
                  key={b.id}
                  type="button"
                  onClick={() => chooseBarber(i)}
                  aria-label={`Ir a ${b.name}`}
                  className={`h-1.5 rounded-full transition-all ${i === barberIndex ? "w-5 bg-flow-cyan" : "w-1.5 bg-accent"}`}
                />
              ))}
            </div>
          )}

          {/* --- Día --- */}
          <p className="mb-2 text-xs text-muted-foreground sm:text-sm">
            Elegí el día <span className="hidden text-muted-foreground/60 sm:inline">· abajo de cada día ves cuántos horarios quedan libres</span>
          </p>
          <div className="mb-4 flex gap-2 overflow-x-auto pb-2 sm:mb-6">
            {dates.map((d) => {
              const info = resumen[d.value];
              const closed = info?.closed ?? false;
              const count = info?.count;
              const disabled = closed || count === 0;
              return (
                <button
                  key={d.value}
                  onClick={() => {
                    if (disabled) return;
                    setDate(d.value);
                    setSlot(null);
                  }}
                  disabled={disabled}
                  className={`flex min-w-[58px] shrink-0 flex-col items-center rounded-xl border px-2 py-1.5 transition-colors sm:min-w-[70px] sm:px-3 sm:py-2 ${
                    date === d.value
                      ? "border-flow-red bg-flow-red/10 text-foreground"
                      : disabled
                        ? "cursor-not-allowed border-border text-muted-foreground/40"
                        : "border-border text-muted-foreground hover:border-border"
                  }`}
                >
                  <span className="text-[11px] uppercase">{d.weekday}</span>
                  <span className="font-display text-base sm:text-lg">{d.day}</span>
                  <span className={`mt-0.5 text-[10px] ${disabled ? "text-muted-foreground/40" : "text-teal-600 dark:text-flow-cyan"}`}>
                    {info === undefined ? "·" : closed ? "Cerrado" : count === 0 ? "lleno" : `${count} libres`}
                  </span>
                </button>
              );
            })}
          </div>

          {/* --- Hora --- */}
          {date && (
            <>
              <div className="mb-2 flex items-center justify-between">
                <p className="text-sm text-muted-foreground">Horarios de {barber?.name}</p>
                <div className="flex items-center gap-3 text-[11px] text-muted-foreground">
                  <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-sm border border-flow-cyan/40 bg-flow-cyan/15" /> Libre</span>
                  <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-sm bg-accent" /> Ocupado</span>
                </div>
              </div>
              {loading && <p className="py-6 text-center text-sm text-muted-foreground">Buscando horarios…</p>}
              {!loading && grid && grid.length === 0 && (
                <p className="rounded-xl border border-border bg-card px-4 py-6 text-center text-sm text-muted-foreground">
                  {barber?.name} no atiende este día. Probá otro día o cambiá de barbero arriba. 🗓️
                </p>
              )}
              {!loading && grid && grid.length > 0 && (
                <>
                  <div className="grid grid-cols-4 gap-2 sm:grid-cols-6">
                    {grid.map((s) =>
                      s.available ? (
                        <button
                          key={s.startISO}
                          onClick={() => setSlot({ hhmm: s.hhmm, startISO: s.startISO })}
                          className={`rounded-lg border py-2 text-sm font-medium transition-colors sm:py-2.5 ${
                            slot?.startISO === s.startISO
                              ? "border-flow-red bg-flow-red text-white"
                              : "border-flow-cyan/30 bg-flow-cyan/10 text-teal-600 dark:text-flow-cyan hover:border-flow-cyan hover:bg-flow-cyan/20"
                          }`}
                        >
                          {s.hhmm}
                        </button>
                      ) : (
                        <div
                          key={s.startISO}
                          title="Ocupado"
                          className="rounded-lg border border-border bg-muted py-2 text-center text-sm text-muted-foreground/40 line-through sm:py-2.5"
                        >
                          {s.hhmm}
                        </div>
                      ),
                    )}
                  </div>
                  {grid.every((s) => !s.available) && (
                    <p className="mt-3 text-center text-sm text-muted-foreground">Todo ocupado este día. Probá otro. 🗓️</p>
                  )}
                </>
              )}
            </>
          )}

          {slot && (
            <button
              onClick={() => setStep(3)}
              className="mt-5 w-full rounded-full bg-flow-red px-6 py-3 font-semibold text-white shadow-[0_10px_30px_-10px] shadow-flow-red/60 ring-1 ring-white/10 transition-transform hover:scale-[1.01]"
            >
              Continuar con las {slot.hhmm} →
            </button>
          )}
        </div>
      )}

      {/* Paso 3: Confirmar */}
      {step === 3 && service && barber && dateOpt && slot && (
        <div>
          <BackBar onClick={() => setStep(2)} label="Cambiar barbero u horario" />

          <div className="rounded-2xl border border-border bg-card p-6">
            <h3 className="font-display text-2xl">Revisá tu turno</h3>
            <dl className="mt-5 space-y-3 text-sm">
              <Row k="Servicio" v={`${service.name} · ${service.durationMin} min`} />
              <Row k="Barbero" v={barber.name} />
              <Row k="Día" v={dateOpt.long} />
              <Row k="Hora" v={slot.hhmm} />
              <div className="my-3 h-px bg-accent" />
              <Row k="Precio total" v={formatARS(service.priceCents)} />
              <Row k="Seña ahora" v={formatARS(service.depositCents)} accent />
              <Row k="Resto en el local" v={formatARS(service.priceCents - service.depositCents)} muted />
            </dl>

            {/* Método de pago de la seña */}
            <p className="mt-5 mb-2 text-sm text-muted-foreground">¿Cómo pagás la seña?</p>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setMetodo("mercadopago")}
                className={`rounded-xl border p-3 text-left transition-colors ${
                  metodo === "mercadopago" ? "border-[#009ee3] bg-[#009ee3]/10" : "border-border hover:border-border"
                }`}
              >
                <span className="block text-sm font-semibold text-foreground">MercadoPago</span>
                <span className="block text-xs text-muted-foreground">Pagás ahora, online</span>
              </button>
              <button
                type="button"
                onClick={() => setMetodo("efectivo")}
                className={`rounded-xl border p-3 text-left transition-colors ${
                  metodo === "efectivo" ? "border-flow-cyan bg-flow-cyan/10" : "border-border hover:border-border"
                }`}
              >
                <span className="block text-sm font-semibold text-foreground">Efectivo</span>
                <span className="block text-xs text-muted-foreground">Pagás la seña en el local</span>
              </button>
            </div>

            <p className="mt-4 rounded-lg bg-accent px-3 py-2 text-xs text-muted-foreground">
              La seña confirma el turno y no es reembolsable. Podés cancelar hasta 4 hs antes.
              {metodo === "efectivo" && " Con efectivo, dejás reservado y pagás la seña al llegar."}
            </p>

            {userName ? (
              <form action={crearReservaAction} className="mt-6">
                <input type="hidden" name="serviceId" value={service.id} />
                <input type="hidden" name="barberId" value={barber.id} />
                <input type="hidden" name="startISO" value={slot.startISO} />
                <input type="hidden" name="metodo" value={metodo} />
                <button className="w-full rounded-full bg-flow-red px-6 py-3.5 font-semibold text-white shadow-[0_10px_30px_-10px] shadow-flow-red/60 ring-1 ring-white/10 transition-transform hover:scale-[1.02]">
                  {metodo === "mercadopago" ? "Continuar al pago de la seña →" : "Confirmar turno (seña en el local) →"}
                </button>
              </form>
            ) : (
              <div className="mt-6 rounded-xl border border-flow-cyan/30 bg-flow-cyan/5 p-4 text-center">
                <p className="text-sm text-foreground">Necesitás una cuenta para confirmar el turno.</p>
                <Link
                  href="/ingresar?next=/reservar"
                  className="mt-3 inline-block rounded-full bg-flow-cyan/90 px-6 py-2.5 font-semibold text-ink transition-colors hover:bg-flow-cyan"
                >
                  Ingresar / Crear cuenta
                </Link>
              </div>
            )}
          </div>
        </div>
      )}
    </section>
  );
}

function BackBar({ onClick, label }: { onClick: () => void; label: string }) {
  return (
    <button onClick={onClick} className="mb-5 flex items-center gap-2 text-sm text-muted-foreground transition-colors hover:text-foreground">
      <span>←</span> {label}
    </button>
  );
}

function Row({ k, v, accent, muted }: { k: string; v: string; accent?: boolean; muted?: boolean }) {
  return (
    <div className="flex items-center justify-between">
      <dt className="text-muted-foreground">{k}</dt>
      <dd className={`font-medium ${accent ? "text-teal-600 dark:text-flow-cyan" : muted ? "text-muted-foreground" : "text-foreground"}`}>{v}</dd>
    </div>
  );
}
