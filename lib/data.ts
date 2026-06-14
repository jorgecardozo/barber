/**
 * DATOS DE PRUEBA — Flow Site
 * ⚠️ Placeholders. Reemplazá por los datos reales de la barbería
 *    (precios, nombres de barberos, fragancias en stock, etc.).
 */

export const BUSINESS = {
  name: "Flow Site",
  tagline: "El Sitio Del Flow",
  description: "Barbería & Fragancias árabes",
  address: "San José Obrero 993",
  hours: "Lunes a lunes",
  instagram: "https://www.instagram.com/flow_site_/",
  instagramHandle: "@flow_site_",
  // ⚠️ Poné el número real con código de país, sin signos: 549...
  whatsapp: "5490000000000",
};

export type Service = {
  name: string;
  description: string;
  price: string;
  duration: string;
  featured?: boolean;
};

export const SERVICES: Service[] = [
  {
    name: "Corte clásico",
    description: "Corte a máquina y tijera, terminación prolija.",
    price: "$6.000",
    duration: "30 min",
  },
  {
    name: "Corte + Barba",
    description: "El combo completo: corte, perfilado y arreglo de barba.",
    price: "$8.500",
    duration: "45 min",
    featured: true,
  },
  {
    name: "Degradado (Fade)",
    description: "Degradado a piel con diseño y definición.",
    price: "$7.000",
    duration: "40 min",
  },
  {
    name: "Color / Platinado",
    description: "Decoloración y color al tono que quieras.",
    price: "$15.000",
    duration: "90 min",
  },
  {
    name: "Diseño / Líneas",
    description: "Líneas y diseños freestyle a navaja.",
    price: "$2.000",
    duration: "15 min",
  },
  {
    name: "Corte niños",
    description: "Para los más chicos, con paciencia y flow.",
    price: "$5.000",
    duration: "30 min",
  },
];

export type Barber = {
  name: string;
  role: string;
  specialty: string;
  img: string;
};

/**
 * ⚠️ Fotos de barberos (public/barbers/*) son de stock (Unsplash) como MUESTRA.
 * Reemplazá por fotos reales del equipo y verificá que el nombre corresponda.
 */
export const BARBERS: Barber[] = [
  { name: "Gavazz", role: "Co-founder & Barbero", specialty: "Fades & diseños", img: "/barbers/br1.jpg" },
  { name: "Barbero 2", role: "Barbero", specialty: "Clásicos & barba", img: "/barbers/br2.jpg" },
  { name: "Barbero 3", role: "Barbero", specialty: "Color & platinados", img: "/barbers/br3.jpg" },
];

export type Fragrance = {
  name: string;
  house: string;
  notes: string;
  type: "Original" | "G5";
  img: string;
};

/**
 * ⚠️ Fotos de fragancias (public/fragrances/*) son de stock (Unsplash) como
 * MUESTRA — son bottles de otras marcas. Reemplazá por fotos de los perfumes
 * reales que vende Flow.
 */
export const FRAGRANCES: Fragrance[] = [
  { name: "Khamrah", house: "Lattafa", notes: "Dulce, especiado, canela", type: "Original", img: "/fragrances/f1.jpg" },
  { name: "9 PM", house: "Afnan", notes: "Amaderado, vainilla", type: "Original", img: "/fragrances/f2.jpg" },
  { name: "Vulcan Feel", house: "French Avenue", notes: "Fresco, frutal", type: "Original", img: "/fragrances/f3.jpg" },
  { name: "Asad", house: "Lattafa", notes: "Intenso, ámbar", type: "Original", img: "/fragrances/f4.jpg" },
  { name: "Sauvage (insp.)", house: "Línea G5", notes: "Cítrico, pimienta", type: "G5", img: "/fragrances/f5.jpg" },
  { name: "Invictus (insp.)", house: "Línea G5", notes: "Acuático, fresco", type: "G5", img: "/fragrances/f6.jpg" },
];

/**
 * Galería. ⚠️ Las fotos (public/gallery/*) son de stock de Unsplash (libres
 * para uso comercial) usadas como MUESTRA. Reemplazá por las fotos reales de
 * los trabajos de Flow antes de publicar.
 */
export const GALLERY = [
  { id: 1, label: "Fade clásico", img: "/gallery/g1.jpg" },
  { id: 2, label: "Diseño freestyle", img: "/gallery/g2.jpg" },
  { id: 3, label: "Styling", img: "/gallery/g3.jpg" },
  { id: 4, label: "Corte + barba", img: "/gallery/g4.jpg" },
  { id: 5, label: "Degradado", img: "/gallery/g5.jpg" },
  { id: 6, label: "El local", img: "/gallery/g6.jpg" },
];
