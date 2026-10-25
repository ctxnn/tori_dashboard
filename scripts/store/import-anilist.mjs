#!/usr/bin/env node
/*
 * Pulls the most popular Japanese manga from AniList's public GraphQL API into scripts/store/anilist.json:
 * covers, banners, synopses, the YouTube trailer of each title's anime adaptation, and character
 * art for the figures shop.
 *
 *   npm run store:import      fetch now into scripts/store/anilist.json and rebuild
 *                             src/store/data/catalog.json (commit both to keep the 400 titles)
 *
 * Flags:  --soft         never fail the calling build; print a warning and leave existing data alone.
 *         --characters   only refresh the figure character art in an existing scripts/store/anilist.json.
 *         [number] how many titles to keep (default 400).
 * Env:    ANILIST_URL overrides the endpoint (used by tests).
 *
 * AniList API: https://docs.anilist.co (free, no key; rate-limited, so requests are spaced out).
 * Images and videos stay on AniList's CDN and YouTube and load in the viewer's browser.
 */
import fs from "node:fs";
import path from "node:path";

const args = process.argv.slice(2);
const SOFT = args.includes("--soft");
const TARGET = Number(args.find((a) => /^\d+$/.test(a))) || 400;
const PER_PAGE = 50;
const API = process.env.ANILIST_URL || "https://graphql.anilist.co";
const OUT = path.join(process.cwd(), "scripts", "store", "anilist.json");

const FIELDS = `
  id
  title { romaji english native }
  description(asHtml: false)
  chapters volumes status
  startDate { year }
  genres
  tags { name rank isAdult }
  coverImage { extraLarge large color }
  bannerImage
  averageScore popularity
  staff(perPage: 6, sort: [RELEVANCE]) { edges { role node { name { full } } } }`;
const RELATIONS = `
  relations { edges { relationType node { type format popularity trailer { id site } bannerImage } } }`;
const pageQuery = (withRelations) => `query ($page: Int, $perPage: Int) {
  Page(page: $page, perPage: $perPage) {
    pageInfo { hasNextPage }
    media(type: MANGA, format: MANGA, countryOfOrigin: "JP", isAdult: false, sort: POPULARITY_DESC) { ${FIELDS}${withRelations ? RELATIONS : ""} }
  }
}`;

/** Characters that have figures in the shop (see scripts/seed.ts). Their AniList art fills the figure cards. */
const CHARACTERS = [
  "Monkey D. Luffy", "Roronoa Zoro", "Shanks", "Satoru Gojo", "Yuuji Itadori", "Ryoumen Sukuna", "Tanjirou Kamado", "Nezuko Kamado",
  "Kyoujurou Rengoku", "Denji", "Makima", "Naruto Uzumaki", "Kakashi Hatake", "Anya Forger", "Yor Forger", "Izuku Midoriya",
  "Levi", "Eren Yeager", "Yoichi Isagi", "Manjirou Sano", "Frieren", "Conan Edogawa", "Edward Elric",
];

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/** `partial`: keep whatever data came back alongside per-field errors (e.g. one character not found). */
async function gql(query, variables = {}, attempt = 1, partial = false) {
  let r;
  try {
    r = await fetch(API, {
      method: "POST",
      headers: { "content-type": "application/json", accept: "application/json" },
      body: JSON.stringify({ query, variables }),
      signal: AbortSignal.timeout(30000),
    });
  } catch (e) {
    if (attempt <= 3) { await sleep(3000 * attempt); return gql(query, variables, attempt + 1, partial); }
    throw new Error(`Could not reach AniList (${e.cause?.code || e.message})`);
  }
  if (r.status === 429 && attempt <= 5) {
    const wait = Math.min(65, Number(r.headers.get("retry-after")) || 60) * 1000;
    console.log(`  rate limited, waiting ${Math.round(wait / 1000)}s…`);
    await sleep(wait);
    return gql(query, variables, attempt + 1, partial);
  }
  if (r.status >= 500 && attempt <= 3) { await sleep(4000 * attempt); return gql(query, variables, attempt + 1, partial); }
  const text = await r.text();
  let j;
  try { j = JSON.parse(text); } catch { throw new Error(`AniList returned ${r.status}: ${text.slice(0, 200)}`); }
  if (partial && j.data) return j.data;
  if (!r.ok || j.errors) throw new Error(`AniList error ${r.status}: ${JSON.stringify(j.errors ?? j).slice(0, 300)}`);
  return j.data;
}

