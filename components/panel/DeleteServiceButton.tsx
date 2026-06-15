"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { deleteServiceAction } from "@/lib/admin-actions";

export function DeleteServiceButton({ id, name }: { id: string; name: string }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  function onClick() {
    if (!confirm(`¿Eliminar el servicio "${name}"? Los turnos existentes no se borran.`)) return;
    const fd = new FormData();
    fd.set("id", id);
    start(async () => {
      await deleteServiceAction(fd);
      router.refresh();
    });
  }
  return (
    <Button variant="ghost" size="icon" onClick={onClick} disabled={pending} aria-label="Eliminar">
      <Trash2 className="h-4 w-4 text-destructive" />
    </Button>
  );
}
