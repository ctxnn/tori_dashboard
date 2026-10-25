/* Turns raw AniList records (data/anilist.json, written by `npm run import`) into Torii series. */
import type { Lang, Series } from "../../src/store/lib/types";

export type AniItem = {
  id: number; title: { romaji: string | null; english: string | null; native: string | null };
  description: string | null; chapters: number | null; volumes: number | null; status: string | null;
  startDate: { year: number | null } | null; genres: string[]; tags: { name: string; rank: number; isAdult?: boolean }[];
  coverImage: { extraLarge: string | null; large: string | null; color: string | null } | null; bannerImage: string | null;
  averageScore: number | null; popularity: number | null;
  staff: { edges: { role: string; node: { name: { full: string } } }[] } | null;
  relations?: { edges: { relationType: string; node: { type: string; format: string | null; popularity: number | null; trailer: { id: string; site: string } | null; bannerImage: string | null } | null }[] } | null;
};

/** The anime adaptation with the most viewers, which supplies a YouTube trailer and, if the manga has none, a banner. */
function adaptation(it: AniItem) {
  const anime = (it.relations?.edges ?? [])
    .filter((e) => e.node?.type === "ANIME" && (e.relationType === "ADAPTATION" || e.relationType === "ALTERNATIVE" || e.relationType === "SPIN_OFF"))
    .map((e) => e.node!)
    .sort((a, b) => Number(b.format === "TV") - Number(a.format === "TV") || (b.popularity ?? 0) - (a.popularity ?? 0));
  const withTrailer = anime.find((a) => a.trailer?.site === "youtube" && /^[\w-]{6,20}$/.test(a.trailer.id));
  return { trailer: withTrailer?.trailer?.id, banner: anime.find((a) => a.bannerImage)?.bannerImage ?? undefined };
}

export const PUBLISHERS = [
  { id: "shueisha", name: "Shueisha" }, { id: "kodansha", name: "Kodansha" }, { id: "shogakukan", name: "Shogakukan" },
  { id: "square-enix", name: "Square Enix" }, { id: "kadokawa", name: "Kadokawa" }, { id: "hakusensha", name: "Hakusensha" },
  { id: "akita-shoten", name: "Akita Shoten" }, { id: "kumo-lantern", name: "Kumo Lantern Studio" }, { id: "other", name: "Other publishers" },
];

const norm = (s: string) => s.toLowerCase().normalize("NFKD").replace(/[^a-z0-9]+/g, " ").trim();

