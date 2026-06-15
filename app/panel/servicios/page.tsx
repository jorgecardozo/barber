import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { PanelHeader } from "@/components/panel/PanelHeader";
import { ServiceDialog } from "@/components/panel/ServiceDialog";
import { DeleteServiceButton } from "@/components/panel/DeleteServiceButton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { requireStaff } from "@/lib/auth";
import { listServices } from "@/lib/store";
import { depositForPrice } from "@/lib/decisions";
import { formatARS } from "@/lib/money";

export const metadata: Metadata = { title: "Servicios · Panel Flow Site" };
export const dynamic = "force-dynamic";

export default async function ServiciosPage() {
  const staff = await requireStaff();
  if (!staff) redirect("/panel/ingresar");
  const services = listServices();
  const isAdmin = staff.role === "admin";

  return (
    <>
      <PanelHeader user={staff} active="servicios" />
      <main className="mx-auto w-full max-w-5xl min-w-0 flex-1 overflow-x-clip px-6 py-10 lg:px-8">
        <div className="mb-6 flex items-end justify-between">
          <div>
            <h1 className="font-display text-3xl">Servicios</h1>
            <p className="text-sm text-muted-foreground">Precios, duración y seña de cada corte.</p>
          </div>
          <ServiceDialog />
        </div>

        <div className="overflow-x-auto rounded-xl border border-border">
          <Table className="min-w-[640px]">
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead>Servicio</TableHead>
                <TableHead>Duración</TableHead>
                <TableHead>Precio</TableHead>
                <TableHead>Seña</TableHead>
                <TableHead className="text-right">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {services.map((s) => (
                <TableRow key={s.id}>
                  <TableCell>
                    <span className="font-medium text-foreground">{s.name}</span>
                    <span className="block max-w-xs truncate text-xs text-muted-foreground">{s.description}</span>
                  </TableCell>
                  <TableCell className="text-muted-foreground">{s.durationMin} min</TableCell>
                  <TableCell className="text-foreground">{formatARS(s.priceCents)}</TableCell>
                  <TableCell className="text-flow-cyan">
                    {formatARS(depositForPrice(s.priceCents))} <span className="text-xs text-muted-foreground">({s.depositPct}%)</span>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-1">
                      <ServiceDialog service={{ id: s.id, name: s.name, description: s.description, priceCents: s.priceCents, durationMin: s.durationMin, depositPct: s.depositPct }} />
                      {isAdmin && <DeleteServiceButton id={s.id} name={s.name} />}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </main>
    </>
  );
}