/* One page of manga. If AniList refuses a query (for example as too complex), first ask for
   smaller pages, then drop the trailer lookup, so the import still finishes with the essentials. */
let perPage = PER_PAGE;
let withRelations = true;
async function page(offset) {
  for (;;) {
    try {
      const n = Math.floor(offset / perPage) + 1;
      return (await gql(pageQuery(withRelations), { page: n, perPage })).Page;
    } catch (e) {
      if (/reach AniList|rate/i.test(e.message)) throw e;
      if (perPage > 25) { perPage = 25; console.log(`  query refused, retrying with ${perPage} per page`); }
      else if (withRelations) { withRelations = false; perPage = PER_PAGE; console.log(`  trailer lookup refused (${e.message.slice(0, 120)}); continuing without trailers`); }
      else throw e;
      await sleep(1500);
    }
  }
}

async function characters() {
  // AniList blanks a whole query if any one name isn't found, so ask in small groups and fall
  // back to one name at a time for a group that fails.
  const lookup = async (names) => {
    const q = `query { ${names.map((c, i) => `c${i}: Character(search: ${JSON.stringify(c)}) { image { large } }`).join("\n")} }`;
    const d = await gql(q, {}, 1, true);
    return names.map((_, i) => d?.[`c${i}`]?.image?.large ?? null);
  };
  const out = {};
  const keep = (name, img) => { if (img && !/default\.(jpg|png)$/.test(img)) out[name] = img; };
  for (let i = 0; i < CHARACTERS.length; i += 6) {
    const group = CHARACTERS.slice(i, i + 6);
    try {
      const imgs = await lookup(group);
      if (imgs.every(Boolean)) { group.forEach((c, k) => keep(c, imgs[k])); }
      else for (const c of group) { await sleep(700); try { keep(c, (await lookup([c]))[0]); } catch {} }
    } catch (e) {
      console.log(`  some character art skipped (${e.message.slice(0, 120)})`);
    }
    await sleep(1200);
  }
  return out;
}

/** `--characters`: refresh only the figure character art in an existing import. */
async function refreshCharacters() {
  const data = JSON.parse(fs.readFileSync(OUT, "utf8"));
  process.stdout.write("Fetching character art for figures… ");
  data.characters = await characters();
  console.log(`${Object.keys(data.characters).length} of ${CHARACTERS.length} found`);
  fs.writeFileSync(OUT + ".tmp", JSON.stringify(data));
  fs.renameSync(OUT + ".tmp", OUT);
}

async function main() {
  if (args.includes("--characters")) return refreshCharacters();
  const items = [];
  const seen = new Set();
  // Fetch extra pages because adult/ecchi titles are filtered out later.
  let offset = 0;
  for (let calls = 1; items.length < TARGET + 80 && calls <= 30; calls++) {
    process.stdout.write(`Fetching titles ${offset + 1}–${offset + perPage}… `);
    const p = await page(offset);
    for (const m of p.media) if (!seen.has(m.id)) { seen.add(m.id); items.push(m); }
    offset = Math.floor(offset / perPage) * perPage + perPage;
    console.log(`${items.length} so far`);
    if (!p.pageInfo.hasNextPage || !p.media.length) break;
    await sleep(2200);
  }
  if (items.length < 20) throw new Error(`AniList only returned ${items.length} titles`);
  await sleep(1500);
  process.stdout.write("Fetching character art for figures… ");
  const chars = await characters();
  console.log(`${Object.keys(chars).length} found`);
  const trailers = items.filter((m) => (m.relations?.edges ?? []).some((e) => e.node?.trailer?.site === "youtube")).length;

  fs.mkdirSync(path.dirname(OUT), { recursive: true });
  const tmp = OUT + ".tmp";
  fs.writeFileSync(tmp, JSON.stringify({ source: "AniList (anilist.co)", fetchedAt: new Date().toISOString(), target: TARGET, characters: chars, items }));
  fs.renameSync(tmp, OUT);
  console.log(`\nSaved ${items.length} titles (${trailers} with anime trailers) to scripts/store/anilist.json.`);
}

main().catch((e) => {
  if (SOFT) {
    console.warn(`\n[torii] AniList import skipped: ${e.message}\n[torii] The app keeps its current catalogue. Run \`npm run store:import\` later to try again.\n`);
    process.exit(0);
  }
  console.error(e.message);
  process.exit(1);
});