/** Japanese publisher for well-known series, matched on English or romaji title. Everything else is "other". */
const PUBLISHER_BY_TITLE: [string, string[]][] = [
  ["shueisha", ["one piece", "naruto", "bleach", "dragon ball", "jujutsu kaisen", "kimetsu no yaiba", "demon slayer", "chainsaw man", "spy x family", "boku no hero academia", "my hero academia",
    "hunter x hunter", "death note", "bakuman", "one punch man", "tokyo ghoul", "yakusoku no neverland", "promised neverland", "haikyuu", "kuroko no basket", "ansatsu kyoushitsu", "assassination classroom",
    "black clover", "dr stone", "sakamoto days", "kaiju no 8", "kaijuu 8 gou", "dandadan", "oshi no ko", "kaguya sama", "ao no hako", "blue box", "undead unluck", "mashle", "jojo no kimyou na bouken", "jojo s bizarre adventure",
    "gintama", "yuu yuu hakusho", "yu yu hakusho", "slam dunk", "hokuto no ken", "rurouni kenshin", "hikaru no go", "yu gi oh", "toriko", "shokugeki no souma", "food wars", "world trigger", "golden kamuy",
    "jigokuraku", "hell s paradise", "to love ru", "nisekoi", "ao no exorcist", "blue exorcist", "fire punch", "look back", "boruto", "d gray man", "claymore", "eyeshield 21", "saint seiya", "kochikame", "akane banashi", "witch watch"]],
  ["kodansha", ["shingeki no kyojin", "attack on titan", "blue lock", "tokyo revengers", "fairy tail", "edens zero", "nanatsu no taizai", "seven deadly sins", "great teacher onizuka", "akira", "hajime no ippo", "vinland saga",
    "fire force", "enen no shouboutai", "kiseijuu", "parasyte", "shigatsu wa kimi no uso", "your lie in april", "koe no katachi", "a silent voice", "domestic na kanojo", "kanojo okarishimasu", "rent a girlfriend",
    "go toubun no hanayome", "quintessential quintuplets", "ajin", "hataraku saibou", "cells at work", "tensei shitara slime", "shangri la frontier", "tongari boushi no atelier", "witch hat atelier", "noragami",
    "blue period", "sailor moon", "cardcaptor sakura", "chobits", "ghost in the shell", "kakkou no iinazuke", "wind breaker", "tokyo mew mew", "inuyashiki", "gantz", "ashita no joe", "initial d", "fuuka", "air gear"]],
  ["shogakukan", ["meitantei conan", "detective conan", "case closed", "sousou no frieren", "frieren", "inuyasha", "ranma", "urusei yatsura", "mob psycho", "komi san", "komi can t communicate", "20th century boys",
    "dorohedoro", "karakai jouzu no takagi san", "takagi san", "tonikaku kawaii", "fly me to the moon", "hanma baki", "zatch bell", "konjiki no gash", "yawara", "cross game", "kekkaishi",
    "blue giant", "dead dead demon s dededede destruction", "nausicaa", "boku no kokoro no yabai yatsu", "the dangers in my heart", "shimanami", "chi s sweet home"]],
  ["square-enix", ["fullmetal alchemist", "hagane no renkinjutsushi", "soul eater", "kuroshitsuji", "black butler", "akame ga kill", "horimiya", "jibaku shounen hanako kun", "toilet bound hanako kun", "kakegurui",
    "the apothecary diaries", "kusuriya no hitorigoto", "spy classroom", "mahoujin guru guru", "fairy tail 100 years", "dragon quest", "kingdom hearts", "shinmai renkinjutsushi", "nier"]],
  ["kadokawa", ["bungou stray dogs", "bungo stray dogs", "overlord", "mushoku tensei", "kono subarashii sekai", "konosuba", "tate no yuusha", "shield hero", "lucky star", "suzumiya haruhi", "shinseiki evangelion",
    "neon genesis evangelion", "deadman wonderland", "dungeon meshi", "delicious in dungeon", "mieruko chan", "re zero", "sword art online", "no game no life", "toradora", "spice and wolf", "ookami to koushinryou",
    "high school dxd", "monogatari", "danmachi", "log horizon", "yotsuba to", "kemono jihen"]],
  ["hakusensha", ["berserk", "akatsuki no yona", "yona of the dawn", "fruits basket", "ouran", "vampire knight", "skip beat", "kamisama hajimemashita", "kamisama kiss", "natsume yuujinchou", "natsume s book of friends",
    "maid sama", "kaichou wa maid sama", "glass no kamen", "hana yori dango", "boys over flowers", "kimi ni todoke", "ao haru ride"]],
  ["akita-shoten", ["grappler baki", "black jack", "kamisama no iutoori"]],
];

/** The 14 hand-built series keep their slugs so figures, demo codes and links still work. */
const CANONICAL: [string, string[]][] = [
  ["one-piece", ["one piece"]], ["jujutsu-kaisen", ["jujutsu kaisen"]], ["demon-slayer", ["kimetsu no yaiba", "demon slayer"]],
  ["chainsaw-man", ["chainsaw man"]], ["naruto", ["naruto"]], ["spy-x-family", ["spy x family"]], ["my-hero-academia", ["boku no hero academia", "my hero academia"]],
  ["attack-on-titan", ["shingeki no kyojin", "attack on titan"]], ["blue-lock", ["blue lock"]], ["tokyo-revengers", ["tokyo revengers", "tokyo manji revengers"]],
  ["frieren", ["sousou no frieren", "frieren beyond journey s end", "frieren"]], ["detective-conan", ["meitantei conan", "detective conan", "case closed"]],
  ["fullmetal-alchemist", ["hagane no renkinjutsushi", "fullmetal alchemist"]], ["soul-eater", ["soul eater"]],
];

const DEMOGRAPHICS: Record<string, string> = { Shounen: "Shonen", Seinen: "Seinen", Shoujo: "Shojo", Josei: "Josei" };
const PALETTE = ["#d9452b", "#3b3f8f", "#2f7d6d", "#c2762b", "#e08a1e", "#c94f7c", "#2f8f4e", "#6b4f3a", "#2563a8", "#5f8fb0", "#a8342f", "#4a3a6b"];
const hash = (s: string) => { let h = 2166136261; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; };
const slugify = (s: string) => norm(s).replace(/\s+/g, "-").slice(0, 60).replace(/-+$/, "");

