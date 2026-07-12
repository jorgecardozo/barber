import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { ClientShell } from "@/widgets/app-shell/ui/ClientShell";
import { AvatarBuilder } from "@/features/edit-avatar/ui/AvatarBuilder";
import { getSessionUser } from "@/shared/api/auth";
import { parseAvatarUrl } from "@/shared/lib/avatar";

export const metadata: Metadata = { title: "Mi avatar · Flow Site" };
export const dynamic = "force-dynamic";

export default async function PerfilPage() {
  const user = await getSessionUser();
  if (!user) redirect("/ingresar?next=/perfil");

  return (
    <ClientShell user={user}>
      <section className="mx-auto max-w-4xl px-5 py-12">
        <h1 className="font-display text-3xl">
          Mi <span className="chrome-text italic">avatar</span>
        </h1>
        <p className="mt-1 mb-8 max-w-prose text-sm text-ash">
          Armá tu personaje, {user.name.split(" ")[0]}: elegí pelo, gorra, barba, anteojos y ropa.
          Así te van a ver en la cola de la barbería.
        </p>
        <AvatarBuilder seed={user.name} initial={parseAvatarUrl(user.avatarUrl)} />
      </section>
    </ClientShell>
  );
}
