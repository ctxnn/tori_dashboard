"use client";
/*
 * Fills in artwork the catalogue doesn't have yet, straight from AniList in the viewer's browser:
 * manga covers, banners and anime trailers by title, and character art for figures.
 * Lookups are batched (one GraphQL request for up to 6 titles), spaced out to respect AniList's
 * rate limit, and remembered in localStorage for a week so each title is only fetched once.
 * Once `npm run store:import` has run, every card already has its
 * art and this never fires.
 */
export type Art = { cover?: string; banner?: string; trailer?: string; image?: string };
type Kind = "media" | "char";

const ENDPOINT = process.env.NEXT_PUBLIC_ANILIST_URL || "https://graphql.anilist.co";
const STORE = "torii:art:v1";
const WEEK = 7 * 864e5;
const BATCH = 6;

const memory = new Map<string, Promise<Art | null>>();
let saved: Record<string, { a: Art | null; t: number }> | null = null;
function store() {
  if (saved) return saved;
  try { saved = JSON.parse(localStorage.getItem(STORE) || "{}"); } catch { saved = {}; }
  return saved!;
}
let saveTimer: ReturnType<typeof setTimeout> | undefined;
function remember(key: string, a: Art | null) {
  const s = store(); s[key] = { a, t: Date.now() };
  clearTimeout(saveTimer);
  saveTimer = setTimeout(() => { try { localStorage.setItem(STORE, JSON.stringify(s)); } catch {} }, 400);
}

type Job = { kind: Kind; q: string; key: string; done: (a: Art | null) => void };
const queue: Job[] = [];
let running = false;
let pausedUntil = 0;

const MEDIA = `coverImage { extraLarge large } bannerImage
  relations { edges { relationType node { type format popularity trailer { id site } bannerImage } } }`;
type Edge = { relationType: string; node: { type: string; format: string | null; popularity: number | null; trailer: { id: string; site: string } | null; bannerImage: string | null } | null };
type MediaHit = { coverImage: { extraLarge: string | null; large: string | null } | null; bannerImage: string | null; relations: { edges: Edge[] } | null } | null;

function toArt(m: MediaHit): Art | null {
  if (!m) return null;
  const anime = (m.relations?.edges ?? []).filter((e) => e.node?.type === "ANIME").map((e) => e.node!)
    .sort((a, b) => Number(b.format === "TV") - Number(a.format === "TV") || (b.popularity ?? 0) - (a.popularity ?? 0));
  const t = anime.find((a) => a.trailer?.site === "youtube" && /^[\w-]{6,20}$/.test(a.trailer.id))?.trailer?.id;
  return { cover: m.coverImage?.extraLarge || m.coverImage?.large || undefined, banner: m.bannerImage || anime.find((a) => a.bannerImage)?.bannerImage || undefined, trailer: t };
}

async function pump() {
  if (running) return;
  running = true;
  try {
    while (queue.length) {
      const wait = pausedUntil - Date.now();
      if (wait > 0) await new Promise((r) => setTimeout(r, wait));
      const batch = queue.splice(0, BATCH);
      const query = `query { ${batch.map((j, i) => j.kind === "media"
        ? `a${i}: Media(search: ${JSON.stringify(j.q)}, type: MANGA, isAdult: false, sort: SEARCH_MATCH) { ${MEDIA} }`
        : `a${i}: Character(search: ${JSON.stringify(j.q)}) { image { large } }`).join("\n")} }`;
      try {
        const r = await fetch(ENDPOINT, { method: "POST", headers: { "content-type": "application/json", accept: "application/json" }, body: JSON.stringify({ query }) });
        if (r.status === 429) {
          pausedUntil = Date.now() + (Number(r.headers.get("retry-after")) || 30) * 1000;
          queue.unshift(...batch);
          continue;
        }
        // A title AniList can't find comes back as null with a 404 status; the others still arrive.
        const j = await r.json().catch(() => null) as { data?: Record<string, unknown> } | null;
        batch.forEach((job, i) => {
          const hit = j?.data?.[`a${i}`];
          const art = job.kind === "media" ? toArt(hit as MediaHit)
            : (hit as { image?: { large?: string } } | null)?.image?.large && !/default\.jpg$/.test((hit as { image: { large: string } }).image.large)
              ? { image: (hit as { image: { large: string } }).image.large } : null;
          if (j?.data) remember(job.key, art);
          job.done(art);
        });
      } catch {
        // Offline or blocked: leave the generated artwork in place, try again on a later visit.
        batch.forEach((job) => job.done(null));
      }
      await new Promise((r) => setTimeout(r, 2100));
    }
  } finally { running = false; }
}

function lookup(kind: Kind, q: string): Promise<Art | null> {
  const key = `${kind}:${q.toLowerCase()}`;
  const hit = memory.get(key);
  if (hit) return hit;
  const s = store()[key];
  if (s && Date.now() - s.t < WEEK) { const p = Promise.resolve(s.a); memory.set(key, p); return p; }
  const p = new Promise<Art | null>((done) => { queue.push({ kind, q, key, done }); setTimeout(pump, 60); });
  memory.set(key, p);
  return p;
}

export const lookupManga = (title: string) => lookup("media", title);
export const lookupCharacter = (name: string) => lookup("char", name);
