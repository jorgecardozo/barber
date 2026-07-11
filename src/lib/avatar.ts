/** Opciones y armado del avatar del cliente (DiceBear avataaars). */

export const AVATAR_OPTIONS = {
  top: [
    { v: "shortFlat", l: "Corte clásico" },
    { v: "shortCurly", l: "Enrulado" },
    { v: "fro", l: "Afro" },
    { v: "theCaesar", l: "Rapado" },
    { v: "dreads01", l: "Dreads" },
    { v: "longButNotTooLong", l: "Pelo largo" },
    { v: "bob", l: "Carré" },
    { v: "hat", l: "Gorra" },
    { v: "turban", l: "Turbante" },
    { v: "winterHat02", l: "Gorro" },
  ],
  hairColor: [
    { v: "2c1b18", l: "Negro" },
    { v: "724133", l: "Castaño" },
    { v: "4a312c", l: "Castaño oscuro" },
    { v: "b58143", l: "Rubio" },
    { v: "a55728", l: "Colorado" },
    { v: "b1b1b1", l: "Canoso" },
    { v: "e8e1e1", l: "Platinado" },
  ],
  clothing: [
    { v: "hoodie", l: "Buzo" },
    { v: "shirtCrewNeck", l: "Remera" },
    { v: "collarAndSweater", l: "Camisa" },
    { v: "shirtScoopNeck", l: "Musculosa" },
    { v: "blazerAndShirt", l: "Blazer" },
    { v: "graphicShirt", l: "Estampada" },
  ],
  clothesColor: [
    { v: "262e33", l: "Negro" },
    { v: "e23b3b", l: "Rojo" },
    { v: "3c7dd9", l: "Azul" },
    { v: "65676b", l: "Gris" },
    { v: "e6e6e6", l: "Blanco" },
    { v: "5cb85c", l: "Verde" },
  ],
  accessories: [
    { v: "none", l: "Sin anteojos" },
    { v: "prescription02", l: "Anteojos" },
    { v: "sunglasses", l: "De sol" },
    { v: "round", l: "Redondos" },
  ],
  facialHair: [
    { v: "none", l: "Sin barba" },
    { v: "beardMedium", l: "Barba" },
    { v: "beardLight", l: "Candado" },
    { v: "moustacheFancy", l: "Bigote" },
  ],
} as const;

export type AvatarOpts = {
  seed: string;
  top: string;
  hairColor: string;
  clothing: string;
  clothesColor: string;
  accessories: string;
  facialHair: string;
};

export const AVATAR_DEFAULTS: Omit<AvatarOpts, "seed"> = {
  top: "shortFlat",
  hairColor: "2c1b18",
  clothing: "hoodie",
  clothesColor: "262e33",
  accessories: "none",
  facialHair: "none",
};

/** Reconstruye las opciones desde una URL guardada (para precargar el builder). */
export function parseAvatarUrl(url?: string): Partial<Omit<AvatarOpts, "seed">> {
  if (!url) return {};
  let q: URLSearchParams;
  try {
    q = new URL(url).searchParams;
  } catch {
    return {};
  }
  const out: Partial<Omit<AvatarOpts, "seed">> = {};
  const top = q.get("top");
  const hairColor = q.get("hairColor");
  const clothing = q.get("clothing");
  const clothesColor = q.get("clothesColor");
  if (top) out.top = top;
  if (hairColor) out.hairColor = hairColor;
  if (clothing) out.clothing = clothing;
  if (clothesColor) out.clothesColor = clothesColor;
  out.accessories = q.get("accessoriesProbability") === "0" ? "none" : q.get("accessories") ?? "none";
  out.facialHair = q.get("facialHairProbability") === "0" ? "none" : q.get("facialHair") ?? "none";
  return out;
}

export function buildAvatarUrl(o: AvatarOpts): string {
  const p = new URLSearchParams();
  p.set("seed", o.seed || "flow");
  p.set("radius", "50");
  p.set("top", o.top);
  p.set("hairColor", o.hairColor);
  p.set("clothing", o.clothing);
  p.set("clothesColor", o.clothesColor);
  if (o.accessories === "none") {
    p.set("accessoriesProbability", "0");
  } else {
    p.set("accessories", o.accessories);
    p.set("accessoriesProbability", "100");
  }
  if (o.facialHair === "none") {
    p.set("facialHairProbability", "0");
  } else {
    p.set("facialHair", o.facialHair);
    p.set("facialHairProbability", "100");
  }
  return `https://api.dicebear.com/9.x/avataaars/svg?${p.toString()}`;
}
