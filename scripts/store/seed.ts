/*
 * Fan store seed: writes src/store/data/catalog.json (series, figures, 1,800 analytics events) and
 * src/store/data/initial-state.json (demo accounts, tags, partner accounts). Both are committed and
 * bundled. Run `npm run store:seed` after changing this file; "Reset demo" restores initial-state.
 */
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import type { Catalog, State, Series, Figure, Event, Lang, AuthTag, User } from "../../src/store/lib/types";
import { fromAniList, PUBLISHERS, type AniItem } from "./anilist-map";
import { partnerSeed } from "./partner-seed";

// Load .env so tag signatures match the running app.
const envFile = path.join(process.cwd(), ".env");
if (fs.existsSync(envFile)) {
  for (const line of fs.readFileSync(envFile, "utf8").split("\n")) {
    const m = line.match(/^\s*([A-Z_]+)\s*=\s*"?([^"]*)"?\s*$/);
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2];
  }
}
const tagSecret = process.env.TAG_SECRET || "dev-tag-secret-change-me";
const ALPH = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
const sign = (serial: string) =>
  Array.from(crypto.createHmac("sha256", tagSecret).update(serial).digest()).slice(0, 8).map((b) => ALPH[b % ALPH.length]).join("");
const codeFor = (serial: string) => `T1-${serial}-${sign(serial)}`;

// Deterministic PRNG so every seed produces the same demo data.
let s0 = 20261020;
const rand = () => ((s0 = (s0 * 1664525 + 1013904223) % 4294967296) / 4294967296);
const pick = <T,>(arr: T[]) => arr[Math.floor(rand() * arr.length)];
function weighted<T>(items: [T, number][]): T {
  const total = items.reduce((s, [, w]) => s + w, 0);
  let r = rand() * total;
  for (const [it, w] of items) { if ((r -= w) <= 0) return it; }
  return items[items.length - 1][0];
}

const publishers = PUBLISHERS;

