"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
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
      await setBarberActiveAction(fd);
      router.refresh();
    });
  }
  return <Switch checked={active} onCheckedChange={toggle} disabled={pending} aria-label="Activar barbero" />;
}
