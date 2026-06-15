import { NextResponse } from "next/server";
import { availableSlots, daySlotGrid, horizonAvailability } from "@/lib/availability";
import { expireHolds } from "@/lib/store";

// Lee estado en memoria → nunca cachear.
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const barber = searchParams.get("barber");
  const service = searchParams.get("service");

  if (!barber || !service) {
    return NextResponse.json({ error: "faltan parámetros" }, { status: 400 });
  }
  expireHolds(); // limpieza lazy (en prod = cron)

  // Resumen del horizonte (cuántos libres por día) para el calendario
  if (searchParams.get("resumen")) {
    return NextResponse.json({ dias: horizonAvailability(barber, service) });
  }

  const date = searchParams.get("date");
  if (!date) return NextResponse.json({ error: "falta date" }, { status: 400 });

  const grid = daySlotGrid(barber, service, date);
  const slots = availableSlots(barber, service, date); // disponibles (compat walk-in)
  return NextResponse.json({ slots, grid });
}