type SeedSeries = Omit<Series, "id">;
const S = (o: SeedSeries) => o;
// Chapter/volume counts are approximate as of late 2026.
const seriesSeed: SeedSeries[] = [
  S({ slug: "one-piece", title: "One Piece", author: "Eiichiro Oda", publisherId: "shueisha", genres: ["Adventure", "Action", "Comedy"], status: "ongoing", startYear: 1997,
    synopsis: "A rubber-limbed boy sets sail with a ragtag crew to find the legendary treasure and become King of the Pirates.", color: "#d9452b",
    languages: ["en", "hi", "ta", "te", "bn"], popularity: 100, totalChapters: 1163, totalVolumes: 112, cpv: 10.3, volPrice: 349 }),
  S({ slug: "jujutsu-kaisen", title: "Jujutsu Kaisen", author: "Gege Akutami", publisherId: "shueisha", genres: ["Action", "Supernatural", "Dark Fantasy"], status: "completed", startYear: 2018,
    synopsis: "A high-schooler swallows a cursed finger and joins a secret school of sorcerers fighting the curses born from human fear.", color: "#3b3f8f",
    languages: ["en", "hi", "ta", "bn"], popularity: 97, totalChapters: 271, totalVolumes: 30, cpv: 9.04, volPrice: 349 }),
  S({ slug: "demon-slayer", title: "Demon Slayer", author: "Koyoharu Gotouge", publisherId: "shueisha", genres: ["Action", "Historical", "Supernatural"], status: "completed", startYear: 2016,
    synopsis: "After demons slaughter his family, Tanjiro trains as a demon slayer to save his sister and avenge them.", color: "#2f7d6d",
    languages: ["en", "hi", "te"], popularity: 94, totalChapters: 205, totalVolumes: 23, cpv: 8.92, volPrice: 329 }),
  S({ slug: "chainsaw-man", title: "Chainsaw Man", author: "Tatsuki Fujimoto", publisherId: "shueisha", genres: ["Action", "Horror", "Dark Fantasy"], status: "ongoing", startYear: 2018,
    synopsis: "A broke devil hunter merges with his chainsaw-devil dog and is recruited into a government unit with very strange bosses.", color: "#c2762b",
    languages: ["en", "hi", "ta"], popularity: 90, totalChapters: 225, totalVolumes: 22, cpv: 9.9, volPrice: 349 }),
  S({ slug: "naruto", title: "Naruto", author: "Masashi Kishimoto", publisherId: "shueisha", genres: ["Action", "Adventure", "Martial Arts"], status: "completed", startYear: 1999,
    synopsis: "An outcast ninja with a fox spirit sealed inside him dreams of becoming the leader of his village.", color: "#e08a1e",
    languages: ["en", "hi", "ta", "te"], popularity: 92, totalChapters: 700, totalVolumes: 72, cpv: 9.73, volPrice: 299 }),
  S({ slug: "spy-x-family", title: "Spy × Family", author: "Tatsuya Endo", publisherId: "shueisha", genres: ["Comedy", "Action", "Slice of Life"], status: "ongoing", startYear: 2019,
    synopsis: "A spy, an assassin and a telepathic child pretend to be a normal family — none of them knowing the others' secrets.", color: "#c94f7c",
    languages: ["en", "hi"], popularity: 84, totalChapters: 125, totalVolumes: 16, cpv: 7.5, volPrice: 329 }),
  S({ slug: "my-hero-academia", title: "My Hero Academia", author: "Kohei Horikoshi", publisherId: "shueisha", genres: ["Action", "Superhero", "School"], status: "completed", startYear: 2014,
    synopsis: "In a world where most people have superpowers, a powerless boy inherits the greatest power of all.", color: "#2f8f4e",
    languages: ["en", "hi"], popularity: 86, totalChapters: 430, totalVolumes: 42, cpv: 10.24, volPrice: 329 }),
  S({ slug: "attack-on-titan", title: "Attack on Titan", author: "Hajime Isayama", publisherId: "kodansha", genres: ["Action", "Dark Fantasy", "Mystery"], status: "completed", startYear: 2009,
    synopsis: "Humanity lives behind giant walls to hide from man-eating Titans — until the day the wall is breached.", color: "#6b4f3a",
    languages: ["en", "hi", "bn"], popularity: 93, totalChapters: 139, totalVolumes: 34, cpv: 4.09, volPrice: 399 }),
  S({ slug: "blue-lock", title: "Blue Lock", author: "Muneyuki Kaneshiro & Yusuke Nomura", publisherId: "kodansha", genres: ["Sports", "Drama"], status: "ongoing", startYear: 2018,
    synopsis: "Three hundred young strikers are locked in a training facility to forge the world's most selfish, game-winning forward.", color: "#2563a8",
    languages: ["en", "hi"], popularity: 82, totalChapters: 320, totalVolumes: 34, cpv: 9.2, volPrice: 349 }),
  S({ slug: "tokyo-revengers", title: "Tokyo Revengers", author: "Ken Wakui", publisherId: "kodansha", genres: ["Action", "Delinquents", "Time Travel"], status: "completed", startYear: 2017,
    synopsis: "A down-on-his-luck man is thrown twelve years into the past and must climb a biker gang to save the girl he loved.", color: "#4b4b55",
    languages: ["en", "hi"], popularity: 78, totalChapters: 278, totalVolumes: 31, cpv: 8.97, volPrice: 329 }),
  S({ slug: "frieren", title: "Frieren: Beyond Journey's End", author: "Kanehito Yamada & Tsukasa Abe", publisherId: "shogakukan", genres: ["Fantasy", "Adventure", "Drama"], status: "ongoing", startYear: 2020,
    synopsis: "After the hero's party defeats the Demon King, their elf mage sets out to understand the humans she outlived.", color: "#5f8fb0",
    languages: ["en", "hi"], popularity: 85, totalChapters: 145, totalVolumes: 14, cpv: 10, volPrice: 399 }),
  S({ slug: "detective-conan", title: "Detective Conan", author: "Gosho Aoyama", publisherId: "shogakukan", genres: ["Mystery", "Comedy"], status: "ongoing", startYear: 1994,
    synopsis: "A teenage detective is shrunk into a child's body and keeps solving cases while hunting the syndicate that poisoned him.", color: "#1f4e8c",
    languages: ["en", "hi", "ta"], popularity: 80, totalChapters: 1150, totalVolumes: 107, cpv: 10.6, volPrice: 299 }),
  S({ slug: "fullmetal-alchemist", title: "Fullmetal Alchemist", author: "Hiromu Arakawa", publisherId: "square-enix", genres: ["Adventure", "Fantasy", "Action"], status: "completed", startYear: 2001,
    synopsis: "Two brothers pay a terrible price for a forbidden alchemy experiment and search for the Philosopher's Stone to restore their bodies.", color: "#a8342f",
    languages: ["en", "hi"], popularity: 83, totalChapters: 108, totalVolumes: 27, cpv: 4, volPrice: 399 }),
  // The fictional property the collaboration workspace is built around, published by the same
  // IP owner (Kumo Lantern Studio), so its collabs, kit and readers meet in one place.
  S({ slug: "sky-courier", title: "Sky Courier", author: "Aoi Kumohara", publisherId: "kumo-lantern", genres: ["Adventure", "Slice of Life", "Fantasy"], status: "ongoing", startYear: 2021,
    synopsis: "A paper-kite courier carries letters across a city of floating islands at night, and learns that every parcel holds somebody's whole story. A demonstration series for this prototype.", color: "#1E3A32",
    languages: ["en", "hi"], popularity: 76, totalChapters: 64, totalVolumes: 7, cpv: 9.14, volPrice: 329,
    image: "/store/sky-courier-cover.svg", banner: "/store/sky-courier-banner.svg", demoProperty: true }),
  S({ slug: "soul-eater", title: "Soul Eater", author: "Atsushi Ohkubo", publisherId: "square-enix", genres: ["Action", "Supernatural", "Comedy"], status: "completed", startYear: 2004,
    synopsis: "At a school for weapon-meisters, a girl and her scythe partner hunt corrupted souls to forge a weapon for Death himself.", color: "#4a3a6b",
    languages: ["en"], popularity: 68, totalChapters: 113, totalVolumes: 25, cpv: 4.52, volPrice: 349 }),
];

