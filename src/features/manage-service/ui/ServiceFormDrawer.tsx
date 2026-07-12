"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Trash2 } from "lucide-react";
import { Drawer, Field, inputClass } from "@/shared/ui/Drawer";
import { createServiceAction, updateServiceAction, deleteServiceAction } from "@/shared/api/admin-actions";
import type { ServiceRow } from "@/widgets/servicios/ui/ServicesTable";

type Props = {
  open: boolean;
  initial: ServiceRow | null;
  items: ServiceRow[];
  isAdmin: boolean;
  onNavigate: (s: ServiceRow) => void;
  onClose: () => void;
};

export function ServiceFormDrawer({ open, initial, items, isAdmin, onNavigate, onClose }: Props) {
  const router = useRouter();
  const editing = !!initial;
  const [pending, start] = useTransition();
  const [confirmDel, setConfirmDel] = useState(false);

  const idx = initial ? items.findIndex((x) => x.id === initial.id) : -1;
  const canPrev = idx > 0;
  const canNext = idx >= 0 && idx < items.length - 1;

  const submit = (fd: FormData) => {
    if (editing) fd.set("id", initial!.id);
    start(async () => {
      try {
        await (editing ? updateServiceAction(fd) : createServiceAction(fd));
        router.refresh();
        onClose();
        toast.success(editing ? "Servicio actualizado" : "Servicio creado");
      } catch {
        toast.error("No se pudo guardar el servicio.");
      }
    });
  };

  const remove = () => {
    if (!initial) return;
    const fd = new FormData();
    fd.set("id", initial.id);
    start(async () => {
      try {
        await deleteServiceAction(fd);
        router.refresh();
        onClose();
        toast.success("Servicio eliminado");
      } catch {
        toast.error("No se pudo eliminar el servicio.");
      }
    });
  };

  return (
    <Drawer
      open={open}
      formKey={initial?.id ?? "new"}
      title={editing ? `Servicio · ${initial!.name}` : "Nuevo servicio"}
      subtitle={editing ? "Editá precio, duración y seña" : "Definí nombre, precio, duración y seña"}
      onClose={() => { setConfirmDel(false); onClose(); }}
      onSubmit={submit}
      submitting={pending}
      submitLabel={editing ? "Guardar cambios" : "Crear servicio"}
      onPrev={canPrev ? () => onNavigate(items[idx - 1]) : undefined}
      onNext={canNext ? () => onNavigate(items[idx + 1]) : undefined}
      canPrev={canPrev}
      canNext={canNext}
      navLabel={idx >= 0 ? `${idx + 1} / ${items.length}` : undefined}
      secondaryActions={
        editing && isAdmin ? (
          confirmDel ? (
            <span className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">¿Eliminar?</span>
              <button
                type="button"
                onClick={remove}
                disabled={pending}
                className="rounded-lg bg-rose-500/15 px-3 py-2 text-sm font-medium text-rose-400 hover:bg-rose-500/25 disabled:opacity-60"
              >
                Sí, eliminar
              </button>
              <button
                type="button"
                onClick={() => setConfirmDel(false)}
                className="text-sm text-muted-foreground hover:text-foreground"
              >
                No
              </button>
            </span>
          ) : (
            <button
              type="button"
              onClick={() => setConfirmDel(true)}
              className="inline-flex items-center gap-1.5 rounded-lg border border-rose-500/40 px-3 py-2 text-sm font-medium text-rose-400 hover:bg-rose-500/10"
            >
              <Trash2 className="h-4 w-4" /> Eliminar
            </button>
          )
        ) : undefined
      }
    >
      <Field label="Nombre" full>
        <input className={inputClass} name="name" defaultValue={initial?.name} required placeholder="Corte clásico" />
      </Field>
      <Field label="Descripción" full>
        <textarea
          className={inputClass}
          name="description"
          rows={2}
          defaultValue={initial?.description}
          placeholder="Corte a máquina y tijera…"
        />
      </Field>
      <Field label="Precio ($)">
        <input
          className={inputClass}
          name="price"
          type="number"
          min="0"
          step="100"
          defaultValue={initial ? initial.priceCents / 100 : ""}
          required
          placeholder="6000"
        />
      </Field>
      <Field label="Duración (min)">
        <input
          className={inputClass}
          name="duration"
          type="number"
          min="5"
          step="5"
          defaultValue={initial?.durationMin ?? 30}
          required
        />
      </Field>
      <Field label="Seña (%)">
        <input
          className={inputClass}
          name="depositPct"
          type="number"
          min="0"
          max="100"
          step="5"
          defaultValue={initial?.depositPct ?? 40}
          required
        />
      </Field>
    </Drawer>
  );
}
