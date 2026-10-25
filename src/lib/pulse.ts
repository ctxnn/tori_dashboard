// The fan pulse: a short census an IP owner can run before any campaign exists.
// Client-safe: shared by the public form and the owner's insights.

export const WANTS = [
  { id: "tshirt", label: "T-shirt", productId: "tshirt" },
  { id: "poster", label: "Poster", productId: "poster" },
  { id: "hoodie", label: "Hoodie", productId: null },
  { id: "glassware", label: "Chai glass", productId: "glassware" },
  { id: "stickers", label: "Sticker sheet", productId: null },
  { id: "pin", label: "Enamel pin", productId: null },
  { id: "tote", label: "Tote bag", productId: null },
  { id: "figure", label: "Figure", productId: null },
] as const;

/** "The most you'd pay for an official T-shirt", in paise. */
export const PRICE_BANDS = [29900, 39900, 49900, 59900, 69900, 79900, 99900, 129900] as const;

export const WATCH_CHANNELS = [
  { id: "crunchyroll", label: "Crunchyroll" },
  { id: "netflix", label: "Netflix" },
  { id: "youtube", label: "YouTube" },
  { id: "reels", label: "Instagram Reels" },
  { id: "discord", label: "Discord watch-parties" },
  { id: "friends", label: "Friends & clubs" },
] as const;

export const LANGUAGES = [
  { id: "ja_en", label: "Japanese, English subs" },
  { id: "hi", label: "Hindi dub" },
  { id: "en", label: "English dub" },
  { id: "ta", label: "Tamil dub" },
  { id: "te", label: "Telugu dub" },
  { id: "other", label: "Another language" },
] as const;

export const AGE_BANDS = ["Under 18", "18–24", "25–34", "35+"] as const;

export type WantId = (typeof WANTS)[number]["id"];

export const labelOf = <T extends { id: string; label: string }>(list: readonly T[], id: string) => list.find((x) => x.id === id)?.label ?? id;
