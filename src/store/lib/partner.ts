import { LANGS, type DB, type Event, type Lang, type PartnerChapter, type ReviewStatus, type Series, type Submission } from "./types";
import { FREE_CHAPTERS_IN_PAID_MODE, PARTNER_TERMS } from "./config";

/* Partner Portal rules shared by the server, the portal UI and the catalogue. */

export const mediaUrl = (id: string) => `/api/store/media/${id}`;

export const STATUS: Record<ReviewStatus, { label: string; ja: string; tone: "muted" | "warn" | "ok" | "bad" | "info" }> = {
  draft: { label: "Draft", ja: "下書き", tone: "muted" },
  submitted: { label: "In review", ja: "審査中", tone: "info" },
  changes_requested: { label: "Changes requested", ja: "修正依頼", tone: "warn" },
  approved: { label: "Live on Torii", ja: "公開中", tone: "ok" },
  rejected: { label: "Not accepted", ja: "不承認", tone: "bad" },
};

export function slugify(s: string) {
  return s.toLowerCase().normalize("NFKD").replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "").slice(0, 60) || "series";
}

export const hasPages = (c: PartnerChapter) => Object.values(c.pages).some((p) => p && p.length > 0);
export const pageTotal = (c: PartnerChapter) => Object.values(c.pages).reduce((a, p) => a + (p?.length ?? 0), 0);
export const sortedChapters = (sub: Submission) => [...sub.chapters].sort((a, b) => a.number - b.number);

/** Chapters readers can open: numbered from 1 with no gaps, with pages, and past their release time. */
export function releasedChapters(sub: Submission, at = Date.now()): PartnerChapter[] {
  const out: PartnerChapter[] = [];
  for (const [i, c] of sortedChapters(sub).entries()) {
    if (c.number !== i + 1 || !hasPages(c) || !c.releaseAt || Date.parse(c.releaseAt) > at) break;
    out.push(c);
  }
  return out;
}

export type ChapterState = "draft" | "ready" | "scheduled" | "live";
/** draft: held back · scheduled: release time in the future · ready: will be out as soon as the series is live
 *  (or the chapter before it is out) · live: readers can open it now. */
export function chapterState(sub: Submission, c: PartnerChapter, at = Date.now()): ChapterState {
  if (!c.releaseAt || !hasPages(c)) return "draft";
  if (Date.parse(c.releaseAt) > at) return "scheduled";
  return sub.status === "approved" && releasedChapters(sub, at).some((x) => x.id === c.id) ? "live" : "ready";
}

/** Turns an approved submission into a catalogue series. Null until it is approved and chapter 1 is out. */
export function toSeries(sub: Submission, at = Date.now()): Series | null {
  if (sub.status !== "approved") return null;
  const rel = releasedChapters(sub, at);
  if (!rel.length) return null;
  const langs = LANGS.map((l) => l.code).filter((l) => sub.rights.languages.includes(l) && rel.some((c) => c.pages[l]?.length));
  const upcoming = sortedChapters(sub).find((c) => c.number === rel.length + 1 && c.releaseAt && hasPages(c) && Date.parse(c.releaseAt) > at);
  const cpv = 8;
  const cover = sub.coverId ? mediaUrl(sub.coverId) : undefined;
  return {
    id: `ps_${sub.id}`, slug: sub.slug, title: sub.title, titleJa: sub.titleJa || undefined,
    author: sub.artist && sub.artist !== sub.author ? `${sub.author} · art by ${sub.artist}` : sub.author,
    publisherId: sub.publisherId, genres: sub.genres, status: sub.seriesStatus, synopsis: sub.synopsis, color: sub.color,
    languages: langs.length ? langs : ["en"], popularity: 1, totalChapters: rel.length,
    totalVolumes: sub.rights.print ? Math.floor(rel.length / cpv) : 0, startYear: sub.startYear, cpv, volPrice: 299,
    demographic: sub.demographic || undefined, image: cover, banner: sub.bannerId ? mediaUrl(sub.bannerId) : cover,
    source: "partner",
    partnerPages: rel.map((c) => Object.fromEntries(Object.entries(c.pages).filter(([, v]) => v?.length).map(([k, v]) => [k, v!.length]))),
    chapterTitles: rel.map((c) => c.title),
    nextRelease: upcoming ? { number: upcoming.number, at: upcoming.releaseAt! } : undefined,
    pricing: sub.pricing, freeChapters: sub.freeChapters ?? FREE_CHAPTERS_IN_PAID_MODE,
    publishedAt: sub.publishedAt ?? undefined,
  };
}

/** The language to serve for a partner chapter: the one asked for, else English, else any uploaded one. */
export function pickPages(c: PartnerChapter, lang: Lang): { lang: Lang; ids: string[] } | null {
  for (const l of [lang, "en", ...LANGS.map((x) => x.code)] as Lang[]) { const ids = c.pages[l]; if (ids?.length) return { lang: l, ids }; }
  return null;
}

/** Everything a submission still needs before Torii can review it. */
export function checklist(sub: Submission) {
  const first = sortedChapters(sub)[0];
  return [
    { key: "details", label: "Title, author and synopsis", done: !!sub.title.trim() && !!sub.author.trim() && sub.synopsis.trim().length >= 40 },
    { key: "genres", label: "At least one genre", done: sub.genres.length > 0 },
    { key: "cover", label: "Cover art uploaded", done: !!sub.coverId },
    { key: "rights", label: "Digital rights and at least one language for India", done: sub.rights.digital && sub.rights.languages.length > 0 },
    { key: "chapter", label: "Chapter 1 has pages and a release time", done: !!first && first.number === 1 && hasPages(first) && !!first.releaseAt },
  ];
}
export const readyToSubmit = (sub: Submission) => checklist(sub).every((c) => c.done);
export const editable = (sub: Submission) => sub.status === "draft" || sub.status === "changes_requested" || sub.status === "approved";

/** What the publisher earns from one event under the standard terms. */
export function shareOf(e: Event) {
  if (e.type === "unlock") return e.amount * PARTNER_TERMS.unlockShare;
  if (e.type === "print") return e.amount * PARTNER_TERMS.printShare;
  if (e.type === "figure") return e.amount * PARTNER_TERMS.figureShare;
  return 0;
}

/** Reading and sales events for one publisher's series. */
export function publisherEvents(db: DB, publisherId: string) {
  const ids = new Set(db.series.filter((s) => s.publisherId === publisherId).map((s) => s.id));
  return db.events.filter((e) => ids.has(e.seriesId));
}

export function fmtDate(iso: string | null | undefined, withTime = false) {
  if (!iso) return "";
  return new Date(iso).toLocaleString("en-IN", withTime
    ? { day: "numeric", month: "short", year: "numeric", hour: "numeric", minute: "2-digit", timeZone: "Asia/Kolkata" }
    : { day: "numeric", month: "short", year: "numeric", timeZone: "Asia/Kolkata" });
}
