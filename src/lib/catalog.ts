// Torii's product templates. This is the full catalogue Torii can produce; each
// owner kit permits only a subset. Client-safe: no server imports.

export interface Swatch {
  id: string;
  name: string;
  hex: string;
}

export interface LayoutTemplate {
  id: string;
  name: string;
  description: string;
  /** How many text lines the layout prints. */
  textLines: 1 | 2;
}

export interface ProductTemplate {
  id: string;
  name: string;
  description: string;
  layouts: LayoutTemplate[];
  baseColours: Swatch[];
  sizes: string[];
}

export const PRODUCTS: Record<string, ProductTemplate> = {
  tshirt: {
    id: "tshirt",
    name: "T-shirt",
    description: "220 GSM combed cotton, regular fit, screen printed",
    layouts: [
      { id: "centre", name: "Centre print", description: "Large chest artwork with a two-line text lockup", textLines: 2 },
      { id: "pocket", name: "Pocket print", description: "Small left-chest mark with one short line", textLines: 1 },
    ],
    baseColours: [
      { id: "ivory", name: "Washi ivory", hex: "#F2EBDC" },
      { id: "ink", name: "Sumi ink", hex: "#1F2A26" },
      { id: "sage", name: "Matcha sage", hex: "#A7B59C" },
      { id: "indigo", name: "Ai indigo", hex: "#2C3B5A" },
    ],
    sizes: ["S", "M", "L", "XL", "XXL"],
  },
  poster: {
    id: "poster",
    name: "Poster",
    description: "A3 giclée print on 250 GSM matte stock",
    layouts: [
      { id: "gallery", name: "Gallery", description: "Artwork-led with a headline beneath", textLines: 2 },
      { id: "framed", name: "Framed", description: "Inset border with a title band", textLines: 2 },
    ],
    baseColours: [
      { id: "paper", name: "Cotton paper", hex: "#F6F1E7" },
      { id: "night", name: "Night sky", hex: "#1B2A33" },
    ],
    sizes: ["A3"],
  },
  glassware: {
    id: "glassware",
    name: "Glassware",
    description: "350 ml tumbler, wrap-around print",
    layouts: [{ id: "wrap", name: "Wrap", description: "Centred mark with a single line", textLines: 1 }],
    baseColours: [
      { id: "clear", name: "Clear", hex: "#DCE7E4" },
      { id: "frost", name: "Frosted", hex: "#EEF2EF" },
    ],
    sizes: ["350 ml"],
  },
};

export const PRODUCT_IDS = Object.keys(PRODUCTS);

export const TEXT_COLOURS: Swatch[] = [
  { id: "ink", name: "Ink", hex: "#1F2A26" },
  { id: "ivory", name: "Ivory", hex: "#F6F1E7" },
  { id: "vermilion", name: "Vermilion", hex: "#D9472B" },
  { id: "gold", name: "Kin gold", hex: "#C9A15B" },
];

export const FONTS = {
  display: { name: "Serif display", css: "var(--font-serif), Georgia, serif" },
  sans: { name: "Clean sans", css: "var(--font-sans), system-ui, sans-serif" },
} as const;

export type FontId = keyof typeof FONTS;

export const CHANNELS = [
  { id: "instagram", label: "Instagram" },
  { id: "campus_stall", label: "Campus fest stall" },
  { id: "discord", label: "Discord server" },
  { id: "whatsapp", label: "WhatsApp community" },
  { id: "youtube", label: "YouTube" },
  { id: "convention", label: "Convention booth" },
] as const;

export const TERRITORIES: Record<string, string> = {
  IN: "India",
  JP: "Japan",
  US: "United States",
};

export function productName(id: string): string {
  return PRODUCTS[id]?.name ?? id;
}

export function layoutName(productId: string, layoutId: string): string {
  return PRODUCTS[productId]?.layouts.find((l) => l.id === layoutId)?.name ?? layoutId;
}

export function swatch(list: Swatch[], idOrHex: string): Swatch | undefined {
  return list.find((s) => s.id === idOrHex);
}

/** Relative luminance contrast ratio between two hex colours. */
export function contrastRatio(a: string, b: string): number {
  const lum = (hex: string) => {
    const n = parseInt(hex.slice(1), 16);
    const ch = [(n >> 16) & 255, (n >> 8) & 255, n & 255].map((v) => {
      const c = v / 255;
      return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
    });
    return 0.2126 * ch[0] + 0.7152 * ch[1] + 0.0722 * ch[2];
  };
  const [l1, l2] = [lum(a), lum(b)].sort((x, y) => y - x);
  return (l1 + 0.05) / (l2 + 0.05);
}
