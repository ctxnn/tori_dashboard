export type Lang = "en" | "hi" | "ta" | "te" | "bn";
export const LANGS: { code: Lang; name: string; native: string }[] = [
  { code: "en", name: "English", native: "English" },
  { code: "hi", name: "Hindi", native: "हिन्दी" },
  { code: "ta", name: "Tamil", native: "தமிழ்" },
  { code: "te", name: "Telugu", native: "తెలుగు" },
  { code: "bn", name: "Bengali", native: "বাংলা" },
];

export interface Publisher { id: string; name: string; }
export interface Series {
  id: string; slug: string; title: string; author: string; publisherId: string;
  genres: string[]; status: "ongoing" | "completed"; synopsis: string; color: string;
  languages: Lang[]; popularity: number; totalChapters: number; totalVolumes: number; startYear: number;
  /** Chapters per printed volume, used to work out which volume a chapter belongs to. */
  cpv: number;
  /** Price of an India-printed volume, in rupees. */
  volPrice: number;
  /** Shonen, Seinen, Shojo or Josei, when known. */
  demographic?: string;
  /** Average rating out of 100, when known. */
  score?: number;
  /** Cover art URL (from the publisher, or AniList in this prototype). Falls back to generated art. */
  image?: string;
  /** Wide banner art URL for the billboard. */
  banner?: string;
  /** YouTube video id of the anime adaptation's trailer. */
  trailer?: string;
  /** "partner" when a publisher submitted this series through the Partner Portal. */
  source?: "partner";
  /** Original Japanese title (partner series). */
  titleJa?: string;
  /** Partner series: pages uploaded per language, one entry per released chapter (index = chapter - 1). */
  partnerPages?: Partial<Record<Lang, number>>[];
  /** Partner series: chapter titles, one per released chapter. */
  chapterTitles?: string[];
  /** Partner series: the next chapter that is scheduled but not yet out. */
  nextRelease?: { number: number; at: string };
  /** Partner series: "free" keeps every chapter free; otherwise the first `freeChapters` are free in paid mode. */
  pricing?: "platform" | "free";
  freeChapters?: number;
  publishedAt?: string;
  /** A fictional series made for this prototype (Sky Courier), rather than a real title. */
  demoProperty?: boolean;
}
export interface Chapter {
  id: string; seriesId: string; number: number; volumeNumber: number; title: string; pages: number;
  freeOverride: boolean | null;
}
export interface Volume { id: string; seriesId: string; number: number; price: number; edition: "india" | "import"; stock: number; }
export interface BoxSet { id: string; seriesId: string; title: string; fromVol: number; toVol: number; price: number; }
export interface Figure {
  id: string; slug: string; name: string; seriesId: string; character: string; manufacturer: string; licensor: string;
  price: number; scale: string; heightCm: number; material: string; availability: "in_stock" | "preorder" | "limited";
  editionSize: number | null; editionSold: number; releaseMonth: string | null; color: string; stock: number;
  /** Optional official product photo supplied by the licensor (URL). Falls back to a generated render. */
  image?: string;
}
export interface User {
  id: string; phone: string; name: string | null; wallet: number; isAdmin: boolean; createdAt: string;
  /** The Torii demo person (see /switch) this store account belongs to, if any. */
  studioId?: string;
}
export interface Unlock { userId: string; chapterId: string; createdAt: string; }
export interface Progress { userId: string; seriesId: string; chapter: number; language: Lang; updatedAt: string; }
export type ItemKind = "volume" | "box" | "figure";
export interface CartItem { id: string; userId: string; kind: ItemKind; refId: string; qty: number; }
export interface OrderItem { id: string; kind: ItemKind; refId: string; title: string; price: number; qty: number; editionNos: number[]; tagCodes: string[]; }
export interface Order {
  id: string; userId: string; total: number; status: string; name: string; address: string; pincode: string;
  city: string; state: string; eta: string; paymentRef: string; createdAt: string; items: OrderItem[];
}
export interface AuthTag {
  code: string; kind: "volume" | "figure"; refId: string; title: string; editionNo: number | null;
  ownerId: string | null; registeredAt: string | null; registeredCity: string | null;
}
export interface Ownership { userId: string; kind: "volume" | "figure"; refId: string; source: "order" | "verify"; createdAt: string; }
export interface Event { id: string; type: "read" | "unlock" | "print" | "figure"; seriesId: string; language: Lang; state: string; city: string; amount: number; createdAt: string; }