// The 14 hand-built series. If `npm run import` has fetched AniList data, the top 400 Japanese
// manga are used instead, with these 14 kept under their original slugs.
const builtin: Series[] = seriesSeed.map((s) => ({ id: "s_" + s.slug, ...s }));
let series: Series[] = builtin;
let meta: Catalog["meta"] = { source: "builtin", fetchedAt: null, count: builtin.length };
let characterArt: Record<string, string> = {};
// `--fixture` uses a synthetic 430-title sample for testing layouts without network access.
const aniFile = process.argv.includes("--fixture")
  ? path.join(process.cwd(), "scripts", "fixtures", "anilist-sample.json")
  : path.join(process.cwd(), "scripts", "store", "anilist.json");
if (fs.existsSync(aniFile) && !process.argv.includes("--builtin")) {
  const raw = JSON.parse(fs.readFileSync(aniFile, "utf8")) as { fetchedAt: string; target?: number; items: AniItem[]; characters?: Record<string, string> };
  characterArt = raw.characters ?? {};
  series = fromAniList(raw.items, builtin, raw.target ?? 400);
  meta = { source: process.argv.includes("--fixture") ? "builtin" : "anilist", fetchedAt: raw.fetchedAt, count: series.length };
}
const usedPublishers = new Set(series.map((s) => s.publisherId));

