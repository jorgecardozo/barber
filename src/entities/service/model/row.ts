// Fila de servicio para la tabla del panel (proyección serializable).
export type ServiceRow = {
  id: string;
  name: string;
  description: string;
  priceCents: number;
  durationMin: number;
  depositPct: number;
};
