"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Plus } from "lucide-react";
import { format } from "date-fns";
import { Button } from "@/shared/ui/button";
import { Switch } from "@/shared/ui/switch";
import { Drawer, Field, inputClass } from "@/components/panel/Drawer";
import { DatePicker } from "@/shared/ui/date-picker";
import { TimePicker } from "@/shared/ui/time-picker";
import { formatARS } from "@/shared/lib/money";
import { crearTurnoWalkInAction } from "@/lib/admin-actions";

type Service = { id: string; name: string; priceCents: number; durationMin: number; depositCents: number };
type Barber = { id: string; name: string; serviceIds: string[] };
type DateOpt = { value: string; label: string };

// "Nuevo turno" usa el MISMO side-modal (Drawer) que la edición, con los mismos
// controles (selects + DatePicker + TimePicker). El horario libre lo valida el
// anti-solape de la DB (SlotTakenError) al crear.
export function WalkInDialog({
  services,
  barbers,
  dates,
}: {
  services: Service[];
  barbers: Barber[];
  dates: DateOpt[];
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pending, start] = useTransition();

  const [serviceId, setServiceId] = useState("");
  const [barberId, setBarberId] = useState("");
  const [date, setDate] = useState<Date | undefined>(dates[0] ? new Date(`${dates[0].value}T12:00:00`) : undefined);
  const [time, setTime] = useState("");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [metodo, setMetodo] = useState("efectivo");
  const [cobrada, setCobrada] = useState(false);

  const service = services.find((s) => s.id === serviceId);
  const availBarbers = useMemo(
    () => barbers.filter((b) => !serviceId || b.serviceIds.includes(serviceId)),
    [barbers, serviceId],
  );

  function reset() {
    setServiceId(""); setBarberId(""); setTime(""); setName(""); setPhone(""); setCobrada(false);
    setDate(dates[0] ? new Date(`${dates[0].value}T12:00:00`) : undefined);
  }

  function submit() {
    if (!serviceId || !barberId || !date || !time) {
      toast.error("Elegí servicio, barbero, fecha y horario.");
      return;
    }
    const startISO = new Date(`${format(date, "yyyy-MM-dd")}T${time}:00-03:00`).toISOString();
    const fd = new FormData();
    fd.set("serviceId", serviceId);
    fd.set("barberId", barberId);
    fd.set("startISO", startISO);
    fd.set("customerName", name);
    fd.set("customerPhone", phone);
    fd.set("depositMethod", metodo);
    if (cobrada) fd.set("depositPaid", "on");
    start(async () => {
      try {
        await crearTurnoWalkInAction(fd);
        router.refresh();
        setOpen(false);
        reset();
        toast.success("Turno cargado");
      } catch {
        toast.error("No se pudo cargar el turno. ¿Ese barbero ya tiene un turno en ese horario?");
      }
    });
  }

  return (
    <>
      <Button onClick={() => setOpen(true)}>
        <Plus className="h-4 w-4" /> Nuevo turno
      </Button>

      <Drawer
        open={open}
        title="Nuevo turno"
        subtitle="Cargá un turno del local (walk-in)"
        onClose={() => setOpen(false)}
        onSubmit={submit}
        submitting={pending}
        submitLabel="Cargar turno"
      >
        <Field label="Cliente">
          <input className={inputClass} value={name} onChange={(e) => setName(e.target.value)} placeholder="Nombre" />
        </Field>
        <Field label="WhatsApp">
          <input className={inputClass} value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="549299…" />
        </Field>
        <Field label="Servicio">
          <select
            className={inputClass}
            value={serviceId}
            onChange={(e) => { setServiceId(e.target.value); setBarberId(""); }}
          >
            <option value="">Elegí un servicio</option>
            {services.map((s) => (
              <option key={s.id} value={s.id}>{s.name} · {formatARS(s.priceCents)}</option>
            ))}
          </select>
        </Field>
        <Field label="Barbero">
          <select className={inputClass} value={barberId} onChange={(e) => setBarberId(e.target.value)} disabled={!serviceId}>
            <option value="">{serviceId ? "Elegí un barbero" : "Elegí primero el servicio"}</option>
            {availBarbers.map((b) => (
              <option key={b.id} value={b.id}>{b.name}</option>
            ))}
          </select>
        </Field>
        <Field label="Fecha">
          <DatePicker value={date} onChange={setDate} placeholder="Elegí una fecha" className="w-full" />
        </Field>
        <Field label="Hora">
          <TimePicker value={time} onChange={setTime} className="w-full" />
        </Field>
        <Field label="Método de seña">
          <select className={inputClass} value={metodo} onChange={(e) => setMetodo(e.target.value)}>
            <option value="efectivo">Efectivo</option>
            <option value="mercadopago">MercadoPago</option>
          </select>
        </Field>
        <div className="flex items-center justify-between rounded-lg border border-border px-3 py-2.5">
          <span className="text-sm text-foreground">Seña ya cobrada</span>
          <Switch checked={cobrada} onCheckedChange={setCobrada} />
        </div>

        {service && (
          <p className="rounded-md bg-muted/60 px-3 py-2 text-xs text-muted-foreground sm:col-span-2">
            Seña: <span className="text-flow-cyan">{formatARS(service.depositCents)}</span> · resto en el local:{" "}
            {formatARS(service.priceCents - service.depositCents)}
          </p>
        )}
      </Drawer>
    </>
  );
}