/* ---------- Partner Portal: Japanese publishers submit series to Torii ---------- */

/** A publishing company that has joined the Torii partner programme. */
export interface PartnerOrg {
  id: string;
  /** The publisher id its series are filed under (an existing catalogue publisher, or a new one). */
  publisherId: string;
  name: string; nameJa: string; country: string; website: string; contactName: string; email: string;
  /** Torii has checked the company's identity and rights (KYC). Titles go live only from verified partners. */
  verified: boolean;
  agreementVersion: string; agreementAcceptedAt: string; createdAt: string;
}
export interface PartnerUser {
  id: string; orgId: string; email: string; name: string; passwordHash: string; role: "owner" | "editor";
  createdAt: string; lastLoginAt: string | null;
  /** Torii workspace people (IP owners chosen at /switch) who open this portal account without a password. */
  studioIds?: string[];
}
export type ReviewStatus = "draft" | "submitted" | "changes_requested" | "approved" | "rejected";
export interface PartnerChapter {
  id: string; number: number; title: string;
  /** Uploaded page image ids, in reading order, per language. */
  pages: Partial<Record<Lang, string[]>>;
  /** null = held back (draft). A date = released at that time, once the series is approved. */
  releaseAt: string | null;
  createdAt: string;
}
export interface SubmissionEvent { at: string; who: "partner" | "torii"; by: string; action: string; note?: string }
export interface Submission {
  id: string; orgId: string; publisherId: string; slug: string;
  title: string; titleJa: string; author: string; artist: string;
  genres: string[]; demographic: string; seriesStatus: "ongoing" | "completed"; synopsis: string; startYear: number;
  ageRating: "all" | "13+" | "16+"; color: string;
  coverId: string | null; bannerId: string | null;
  rights: { languages: Lang[]; digital: boolean; print: boolean; merch: boolean; termYears: number; exclusive: boolean };
  pricing: "platform" | "free"; freeChapters: number;
  status: ReviewStatus;
  chapters: PartnerChapter[];
  history: SubmissionEvent[];
  createdAt: string; updatedAt: string; submittedAt: string | null; publishedAt: string | null;
}

/** Chapters, volumes and box sets are not stored: they are derived from each series (see lib/derive.ts). */
export interface DB {
  publishers: Publisher[]; series: Series[]; figures: Figure[];
  users: User[]; unlocks: Unlock[]; progress: Progress[]; cart: CartItem[]; orders: Order[]; tags: AuthTag[];
  ownership: Ownership[]; settings: { readingMode: "free" | "paid" }; events: Event[];
  /** Per-chapter free/paid overrides, keyed by chapter id. */
  chapterOverrides: Record<string, boolean>;
  /** Volume stock that has changed from its starting level, keyed by volume id. */
  stock: Record<string, number>;
  partners: PartnerOrg[]; partnerUsers: PartnerUser[]; submissions: Submission[];
}

export interface Catalog {
  meta: { source: "anilist" | "builtin"; fetchedAt: string | null; count: number };
  publishers: Publisher[]; series: Series[]; figures: Figure[]; events: Event[];
}
export interface State {
  users: User[]; unlocks: Unlock[]; progress: Progress[]; cart: CartItem[]; orders: Order[]; tags: AuthTag[]; ownership: Ownership[];
  settings: { readingMode: "free" | "paid" }; events: Event[];
  chapterOverrides: Record<string, boolean>; stock: Record<string, number>; editionSold: Record<string, number>;
  partners: PartnerOrg[]; partnerUsers: PartnerUser[]; submissions: Submission[];
}
