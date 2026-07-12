import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { ServicesTable } from "@/widgets/servicios/ui/ServicesTable";
import { requireStaff } from "@/shared/api/auth";
import { listServices } from "@/shared/api/store";

export const metadata: Metadata = { title: "Servicios · Panel Flow Site" };
export const dynamic = "force-dynamic";

export default async function ServiciosPage() {
  const staff = await requireStaff();
  if (!staff) redirect("/panel/ingresar");
  const services = await listServices();
  const isAdmin = staff.role === "admin";

  return (
    <main className="flex min-h-0 w-full min-w-0 flex-1 flex-col px-4 py-6 sm:px-6 lg:px-8">
      <ServicesTable
        services={services.map((s) => ({
          id: s.id,
          name: s.name,
          description: s.description,
          priceCents: s.priceCents,
          durationMin: s.durationMin,
          depositPct: s.depositPct,
        }))}
        isAdmin={isAdmin}
      />
    </main>
  );
}
