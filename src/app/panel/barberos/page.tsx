import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { BarbersTable } from "@/components/panel/BarbersTable";
import { requireAdmin } from "@/lib/auth";
import { listBarbers, getUser } from "@/lib/store";

export const metadata: Metadata = { title: "Barberos · Panel Flow Site" };
export const dynamic = "force-dynamic";

export default async function BarberosPage() {
  const admin = await requireAdmin();
  if (!admin) redirect("/panel");
  const barbers = await listBarbers();
  const emails = new Map<string, string>();
  await Promise.all(
    barbers
      .filter((b) => b.userId)
      .map(async (b) => {
        const u = await getUser(b.userId!);
        if (u?.email) emails.set(b.id, u.email);
      }),
  );

  // Pendientes primero (para que se vean arriba en la tabla).
  const rows = [...barbers]
    .sort((a, b) => Number(a.active) - Number(b.active))
    .map((b) => ({
      id: b.id,
      name: b.name,
      specialty: b.specialty,
      active: b.active,
      img: b.img,
      email: emails.get(b.id),
    }));

  return (
    <main className="flex min-h-0 w-full min-w-0 flex-1 flex-col px-4 py-6 sm:px-6 lg:px-8">
      <BarbersTable barbers={rows} isAdmin />
    </main>
  );
}
