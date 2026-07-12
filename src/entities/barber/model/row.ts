// Fila de barbero para la tabla del panel (proyección serializable).
export type BarberRow = {
  id: string;
  name: string;
  specialty: string;
  active: boolean;
  img?: string;
  email?: string;
};
