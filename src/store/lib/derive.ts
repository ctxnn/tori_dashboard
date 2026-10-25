import { LANGS, type BoxSet, type Chapter, type DB, type Series, type Volume } from "./types";

/* Chapters, volumes and box sets are derived from each series instead of stored, so a
   400-series catalogue stays small. Ids keep the same shape everywhere:
   c_<slug>_<n>, v_<slug>_<n>, b_<slug>_all, b_<slug>_1. */

const hash = (s: string) => { let h = 2166136261; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; };
const bySlug = (db: DB, slug: string) => db.series.find((s) => s.slug === slug);

export function volumeOfChapter(s: Series, n: number) {
  const v = Math.ceil(n / s.cpv);
  return v <= s.totalVolumes ? v : 0;
}

export function chapterAt(db: DB, s: Series, n: number): Chapter | undefined {
  if (!Number.isInteger(n) || n < 1 || n > s.totalChapters) return undefined;
  const id = `c_${s.slug}_${n}`;
  // Partner series carry their real page counts and chapter titles; built-in ones use placeholders.
  const pp = s.partnerPages?.[n - 1];
  const pages = pp ? Math.max(1, ...Object.values(pp).map((x) => x ?? 0)) : 6 + (hash(id) % 4);
  const title = s.chapterTitles?.[n - 1] || `Chapter ${n}`;
  return { id, seriesId: s.id, number: n, volumeNumber: volumeOfChapter(s, n), title, pages, freeOverride: db.chapterOverrides[id] ?? null };
}
export function chaptersOf(db: DB, s: Series): Chapter[] {
  return Array.from({ length: s.totalChapters }, (_, i) => chapterAt(db, s, i + 1)!);
}
export function chapterById(db: DB, id: string) {
  const m = id.match(/^c_(.+)_(\d+)$/); if (!m) return undefined;
  const s = bySlug(db, m[1]); return s ? chapterAt(db, s, Number(m[2])) : undefined;
}

export function volumeAt(db: DB, s: Series, n: number): Volume | undefined {
  if (!Number.isInteger(n) || n < 1 || n > s.totalVolumes) return undefined;
  const id = `v_${s.slug}_${n}`;
  const isImport = s.status === "ongoing" && n > s.totalVolumes - 2;
  const h = hash(id);
  const base = h % 100 < 6 ? 0 : 20 + (h % 180);
  return { id, seriesId: s.id, number: n, edition: isImport ? "import" : "india", price: isImport ? 749 : s.volPrice, stock: db.stock[id] ?? base };
}
export function volumesOf(db: DB, s: Series): Volume[] {
  return Array.from({ length: s.totalVolumes }, (_, i) => volumeAt(db, s, i + 1)!);
}
export function volumeById(db: DB, id: string) {
  const m = id.match(/^v_(.+)_(\d+)$/); if (!m) return undefined;
  const s = bySlug(db, m[1]); return s ? volumeAt(db, s, Number(m[2])) : undefined;
}

export function boxSetsOf(s: Series): BoxSet[] {
  const out: BoxSet[] = [];
  if (s.status === "completed" && s.totalVolumes >= 3) {
    const sum = s.volPrice * s.totalVolumes;
    out.push({ id: `b_${s.slug}_all`, seriesId: s.id, title: `${s.title.replace(/:.*/, "")} Complete Box Set`, fromVol: 1, toVol: s.totalVolumes, price: Math.round((sum * 0.8) / 10) * 10 - 1 });
  }
  if (s.totalVolumes >= 12) {
    out.push({ id: `b_${s.slug}_1`, seriesId: s.id, title: `${s.title.replace(/:.*/, "")} Starter Box (Vol. 1–10)`, fromVol: 1, toVol: 10, price: Math.round((s.volPrice * 10 * 0.85) / 10) * 10 - 1 });
  }
  return out;
}
export function boxById(db: DB, id: string) {
  const m = id.match(/^b_(.+)_(all|1)$/); if (!m) return undefined;
  const s = bySlug(db, m[1]); return s ? boxSetsOf(s).find((b) => b.id === id) : undefined;
}

/** Pages in a partner chapter for a language, falling back to English or any uploaded language. */
export function partnerPageCount(s: Series, n: number, lang: string): { lang: string; count: number } | null {
  const pp = s.partnerPages?.[n - 1];
  if (!pp) return null;
  const rec = pp as Record<string, number | undefined>;
  for (const l of [lang, "en", ...LANGS.map((x) => x.code)]) if (rec[l]) return { lang: l, count: rec[l]! };
  return null;
}
