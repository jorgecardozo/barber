"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Drawer, Field, inputClass } from "@/components/panel/Drawer";
import { BarberActiveToggle } from "@/components/panel/BarberActiveToggle";
import { Switch } from "@/shared/ui/switch";
import { createBarberAction, updateBarberAction } from "@/shared/api/admin-actions";
import type { BarberRow } from "@/components/panel/BarbersTable";

type Props = {
  open: boolean;
  initial: BarberRow | null;
  items: BarberRow[];
  isAdmin: boolean;
  onNavigate: (b: BarberRow) => void;
  onClose: () => void;
};

export function BarberFormDrawer({ open, initial, items, isAdmin, onNavigate, onClose }: Props) {
  const router = useRouter();
  const editing = !!initial;
  const [pending, start] = useTransition();
  const [active, setActive] = useState(true);

  const idx = initial ? items.findIndex((x) => x.id === initial.id) : -1;
  const canPrev = idx > 0;
  const canNext = idx >= 0 && idx < items.length - 1;

  const submit = (fd: FormData) => {
    if (editing) fd.set("id", initial!.id);
    else if (active) fd.set("active", "on");
    start(async () => {
      try {
        await (editing ? updateBarberAction(fd) : createBarberAction(fd));
        router.refresh();
        onClose();
        toast.success(editing ? "Barbero actualizado" : "Barbero creado");
      } catch {
        toast.error("No se pudo guardar el barbero.");
      }
    });
  };

  return (
    <Drawer
      open={open}
      formKey={initial?.id ?? "new"}
      title={editing ? `Barbero · ${initial!.name}` : "Nuevo barbero"}
      subtitle={editing ? (initial!.active ? "Activo" : "Pendiente de activación") : "Cargá un nuevo barbero"}
      onClose={onClose}
      onSubmit={submit}
      submitting={pending}
      submitLabel={editing ? "Guardar cambios" : "Crear barbero"}
      onPrev={canPrev ? () => onNavigate(items[idx - 1]) : undefined}
      onNext={canNext ? () => onNavigate(items[idx + 1]) : undefined}
      canPrev={canPrev}
      canNext={canNext}
      navLabel={idx >= 0 ? `${idx + 1} / ${items.length}` : undefined}
      secondaryActions={
        editing && isAdmin ? (
          <span className="flex items-center gap-2 text-sm text-muted-foreground">
            Estado <BarberActiveToggle id={initial!.id} active={initial!.active} />
          </span>
        ) : undefined
      }
    >
      <Field label="Nombre" full>
        <input className={inputClass} name="name" defaultValue={initial?.name} required placeholder="Thiago" />
      </Field>
      <Field label="Especialidad" full>
        <input className={inputClass} name="specialty" defaultValue={initial?.specialty} placeholder="Fades & diseños" />
      </Field>
      {editing && initial?.email && (
        <Field label="Email">
          <input className={`${inputClass} opacity-70`} defaultValue={initial.email} disabled />
        </Field>
      )}
      {!editing && (
        <div className="flex items-center justify-between rounded-lg border border-border px-3 py-2 sm:col-span-2">
          <div>
            <span className="text-sm font-medium text-foreground">Activar ahora</span>
            <p className="text-xs text-muted-foreground">Si está activo, aparece para reservar.</p>
          </div>
          <Switch checked={active} onCheckedChange={setActive} aria-label="Activar barbero" />
        </div>
      )}
    </Drawer>
  );
}