type FS = [string, string, string, string, string, number, string, number, string, Figure["availability"], number | null, string | null];
const figSeed: FS[] = [
  ["Monkey D. Luffy — Gear 5", "one-piece", "Monkey D. Luffy", "Bandai Spirits (S.H.Figuarts)", "Shueisha · Toei Animation", 5499, "Non-scale", 15, "PVC, ABS", "in_stock", null, null],
  ["Roronoa Zoro — Grandista", "one-piece", "Roronoa Zoro", "Banpresto", "Shueisha · Toei Animation", 2499, "Non-scale", 28, "PVC", "in_stock", null, null],
  ["Luffy — World Collectable Mini", "one-piece", "Monkey D. Luffy", "Banpresto (WCF)", "Shueisha · Toei Animation", 699, "Mini", 7, "PVC", "in_stock", null, null],
  ["Shanks — 1/7 Scale Limited", "one-piece", "Shanks", "MegaHouse", "Shueisha · Toei Animation", 19999, "1/7", 30, "PVC, ABS", "limited", 500, null],
  ["Satoru Gojo — Pop Up Parade", "jujutsu-kaisen", "Satoru Gojo", "Good Smile Company", "Shueisha · MAPPA", 3199, "Non-scale", 17, "PVC", "in_stock", null, null],
  ["Gojo — World Collectable Mini", "jujutsu-kaisen", "Satoru Gojo", "Banpresto (WCF)", "Shueisha · MAPPA", 799, "Mini", 7, "PVC", "in_stock", null, null],
  ["Yuji Itadori — Nendoroid", "jujutsu-kaisen", "Yuji Itadori", "Good Smile Company", "Shueisha · MAPPA", 4299, "Non-scale", 10, "PVC, ABS", "in_stock", null, null],
  ["Ryomen Sukuna — 1/7 Scale Limited", "jujutsu-kaisen", "Ryomen Sukuna", "Kotobukiya", "Shueisha · MAPPA", 18999, "1/7", 27, "PVC, ABS", "limited", 500, null],
  ["Tanjiro Kamado — Vibration Stars", "demon-slayer", "Tanjiro Kamado", "Banpresto", "Shueisha · Aniplex · ufotable", 1899, "Non-scale", 16, "PVC", "in_stock", null, null],
  ["Tanjiro — Mini Figure", "demon-slayer", "Tanjiro Kamado", "Banpresto", "Shueisha · Aniplex · ufotable", 649, "Mini", 6, "PVC", "in_stock", null, null],
  ["Nezuko Kamado — Nendoroid", "demon-slayer", "Nezuko Kamado", "Good Smile Company", "Shueisha · Aniplex · ufotable", 3999, "Non-scale", 10, "PVC, ABS", "in_stock", null, null],
  ["Kyojuro Rengoku — 1/8 Scale", "demon-slayer", "Kyojuro Rengoku", "Aniplex", "Shueisha · Aniplex · ufotable", 14999, "1/8", 25, "PVC, ABS", "preorder", null, "Feb 2027"],
  ["Denji & Pochita — Pop Up Parade", "chainsaw-man", "Denji", "Good Smile Company", "Shueisha · MAPPA", 3499, "Non-scale", 17, "PVC", "in_stock", null, null],
  ["Makima — 1/7 Scale Limited", "chainsaw-man", "Makima", "eStream", "Shueisha · MAPPA", 16499, "1/7", 24, "PVC, ABS", "limited", 300, null],
  ["Naruto Uzumaki — Sage Mode", "naruto", "Naruto Uzumaki", "Bandai Spirits (S.H.Figuarts)", "Shueisha · Pierrot", 5299, "Non-scale", 15, "PVC, ABS", "in_stock", null, null],
  ["Kakashi Hatake — Vibration Stars", "naruto", "Kakashi Hatake", "Banpresto", "Shueisha · Pierrot", 2199, "Non-scale", 18, "PVC", "in_stock", null, null],
  ["Anya Forger — Nendoroid", "spy-x-family", "Anya Forger", "Good Smile Company", "Shueisha · WIT × CloverWorks", 3899, "Non-scale", 10, "PVC, ABS", "in_stock", null, null],
  ["Yor Forger — 1/7 Scale", "spy-x-family", "Yor Forger", "Kotobukiya", "Shueisha · WIT × CloverWorks", 13499, "1/7", 23, "PVC, ABS", "preorder", null, "Mar 2027"],
  ["Izuku Midoriya — Age of Heroes", "my-hero-academia", "Izuku Midoriya", "Banpresto", "Shueisha · Bones", 1999, "Non-scale", 17, "PVC", "in_stock", null, null],
  ["Levi Ackerman — figma", "attack-on-titan", "Levi Ackerman", "Max Factory (figma)", "Kodansha · Wit · MAPPA", 6999, "Non-scale", 14, "ABS, PVC", "in_stock", null, null],
  ["Eren — Attack Titan Pop Up Parade L", "attack-on-titan", "Eren Yeager", "Good Smile Company", "Kodansha · Wit · MAPPA", 6499, "Non-scale", 26, "PVC", "in_stock", null, null],
  ["Yoichi Isagi — Prize Figure", "blue-lock", "Yoichi Isagi", "Banpresto", "Kodansha · 8bit", 1799, "Non-scale", 18, "PVC", "in_stock", null, null],
  ["Manjiro Sano (Mikey) — Prize Figure", "tokyo-revengers", "Manjiro Sano", "Banpresto", "Kodansha · Liden Films", 1699, "Non-scale", 17, "PVC", "in_stock", null, null],
  ["Frieren — Pop Up Parade", "frieren", "Frieren", "Good Smile Company", "Shogakukan · Madhouse", 3299, "Non-scale", 16, "PVC", "in_stock", null, null],
  ["Conan Edogawa — Nendoroid", "detective-conan", "Conan Edogawa", "Good Smile Company", "Shogakukan · TMS", 3699, "Non-scale", 10, "PVC, ABS", "in_stock", null, null],
  ["Edward Elric — S.H.Figuarts", "fullmetal-alchemist", "Edward Elric", "Bandai Spirits (S.H.Figuarts)", "Square Enix · Bones", 5999, "Non-scale", 13, "PVC, ABS", "in_stock", null, null],
];
// AniList spells a few names differently from the shop listings.
const CHARACTER_ALIAS: Record<string, string> = {
  "Kyojuro Rengoku": "Kyoujurou Rengoku", "Levi Ackerman": "Levi", "Manjiro Sano": "Manjirou Sano",
  "Yuji Itadori": "Yuuji Itadori", "Ryomen Sukuna": "Ryoumen Sukuna", "Tanjiro Kamado": "Tanjirou Kamado",
};
const palette = ["#d9452b", "#3b3f8f", "#2f7d6d", "#c2762b", "#e08a1e", "#c94f7c", "#2f8f4e", "#6b4f3a", "#2563a8", "#5f8fb0", "#a8342f", "#4a3a6b"];
const figures: Figure[] = figSeed.map((f, i) => {
  const [name, slug, character, manufacturer, licensor, price, scale, heightCm, material, availability, editionSize, releaseMonth] = f;
  const fslug = name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
  return { id: "f_" + fslug, slug: fslug, name, seriesId: "s_" + slug, character, manufacturer, licensor, price, scale, heightCm, material,
    availability, editionSize, editionSold: editionSize ? Math.floor(editionSize * (0.3 + rand() * 0.4)) : 0, releaseMonth,
    color: series.find((s) => s.id === "s_" + slug)!.color || palette[i % palette.length], stock: availability === "preorder" ? 999 : 5 + Math.floor(rand() * 60),
    image: characterArt[CHARACTER_ALIAS[character] ?? character] };
});

