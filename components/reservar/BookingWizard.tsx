"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { formatARS } from "@/lib/money";
import { crearReservaAction } from "@/lib/actions";

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

const STEPS = ["Servicio", "Barbero", "Día y hora", "Confirmar"];

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
  const [barberId, setBarberId] = useState<string | null>(null);
  const [date, setDate] = useState<string | null>(null);
  const [slot, setSlot] = useState<Slot | null>(null);
  const [slots, setSlots] = useState<Slot[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [metodo, setMetodo] = useState<"mercadopago" | "efectivo">("mercadopago");

  const service = services.find((s) => s.id === serviceId) ?? null;
  const barber = barbers.find((b) => b.id === barberId) ?? null;
  const dateOpt = dates.find((d) => d.value === date) ?? null;

  // Cargar slots cuando hay barbero + fecha
  useEffect(() => {
    if (step !== 3 || !barberId || !serviceId || !date) return;
    let cancel = false;
    setLoading(true);
    setSlots(null);
    fetch(`/api/disponibilidad?barber=${barberId}&service=${serviceId}&date=${date}`)
      .then((r) => r.json())
      .then((d) => {
        if (!cancel) setSlots(d.slots ?? []);
      })
      .catch(() => !cancel && setSlots([]))
      .finally(() => !cancel && setLoading(false));
    return () => {
      cancel = true;
    };
  }, [step, barberId, serviceId, date]);

  const availBarbers = barbers.filter((b) => (serviceId ? b.serviceIds.includes(serviceId) : true));

  return (
    <section className="mx-auto max-w-3xl px-5 py-12">
      <div className="mb-2 text-center">
        <p className="text-xs font-medium uppercase tracking-[0.3em] text-flow-cyan">Reservá tu turno</p>
        <h1 className="mt-2 font-display text-4xl">
          Sacá tu <span className="chrome-text italic">turno</span>
        </h1>
      </div>

      {/* Stepper */}
      <ol className="mx-auto mb-10 mt-8 flex max-w-xl items-center justify-between">
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
                        ? "border-flow-cyan/60 bg-flow-cyan/15 text-flow-cyan"
                        : "border-white/15 text-ash"
                  }`}
                >
                  {done ? "✓" : n}
                </span>
                <span className={`mt-1.5 hidden text-[11px] sm:block ${current ? "text-bone" : "text-ash"}`}>
                  {label}
                </span>
              </div>
              {n < STEPS.length && (
                <span className={`mx-1 h-px flex-1 ${done ? "bg-flow-cyan/40" : "bg-white/10"}`} />
              )}
            </li>
          );
        })}
      </ol>

      {slotTaken && (
        <p className="mb-6 rounded-xl border border-flow-red/40 bg-flow-red/10 px-4 py-3 text-sm text-bone">
          Ese horario se tomó justo antes que vos. Elegí otro, ¡hay lugar!
        </p>
      )}

      {/* Paso 1: Servicio */}
      {step === 1 && (
        <div className="grid gap-3 sm:grid-cols-2">
          {services.map((s) => (
            <button
              key={s.id}
              onClick={() => {
                setServiceId(s.id);
                setBarberId(null);
                setDate(null);
                setSlot(null);
                setStep(2);
              }}
              className={`group rounded-2xl border p-5 text-left transition-all hover:-translate-y-0.5 ${
                s.featured ? "border-flow-red/40 bg-flow-red/5" : "border-white/8 bg-ink-2 hover:border-white/20"
              }`}
            >
              <div className="flex items-start justify-between gap-2">
                <h3 className="font-display text-xl">{s.name}</h3>
                <span className="shrink-0 font-display text-xl text-flow-cyan">{formatARS(s.priceCents)}</span>
              </div>
              <p className="mt-1 text-sm text-ash">{s.description}</p>
              <p className="mt-3 text-xs uppercase tracking-wider text-ash">
                {s.durationMin} min · seña {formatARS(s.depositCents)}
              </p>
            </button>
          ))}
        </div>
      )}

      {/* Paso 2: Barbero */}
      {step === 2 && (
        <div>
          <BackBar onClick={() => setStep(1)} label={`Servicio: ${service?.name}`} />
          <div className="grid gap-4 sm:grid-cols-3">
            {availBarbers.map((b) => (
              <button
                key={b.id}
                onClick={() => {
                  setBarberId(b.id);
                  setDate(null);
                  setSlot(null);
                  setStep(3);
                }}
                className="group overflow-hidden rounded-2xl border border-white/8 bg-ink-2 text-left transition-all hover:-translate-y-0.5 hover:border-flow-cyan/30"
              >
                <div className="relative h-40">
                  <Image src={b.img} alt={b.name} fill sizes="33vw" className="object-cover" />
                  <div className="absolute inset-0 bg-gradient-to-t from-ink to-transparent" />
                </div>
                <div className="p-4">
                  <h3 className="font-display text-lg">{b.name}</h3>
                  <p className="text-xs text-ash">{b.specialty}</p>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Paso 3: Día y hora */}
      {step === 3 && (
        <div>
          <BackBar onClick={() => setStep(2)} label={`Barbero: ${barber?.name}`} />

          <p className="mb-2 text-sm text-ash">Elegí el día</p>
          <div className="mb-6 flex gap-2 overflow-x-auto pb-2">
            {dates.map((d) => (
              <button
                key={d.value}
                onClick={() => {
                  setDate(d.value);
                  setSlot(null);
                }}
                className={`flex min-w-[64px] shrink-0 flex-col items-center rounded-xl border px-3 py-2 transition-colors ${
                  date === d.value
                    ? "border-flow-red bg-flow-red/10 text-bone"
                    : "border-white/10 text-ash hover:border-white/25"
                }`}
              >
                <span className="text-[11px] uppercase">{d.weekday}</span>
                <span className="font-display text-lg">{d.day}</span>
              </button>
            ))}
          </div>

          {date && (
            <>
              <p className="mb-2 text-sm text-ash">Horarios disponibles</p>
              {loading && <p className="py-6 text-center text-sm text-ash">Buscando horarios…</p>}
              {!loading && slots && slots.length === 0 && (
                <p className="rounded-xl border border-white/10 bg-ink-2 px-4 py-6 text-center text-sm text-ash">
                  No hay horarios este día para {barber?.name}. Probá otro día. 🗓️
                </p>
              )}
              {!loading && slots && slots.length > 0 && (
                <div className="grid grid-cols-3 gap-2 sm:grid-cols-5">
                  {slots.map((s) => (
                    <button
                      key={s.startISO}
                      onClick={() => {
                        setSlot(s);
                        setStep(4);
                      }}
                      className="rounded-lg border border-white/10 bg-ink-2 py-2.5 text-sm font-medium transition-colors hover:border-flow-cyan/50 hover:text-flow-cyan"
                    >
                      {s.hhmm}
                    </button>
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      )}

      {/* Paso 4: Confirmar */}
      {step === 4 && service && barber && dateOpt && slot && (
        <div>
          <BackBar onClick={() => setStep(3)} label="Cambiar horario" />

          <div className="rounded-2xl border border-white/8 bg-ink-2 p-6">
            <h3 className="font-display text-2xl">Revisá tu turno</h3>
            <dl className="mt-5 space-y-3 text-sm">
              <Row k="Servicio" v={`${service.name} · ${service.durationMin} min`} />
              <Row k="Barbero" v={barber.name} />
              <Row k="Día" v={dateOpt.long} />
              <Row k="Hora" v={slot.hhmm} />
              <div className="my-3 h-px bg-white/10" />
              <Row k="Precio total" v={formatARS(service.priceCents)} />
              <Row k="Seña ahora" v={formatARS(service.depositCents)} accent />
              <Row k="Resto en el local" v={formatARS(service.priceCents - service.depositCents)} muted />
            </dl>

            {/* Método de pago de la seña */}
            <p className="mt-5 mb-2 text-sm text-ash">¿Cómo pagás la seña?</p>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setMetodo("mercadopago")}
                className={`rounded-xl border p-3 text-left transition-colors ${
                  metodo === "mercadopago" ? "border-[#009ee3] bg-[#009ee3]/10" : "border-white/10 hover:border-white/25"
                }`}
              >
                <span className="block text-sm font-semibold text-bone">MercadoPago</span>
                <span className="block text-xs text-ash">Pagás ahora, online</span>
              </button>
              <button
                type="button"
                onClick={() => setMetodo("efectivo")}
                className={`rounded-xl border p-3 text-left transition-colors ${
                  metodo === "efectivo" ? "border-flow-cyan bg-flow-cyan/10" : "border-white/10 hover:border-white/25"
                }`}
              >
                <span className="block text-sm font-semibold text-bone">Efectivo</span>
                <span className="block text-xs text-ash">Pagás la seña en el local</span>
              </button>
            </div>

            <p className="mt-4 rounded-lg bg-white/5 px-3 py-2 text-xs text-ash">
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
                <p className="text-sm text-bone">Necesitás una cuenta para confirmar el turno.</p>
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
    <button onClick={onClick} className="mb-5 flex items-center gap-2 text-sm text-ash transition-colors hover:text-bone">
      <span>←</span> {label}
    </button>
  );
}

function Row({ k, v, accent, muted }: { k: string; v: string; accent?: boolean; muted?: boolean }) {
  return (
    <div className="flex items-center justify-between">
      <dt className="text-ash">{k}</dt>
      <dd className={`font-medium ${accent ? "text-flow-cyan" : muted ? "text-ash" : "text-bone"}`}>{v}</dd>
    </div>
  );
}
