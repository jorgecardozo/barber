"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Plus, Pencil, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { createServiceAction, updateServiceAction } from "@/lib/admin-actions";

export type ServiceForm = {
  id: string;
  name: string;
  description: string;
  priceCents: number;
  durationMin: number;
  depositPct: number;
};

export function ServiceDialog({ service }: { service?: ServiceForm }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pending, start] = useTransition();
  const editing = !!service;

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    start(async () => {
      await (editing ? updateServiceAction(fd) : createServiceAction(fd));
      router.refresh();
      setOpen(false);
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {editing ? (
          <Button variant="ghost" size="icon" aria-label="Editar"><Pencil className="h-4 w-4" /></Button>
        ) : (
          <Button><Plus className="h-4 w-4" /> Nuevo servicio</Button>
        )}
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{editing ? "Editar servicio" : "Nuevo servicio"}</DialogTitle>
          <DialogDescription>Definí nombre, precio, duración y seña.</DialogDescription>
        </DialogHeader>
        <form onSubmit={onSubmit} className="space-y-4">
          {editing && <input type="hidden" name="id" value={service!.id} />}
          <div className="space-y-1.5">
            <Label htmlFor="name">Nombre</Label>
            <Input id="name" name="name" defaultValue={service?.name} required placeholder="Corte clásico" />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="description">Descripción</Label>
            <Textarea id="description" name="description" defaultValue={service?.description} placeholder="Corte a máquina y tijera…" rows={2} />
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="price">Precio ($)</Label>
              <Input id="price" name="price" type="number" min="0" step="100" defaultValue={service ? service.priceCents / 100 : ""} required placeholder="6000" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="duration">Duración (min)</Label>
              <Input id="duration" name="duration" type="number" min="5" step="5" defaultValue={service?.durationMin ?? 30} required />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="depositPct">Seña (%)</Label>
              <Input id="depositPct" name="depositPct" type="number" min="0" max="100" step="5" defaultValue={service?.depositPct ?? 40} required />
            </div>
          </div>
          <DialogFooter>
            <Button type="submit" disabled={pending}>
              {pending && <Loader2 className="h-4 w-4 animate-spin" />}
              {editing ? "Guardar cambios" : "Crear servicio"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