const t = (daysAgo: number) => new Date(Date.now() - daysAgo * 864e5).toISOString();
const users: User[] = [
  // studioId links each account to a demo person at /switch: Meera (Torii operations) is the store
  // admin, Aarav is the fan, Riya the creator also reads.
  { id: "u_admin", phone: "9999999999", name: "Meera Iyer", wallet: 0, isAdmin: true, createdAt: t(120), studioId: "usr_meera" },
  { id: "u_aarav", phone: "9876543210", name: "Aarav Gupta", wallet: 50, isAdmin: false, createdAt: t(40), studioId: "usr_aarav" },
  { id: "u_riya", phone: "9123456780", name: "Riya Menon", wallet: 0, isAdmin: false, createdAt: t(200), studioId: "usr_riya" },
];

const gojo = figures.find((f) => f.slug.startsWith("satoru-gojo-pop"))!;
const luffy = figures.find((f) => f.slug.startsWith("monkey-d-luffy-gear"))!;
const jjk1 = { id: "v_jujutsu-kaisen_1" };
const tags: AuthTag[] = [
  { code: codeFor("GENUINE1"), kind: "figure", refId: gojo.id, title: gojo.name, editionNo: null, ownerId: null, registeredAt: null, registeredCity: null },
  { code: codeFor("GENUINE2"), kind: "volume", refId: jjk1.id, title: "Jujutsu Kaisen Vol. 1", editionNo: null, ownerId: null, registeredAt: null, registeredCity: null },
  { code: codeFor("CLAIMED1"), kind: "figure", refId: luffy.id, title: luffy.name, editionNo: null, ownerId: "u_riya", registeredAt: new Date("2026-03-12T11:20:00+05:30").toISOString(), registeredCity: "Lucknow" },
];
const FAKE = "T1-FAKE7777-ABCDEFGH";

