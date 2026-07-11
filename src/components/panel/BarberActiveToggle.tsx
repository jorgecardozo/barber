"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Switch } from "@/components/ui/switch";
import { setBarberActiveAction } from "@/lib/admin-actions";

export function BarberActiveToggle({ id, active }: { id: string; active: boolean }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  function toggle(v: boolean) {
    const fd = new FormData();
    fd.set("id", id);
    fd.set("active", v ? "true" : "false");
    start(async () => {
      try {
        await setBarberActiveAction(fd);
        router.refresh();
        toast.success(v ? "Barbero activado — ya aparece para reservar" : "Barbero desactivado");
      } catch {
        toast.error("No se pudo cambiar el estado.");
      }
    });
  }
  return <Switch checked={active} onCheckedChange={toggle} disabled={pending} aria-label="Activar barbero" />;
}
