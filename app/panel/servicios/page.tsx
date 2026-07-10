import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { ServiceDialog } from "@/components/panel/ServiceDialog";
import { ServicesTable } from "@/components/panel/ServicesTable";
import { requireStaff } from "@/lib/auth";
import { listServices } from "@/lib/store";

export const metadata: Metadata = { title: "Servicios · Panel Flow Site" };
export const dynamic = "force-dynamic";

export default async function ServiciosPage() {
  const staff = await requireStaff();
  if (!staff) redirect("/panel/ingresar");
  const services = await listServices();
  const isAdmin = staff.role === "admin";

  return (
    <main className="mx-auto flex min-h-0 w-full max-w-5xl min-w-0 flex-1 flex-col px-4 py-6 sm:px-6 lg:px-8">
      <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-3xl">Servicios</h1>
          <p className="text-sm text-muted-foreground">Precios, duración y seña de cada corte.</p>
        </div>
        <ServiceDialog />
      </div>

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
