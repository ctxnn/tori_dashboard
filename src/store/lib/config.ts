export const APP_NAME = "Torii";
export const APP_TAGLINE = "The official home of Japanese manga in India";
export const CHAPTER_PRICE = 9;
export const FREE_CHAPTERS_IN_PAID_MODE = 3;
export const SECTIONS = {
  read: { label: "Read", accent: "200 40 43" },
  manga: { label: "Manga", accent: "45 72 178" },
  figures: { label: "Figures", accent: "186 120 22" },
  collabs: { label: "Collabs", accent: "226 64 42" },
  shelf: { label: "My Shelf", accent: "46 125 91" },
  account: { label: "Account", accent: "200 40 43" },
} as const;
export type SectionKey = keyof typeof SECTIONS;

/* ---------- Torii Partner Programme (Japanese publishers) ---------- */
/** Standard partner terms. Publishers see these when they join and on every statement. */
export const PARTNER_TERMS = {
  version: "2026-10",
  /** Share of each ₹9 chapter unlock paid to the publisher. */
  unlockShare: 0.7,
  /** Royalty on India-printed volumes and box sets, as a share of the cover price. */
  printShare: 0.4,
  /** Licensing royalty on figures and merchandise. */
  figureShare: 0.15,
  /** Statements close monthly and are paid this many days after month end. */
  payoutDays: 45,
} as const;
export const PARTNER_GENRES = [
  "Action", "Adventure", "Comedy", "Drama", "Fantasy", "Horror", "Mystery", "Psychological", "Romance",
  "Sci-Fi", "Slice of Life", "Sports", "Supernatural", "Thriller", "Mecha", "Music", "Historical",
] as const;
export const DEMOGRAPHICS = ["Shonen", "Seinen", "Shojo", "Josei", "Kodomo"] as const;
/** Upload limits for partner artwork and pages (after in-browser optimisation). */
export const UPLOAD = { maxBytes: 3 * 1024 * 1024, maxPagesPerChapter: 120, pageWidth: 1400 } as const;
