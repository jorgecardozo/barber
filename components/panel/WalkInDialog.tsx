"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Plus, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { formatARS } from "@/lib/money";
import { crearTurnoWalkInAction } from "@/lib/admin-actions";

type Service = { id: string; name: string; priceCents: number; durationMin: number; depositCents: number };
type Barber = { id: string; name: string; serviceIds: string[] };
type DateOpt = { value: string; label: string };
type Slot = { hhmm: string; startISO: string };

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
  const [date, setDate] = useState(dates[0]?.value ?? "");
  const [slotISO, setSlotISO] = useState("");
  const [slots, setSlots] = useState<Slot[]>([]);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [metodo, setMetodo] = useState("efectivo");
  const [cobrada, setCobrada] = useState(false);

  const service = services.find((s) => s.id === serviceId);
  const availBarbers = barbers.filter((b) => !serviceId || b.serviceIds.includes(serviceId));

  useEffect(() => {
    if (!serviceId || !barberId || !date) {
      setSlots([]);
      return;
    }
    let cancel = false;
    setLoadingSlots(true);
    setSlotISO("");
    fetch(`/api/disponibilidad?barber=${barberId}&service=${serviceId}&date=${date}`)
      .then((r) => r.json())
      .then((d) => !cancel && setSlots(d.slots ?? []))
      .catch(() => !cancel && setSlots([]))
      .finally(() => !cancel && setLoadingSlots(false));
    return () => {
      cancel = true;
    };
  }, [serviceId, barberId, date]);

  function submit() {
    if (!serviceId || !barberId || !slotISO) {
      toast.error("Elegí servicio, barbero y horario.");
      return;
    }
    const fd = new FormData();
    fd.set("serviceId", serviceId);
    fd.set("barberId", barberId);
    fd.set("startISO", slotISO);
    fd.set("customerName", (document.getElementById("wi-name") as HTMLInputElement)?.value ?? "");
    fd.set("customerPhone", (document.getElementById("wi-phone") as HTMLInputElement)?.value ?? "");
    fd.set("depositMethod", metodo);
    if (cobrada) fd.set("depositPaid", "on");
    start(async () => {
      try {
        await crearTurnoWalkInAction(fd);
        router.refresh();
        setOpen(false);
        setServiceId("");
        setBarberId("");
        setSlotISO("");
        toast.success("Turno cargado");
      } catch {
        toast.error("No se pudo cargar el turno. ¿El horario sigue libre?");
      }
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button><Plus className="h-4 w-4" /> Nuevo turno</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Cargar turno (walk-in)</DialogTitle>
          <DialogDescription>Para clientes que vienen al local a pedir turno.</DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <Field label="Servicio">
              <Select value={serviceId} onValueChange={setServiceId}>
                <SelectTrigger><SelectValue placeholder="Elegir" /></SelectTrigger>
                <SelectContent>
                  {services.map((s) => (
                    <SelectItem key={s.id} value={s.id}>{s.name} · {formatARS(s.priceCents)}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
            <Field label="Barbero">
              <Select value={barberId} onValueChange={setBarberId}>
                <SelectTrigger><SelectValue placeholder="Elegir" /></SelectTrigger>
                <SelectContent>
                  {availBarbers.map((b) => <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </Field>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Field label="Día">
              <Select value={date} onValueChange={setDate}>
                <SelectTrigger><SelectValue placeholder="Elegir" /></SelectTrigger>
                <SelectContent>
                  {dates.map((d) => <SelectItem key={d.value} value={d.value}>{d.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </Field>
            <Field label="Horario">
              <Select value={slotISO} onValueChange={setSlotISO} disabled={loadingSlots || slots.length === 0}>
                <SelectTrigger><SelectValue placeholder={loadingSlots ? "Cargando…" : slots.length ? "Elegir" : "Sin horarios"} /></SelectTrigger>
                <SelectContent>
                  {slots.map((s) => <SelectItem key={s.startISO} value={s.startISO}>{s.hhmm} hs</SelectItem>)}
                </SelectContent>
              </Select>
            </Field>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Field label="Cliente">
              <Input id="wi-name" placeholder="Nombre" />
            </Field>
            <Field label="WhatsApp">
              <Input id="wi-phone" placeholder="549299..." />
            </Field>
          </div>

          <div className="grid grid-cols-2 items-end gap-3">
            <Field label="Método de seña">
              <Select value={metodo} onValueChange={setMetodo}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="efectivo">Efectivo</SelectItem>
                  <SelectItem value="mercadopago">MercadoPago</SelectItem>
                </SelectContent>
              </Select>
            </Field>
            <div className="flex items-center justify-between rounded-lg border border-border px-3 py-2.5">
              <Label htmlFor="wi-cobrada" className="text-sm">Seña ya cobrada</Label>
              <Switch id="wi-cobrada" checked={cobrada} onCheckedChange={setCobrada} />
            </div>
          </div>

          {service && (
            <p className="rounded-md bg-secondary/60 px-3 py-2 text-xs text-muted-foreground">
              Seña: <span className="text-flow-cyan">{formatARS(service.depositCents)}</span> · resto en el local: {formatARS(service.priceCents - service.depositCents)}
            </p>
          )}
        </div>

        <DialogFooter>
          <Button onClick={submit} disabled={pending}>
            {pending && <Loader2 className="h-4 w-4 animate-spin" />}
            Cargar turno
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs text-muted-foreground">{label}</Label>
      {children}
    </div>
  );
}