// Analytics: reads, paid unlocks and purchases across Indian states over the last 90 days.
const states: [string, string[], number, Lang][] = [
  ["Maharashtra", ["Mumbai", "Pune", "Nagpur"], 16, "hi"], ["Tamil Nadu", ["Chennai", "Coimbatore", "Madurai"], 13, "ta"],
  ["Karnataka", ["Bengaluru", "Mysuru"], 11, "en"], ["Delhi", ["New Delhi"], 10, "hi"], ["West Bengal", ["Kolkata", "Siliguri"], 9, "bn"],
  ["Telangana", ["Hyderabad", "Warangal"], 8, "te"], ["Uttar Pradesh", ["Lucknow", "Noida", "Kanpur"], 8, "hi"], ["Kerala", ["Kochi", "Thiruvananthapuram"], 6, "en"],
  ["Gujarat", ["Ahmedabad", "Surat"], 5, "hi"], ["Punjab", ["Ludhiana", "Amritsar", "Bathinda"], 4, "hi"], ["Assam", ["Guwahati"], 4, "bn"],
  ["Rajasthan", ["Jaipur", "Jodhpur"], 3, "hi"], ["Andhra Pradesh", ["Visakhapatnam", "Vijayawada"], 3, "te"],
];
const events: Event[] = [];
for (let i = 0; i < 1800; i++) {
  const [state, cities, , local] = weighted(states.map((s) => [s, s[2]] as [typeof s, number]));
  const s = weighted(series.map((x) => [x, x.popularity ** 2] as [Series, number]));
  let lang: Lang = local !== "en" && rand() < 0.7 ? local : weighted<Lang>([["en", 6], ["hi", 4]]);
  if (!s.languages.includes(lang)) lang = "en";
  const type = weighted<Event["type"]>([["read", 70], ["unlock", 15], ["print", 10], ["figure", 5]]);
  const fig = figures.filter((f) => f.seriesId === s.id);
  const amount = type === "unlock" ? 9 : type === "print" ? weighted([[349, 6], [699, 2], [2999, 1]]) : type === "figure" ? (fig.length ? pick(fig).price : 1999) : 0;
  events.push({ id: "e" + i, type, seriesId: s.id, language: lang, state, city: pick(cities), amount, createdAt: t(rand() * 90) });
}

const catalog: Catalog = { meta, publishers: publishers.filter((p) => usedPublishers.has(p.id)), series, figures, events };
const state: State = {
  users, unlocks: [], progress: [], cart: [], orders: [], tags,
  ownership: [{ userId: "u_riya", kind: "figure", refId: luffy.id, source: "verify", createdAt: t(220) }],
  settings: { readingMode: "free" }, events: [], chapterOverrides: {}, stock: {}, editionSold: {},
  ...partnerSeed(t),
};
const dir = path.join(process.cwd(), "src", "store", "data");
fs.mkdirSync(dir, { recursive: true });
fs.writeFileSync(path.join(dir, "catalog.json"), JSON.stringify(catalog));
fs.writeFileSync(path.join(dir, "initial-state.json"), JSON.stringify(state, null, 1));
console.log(`Seeded ${series.length} series (${meta.source}), ${series.reduce((a, x) => a + x.totalChapters, 0).toLocaleString()} chapters, ${series.reduce((a, x) => a + x.totalVolumes, 0).toLocaleString()} volumes, ${figures.length} figures, ${events.length} analytics events.`);
console.log("Demo verification codes:");
console.log("  Genuine (figure):          ", tags[0].code);
console.log("  Genuine (volume):          ", tags[1].code);
console.log("  Already registered (copy): ", tags[2].code);
console.log("  Fake:                      ", FAKE);