function titlesOf(it: AniItem) { return [it.title.english, it.title.romaji].filter(Boolean).map((t) => norm(t!)); }
function matches(it: AniItem, keys: string[], exact = false) {
  const ts = titlesOf(it);
  return keys.some((k) => ts.some((t) => (exact ? t === k : t === k || t.startsWith(k + " ") || t.includes(" " + k + " ") || t.endsWith(" " + k))));
}
function publisherFor(it: AniItem) {
  for (const [id, keys] of PUBLISHER_BY_TITLE) if (matches(it, keys)) return id;
  return "other";
}
function cleanSynopsis(d: string | null) {
  if (!d) return "";
  let s = d.replace(/<br\s*\/?>/gi, " ").replace(/<[^>]+>/g, "").replace(/\(Source:[^)]*\)/gi, "").replace(/\[Written by[^\]]*\]/gi, "").replace(/\s+/g, " ").trim();
  if (s.length > 280) { const cut = s.slice(0, 280); const dot = cut.lastIndexOf(". "); s = (dot > 120 ? cut.slice(0, dot + 1) : cut.replace(/\s\S*$/, "") + "…"); }
  return s;
}
function authorOf(it: AniItem) {
  const names: string[] = [];
  for (const e of it.staff?.edges ?? []) {
    if (/story|art|original/i.test(e.role) && !names.includes(e.node.name.full)) names.push(e.node.name.full);
  }
  return names.slice(0, 2).join(" & ") || "Unknown";
}
function displayTitle(it: AniItem) {
  const t = it.title.english || it.title.romaji || "Untitled";
  return t.length > 48 ? t.slice(0, 46).replace(/\s\S*$/, "") + "…" : t;
}

export function fromAniList(items: AniItem[], builtin: Series[], limit = 400): Series[] {
  const kept = items.filter((it) => !it.genres.includes("Hentai") && !it.genres.includes("Ecchi") && !(it.tags ?? []).some((t) => t.isAdult && t.rank > 60));
  const maxPop = Math.max(1, ...kept.map((it) => it.popularity ?? 0));
  const used = new Set<string>();
  const out: Series[] = [];

  kept.forEach((it, rank) => {
    if (out.length >= limit) return;
    const canonical = CANONICAL.find(([slug, keys]) => !used.has(slug) && matches(it, keys, slug === "naruto"));
    const base = canonical ? builtin.find((b) => b.slug === canonical[0]) : undefined;
    let slug = canonical ? canonical[0] : slugify(it.title.english || it.title.romaji || String(it.id));
    if (!slug || used.has(slug)) slug = `${slug || "manga"}-${it.id}`;
    used.add(slug);

    const status = it.status === "RELEASING" || it.status === "HIATUS" || it.status === "NOT_YET_RELEASED" ? "ongoing" : "completed";
    let vols = it.volumes ?? 0, chs = it.chapters ?? 0;
    if (!chs && vols) chs = Math.round(vols * 9.5) + (status === "ongoing" ? 6 : 0);
    if (!chs) chs = 60 + (hash(slug) % 140);
    if (!vols) vols = Math.max(1, Math.floor(chs / 9.5));
    const cpv = +(chs / vols).toFixed(2) || 9;
    const popularity = Math.max(1, Math.round(100 * Math.sqrt((it.popularity ?? 0) / maxPop)));
    const demo = (it.tags ?? []).map((t) => DEMOGRAPHICS[t.name]).find(Boolean);
    const languages: Lang[] = ["en"];
    if (rank < 150) languages.push("hi");
    if (rank < 40) languages.push("ta");
    if (rank < 35) languages.push("te");
    if (rank < 30) languages.push("bn");

    out.push({
      id: "s_" + slug, slug,
      title: base?.title ?? displayTitle(it),
      author: authorOf(it) !== "Unknown" ? authorOf(it) : base?.author ?? "Unknown",
      publisherId: base?.publisherId ?? publisherFor(it),
      genres: it.genres.filter((g) => g !== "Ecchi").slice(0, 4),
      status: base?.status ?? status,
      synopsis: cleanSynopsis(it.description) || base?.synopsis || "",
      color: it.coverImage?.color || base?.color || PALETTE[hash(slug) % PALETTE.length],
      languages: base?.languages ?? languages,
      popularity,
      totalChapters: base?.totalChapters ?? chs,
      totalVolumes: base?.totalVolumes ?? vols,
      startYear: it.startDate?.year ?? base?.startYear ?? 2000,
      cpv: base?.cpv ?? cpv,
      volPrice: base?.volPrice ?? [299, 329, 349, 399][hash(slug) % 4],
      demographic: demo,
      score: it.averageScore ?? undefined,
      image: it.coverImage?.extraLarge || it.coverImage?.large || undefined,
      banner: it.bannerImage || adaptation(it).banner,
      trailer: adaptation(it).trailer,
    });
  });

  // Make sure every hand-built series exists (figures and demo codes depend on them).
  for (const b of builtin) if (!out.some((s) => s.slug === b.slug)) out.push(b);
  return out;
}
