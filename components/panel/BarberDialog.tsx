"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Plus, Pencil, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Sheet as Dialog,
  SheetContent as DialogContent,
  SheetDescription as DialogDescription,
  SheetFooter as DialogFooter,
  SheetHeader as DialogHeader,
  SheetTitle as DialogTitle,
  SheetTrigger as DialogTrigger,
} from "@/components/ui/sheet";
import { createBarberAction, updateBarberAction } from "@/lib/admin-actions";

export function BarberDialog({ barber }: { barber?: { id: string; name: string; specialty: string } }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(true);
  const [pending, start] = useTransition();
  const editing = !!barber;

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    if (!editing && active) fd.set("active", "on");
    start(async () => {
      try {
        await (editing ? updateBarberAction(fd) : createBarberAction(fd));
        router.refresh();
        setOpen(false);
        toast.success(editing ? "Barbero actualizado" : "Barbero creado");
      } catch {
        toast.error("No se pudo guardar el barbero.");
      }
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {editing ? (
          <Button variant="ghost" size="icon" aria-label="Editar"><Pencil className="h-4 w-4" /></Button>
        ) : (
          <Button><Plus className="h-4 w-4" /> Nuevo barbero</Button>
        )}
      </DialogTrigger>
      <DialogContent side="right" className="p-0">
        <DialogHeader>
          <DialogTitle>{editing ? "Editar barbero" : "Nuevo barbero"}</DialogTitle>
          <DialogDescription>Nombre, especialidad{editing ? "" : " y si arranca activo"}.</DialogDescription>
        </DialogHeader>
        <form onSubmit={onSubmit} className="flex min-h-0 flex-1 flex-col">
          <div className="flex-1 space-y-4 overflow-y-auto p-6">
            {editing && <input type="hidden" name="id" value={barber!.id} />}
            <div className="space-y-1.5">
              <Label htmlFor="bname">Nombre</Label>
              <Input id="bname" name="name" defaultValue={barber?.name} required placeholder="Thiago" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="specialty">Especialidad</Label>
              <Input id="specialty" name="specialty" defaultValue={barber?.specialty} placeholder="Fades & diseños" />
            </div>
            {!editing && (
              <div className="flex items-center justify-between rounded-lg border border-border px-3 py-2">
                <div>
                  <Label htmlFor="active">Activar ahora</Label>
                  <p className="text-xs text-muted-foreground">Si está activo, aparece para reservar.</p>
                </div>
                <Switch id="active" checked={active} onCheckedChange={setActive} />
              </div>
            )}
          </div>
          <DialogFooter>
            <Button type="submit" disabled={pending}>
              {pending && <Loader2 className="h-4 w-4 animate-spin" />}
              {editing ? "Guardar" : "Crear barbero"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
