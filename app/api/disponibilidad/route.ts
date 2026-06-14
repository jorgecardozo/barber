import { NextResponse } from "next/server";
import { availableSlots } from "@/lib/availability";
import { expireHolds } from "@/lib/store";

// Lee estado en memoria → nunca cachear.
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const barber = searchParams.get("barber");
  const service = searchParams.get("service");
  const date = searchParams.get("date");

  if (!barber || !service || !date) {
    return NextResponse.json({ error: "faltan parámetros" }, { status: 400 });
  }

  expireHolds(); // limpieza lazy (en prod = cron)
  const slots = availableSlots(barber, service, date);
  return NextResponse.json({ slots });
}
