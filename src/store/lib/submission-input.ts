import "server-only";
import { LANGS, type DB, type Lang, type Submission } from "./types";
import { DEMOGRAPHICS, PARTNER_GENRES } from "./config";
import { slugify } from "./partner";
import { multiline, text } from "./partner-api";
import { blobMetas } from "./blobs";

/** A slug no catalogue series or other submission uses. */
export function uniqueSlug(db: DB, title: string, exceptId?: string) {
  const base = slugify(title);
  const taken = (s: string) => db.series.some((x) => x.slug === s && x.id !== `ps_${exceptId}`) || db.submissions.some((x) => x.slug === s && x.id !== exceptId);
  let slug = base, n = 2;
  while (taken(slug)) slug = `${base}-${n++}`;
  return slug;
}

const PALETTE = ["#d9452b", "#3b3f8f", "#2f7d6d", "#c2762b", "#c94f7c", "#2f8f4e", "#2563a8", "#a8342f", "#4a3a6b"];
export const randomColor = () => PALETTE[Math.floor(Math.random() * PALETTE.length)];

/**
 * Checks and copies the fields a publisher may edit. Unknown fields are ignored; bad values come back
 * as a message for the form.
 */
export async function applyEdits(sub: Submission, b: Record<string, unknown>, orgId: string): Promise<string | null> {
  const has = (k: string) => Object.prototype.hasOwnProperty.call(b, k);
  if (has("title")) { const t = text(b.title, 120); if (!t) return "The series needs a title"; sub.title = t; }
  if (has("titleJa")) sub.titleJa = text(b.titleJa, 120);
  if (has("author")) sub.author = text(b.author, 80);
  if (has("artist")) sub.artist = text(b.artist, 80);
  if (has("synopsis")) sub.synopsis = multiline(b.synopsis, 1200);
  if (has("genres")) {
    if (!Array.isArray(b.genres)) return "Genres must be a list";
    sub.genres = Array.from(new Set(b.genres.map(String))).filter((g) => (PARTNER_GENRES as readonly string[]).includes(g)).slice(0, 5);
  }
  if (has("demographic")) { const d = String(b.demographic ?? ""); if (d && !(DEMOGRAPHICS as readonly string[]).includes(d)) return "Unknown demographic"; sub.demographic = d; }
  if (has("seriesStatus")) { if (b.seriesStatus !== "ongoing" && b.seriesStatus !== "completed") return "Status must be ongoing or completed"; sub.seriesStatus = b.seriesStatus; }
  if (has("startYear")) { const y = Number(b.startYear); if (!Number.isInteger(y) || y < 1950 || y > new Date().getFullYear() + 1) return "Enter the year serialisation started"; sub.startYear = y; }
  if (has("ageRating")) { if (!["all", "13+", "16+"].includes(String(b.ageRating))) return "Torii carries all-ages, 13+ and 16+ titles"; sub.ageRating = b.ageRating as Submission["ageRating"]; }
  if (has("color")) { const c = String(b.color); if (!/^#[0-9a-fA-F]{6}$/.test(c)) return "Pick a colour"; sub.color = c.toLowerCase(); }
  if (has("pricing")) { if (b.pricing !== "platform" && b.pricing !== "free") return "Unknown pricing"; sub.pricing = b.pricing; }
  if (has("freeChapters")) { const n = Number(b.freeChapters); if (!Number.isInteger(n) || n < 0 || n > 20) return "Free chapters must be between 0 and 20"; sub.freeChapters = n; }
  if (has("rights")) {
    const r = (b.rights ?? {}) as Record<string, unknown>;
    const langs = Array.isArray(r.languages) ? LANGS.map((l) => l.code).filter((c) => (r.languages as unknown[]).includes(c)) : sub.rights.languages;
    const removed = sub.rights.languages.filter((l) => !langs.includes(l) && sub.chapters.some((c) => c.pages[l]?.length));
    if (removed.length) return `Pages are already uploaded in ${removed.map((l) => LANGS.find((x) => x.code === l)!.name).join(", ")}. Remove them before dropping the language.`;
    const term = r.termYears === undefined ? sub.rights.termYears : Number(r.termYears);
    if (!Number.isInteger(term) || term < 1 || term > 10) return "Licence term must be 1 to 10 years";
    sub.rights = {
      languages: langs as Lang[], termYears: term,
      digital: r.digital === undefined ? sub.rights.digital : !!r.digital, print: r.print === undefined ? sub.rights.print : !!r.print,
      merch: r.merch === undefined ? sub.rights.merch : !!r.merch, exclusive: r.exclusive === undefined ? sub.rights.exclusive : !!r.exclusive,
    };
  }
  for (const [k, kind] of [["coverId", "cover"], ["bannerId", "banner"]] as const) {
    if (!has(k)) continue;
    const v = b[k];
    if (v === null) { sub[k] = null; continue; }
    const [m] = await blobMetas([String(v)]);
    if (!m || m.orgId !== orgId || m.kind !== kind) return `That ${kind} image wasn't found. Upload it again.`;
    sub[k] = String(v);
  }
  return null;
}
