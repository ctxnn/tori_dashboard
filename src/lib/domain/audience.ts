// Audience discovery. Fans answer a short pulse (city, age, what they'd buy, what
// they'd pay, where and in which language they watch). The owner and creators see
// it aggregated next to what fans actually paid for, so a campaign can be aimed
// before it's proposed — and checked afterwards.
import { z } from "zod";
import { all, get, run } from "../db";
import { HttpError, badRequest, forbidden } from "../errors";
import { CITY_NAMES, REGIONS, cityByName, type Region } from "../india";
import { AGE_BANDS, LANGUAGES, PRICE_BANDS, WANTS, WATCH_CHANNELS, labelOf } from "../pulse";
import { pulseJa } from "../pulse-ja";
import { formatINR } from "../money";
import { id, nowIso } from "../util";
import { audit, type User } from "./core";
import { getKit, latestKitVersion, requireKit, type Kit } from "./kits";
import { follow } from "./community";

const ids = <T extends { id: string }>(list: readonly T[]) => list.map((x) => x.id) as [string, ...string[]];

export const InterestSchema = z.object({
  kitId: z.string().min(1),
  email: z.email("Enter a valid email").max(120),
  city: z.enum(CITY_NAMES as [string, ...string[]], { error: "Choose your city" }),
  ageBand: z.enum(AGE_BANDS, { error: "Choose an age range" }),
  priceMinor: z.number().int().refine((n) => (PRICE_BANDS as readonly number[]).includes(n), "Choose a price"),
  wants: z.array(z.enum(ids(WANTS))).min(1, "Pick at least one thing you’d buy").max(WANTS.length),
  channel: z.enum(ids(WATCH_CHANNELS), { error: "Choose where you watch" }),
  language: z.enum(ids(LANGUAGES), { error: "Choose a language" }),
});

export interface InterestReceipt {
  isNew: boolean;
  city: string;
  inCity: number;
  total: number;
  cityRank: number;
}

export function recordInterest(raw: unknown, user?: User): InterestReceipt {
  const parsed = InterestSchema.safeParse(raw);
  if (!parsed.success) throw badRequest(parsed.error.issues[0]?.message ?? "Check your answers", parsed.error.issues);
  const p = parsed.data;
  requireKit(p.kitId);
  const email = p.email.toLowerCase();
  const ts = nowIso();
  const existed = !!get("SELECT 1 FROM interest_signals WHERE kit_id = ? AND email = ?", p.kitId, email);
  run(
    `INSERT INTO interest_signals (id, kit_id, fan_user_id, email, city, age_band, price_minor, products_json, channel, language, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
     ON CONFLICT (kit_id, email) DO UPDATE SET city = excluded.city, age_band = excluded.age_band, price_minor = excluded.price_minor,
       products_json = excluded.products_json, channel = excluded.channel, language = excluded.language,
       fan_user_id = COALESCE(excluded.fan_user_id, interest_signals.fan_user_id), updated_at = excluded.updated_at`,
    id("int"), p.kitId, user?.role === "fan" ? user.id : null, email, p.city, p.ageBand, p.priceMinor, JSON.stringify(p.wants), p.channel, p.language, ts, ts,
  );
  // A fan who answers the pulse wants to hear about drops.
  if (user?.role === "fan") follow(user, "kit", p.kitId);
  audit(user?.id ?? null, existed ? "interest.updated" : "interest.recorded", "kit", p.kitId, { city: p.city });

  const byCity = all<{ city: string; n: number }>("SELECT city, COUNT(*) AS n FROM interest_signals WHERE kit_id = ? GROUP BY city ORDER BY n DESC", p.kitId);
  return {
    isNew: !existed,
    city: p.city,
    inCity: byCity.find((r) => r.city === p.city)?.n ?? 1,
    total: byCity.reduce((s, r) => s + r.n, 0),
    cityRank: byCity.findIndex((r) => r.city === p.city) + 1,
  };
}

// ---------------------------------------------------------------------------
// Insights
// ---------------------------------------------------------------------------

export function canViewAudience(user: User | undefined, kit: Kit): boolean {
  if (!user) return false;
  if (user.role === "owner") return user.org === kit.owner_org;
  return user.role === "creator" || user.role === "operator";
}

export function requireAudienceView(user: User | undefined, kit: Kit): void {
  if (!user) throw new HttpError(401, "Choose a demo role first");
  if (!canViewAudience(user, kit)) throw forbidden("Audience insights are for the property owner, its creators and Torii operators");
}

export interface Share {
  id: string;
  label: string;
  n: number;
  share: number;
}

export interface CityInsight {
  city: string;
  region: Region;
  lon: number;
  lat: number;
  interest: number;
  backers: number;
  /** Paid backers per 100 fans who said they're interested. */
  per100: number;
}

export interface AudienceInsights {
  kit: Kit;
  total: number;
  firstSignalAt: string | null;
  firstLaunchAt: string | null;
  signalsBeforeFirstLaunch: number;
  cities: CityInsight[];
  regions: Share[];
  ages: Share[];
  wants: (Share & { inKit: boolean })[];
  channels: Share[];
  languages: Share[];
  priceCurve: { priceMinor: number; share: number }[];
  medianPriceMinor: number | null;
  teeCampaigns: { title: string; priceMinor: number; reach: number }[];
  conversion: { signals: number; converted: number; rate: number };
  findings: Finding[];
}

function shares(rows: { k: string; n: number }[], total: number, labels: { id: string; label: string }[]): Share[] {
  const m = new Map(rows.map((r) => [r.k, r.n]));
  return labels
    .map((l) => ({ id: l.id, label: l.label, n: m.get(l.id) ?? 0, share: total ? (m.get(l.id) ?? 0) / total : 0 }))
    .sort((a, b) => b.n - a.n);
}

const pct = (x: number) => `${Math.round(x * 100)}%`;

export function audienceInsights(kitId: string): AudienceInsights {
  const kit = requireKit(kitId);
  const kv = latestKitVersion(kit.id);
  const permitted = new Set(kv?.rules.products.map((p) => p.productId) ?? []);
  const total = get<{ n: number }>("SELECT COUNT(*) AS n FROM interest_signals WHERE kit_id = ?", kit.id)!.n;
  const signals = all<{ email: string; city: string; age_band: string; price_minor: number; products_json: string; channel: string; language: string; created_at: string }>(
    "SELECT email, city, age_band, price_minor, products_json, channel, language, created_at FROM interest_signals WHERE kit_id = ?",
    kit.id,
  );

  // Paid backers on this property, by city (one person counted once per city).
  const backerRows = all<{ city: string; email: string }>(
    `SELECT DISTINCT o.buyer_city AS city, o.buyer_email AS email FROM orders o JOIN campaigns c ON c.id = o.campaign_id
     WHERE c.kit_id = ? AND o.paid_at IS NOT NULL`,
    kit.id,
  );
  const backersByCity = new Map<string, number>();
  for (const r of backerRows) backersByCity.set(r.city, (backersByCity.get(r.city) ?? 0) + 1);

  const interestByCity = new Map<string, number>();
  for (const s of signals) interestByCity.set(s.city, (interestByCity.get(s.city) ?? 0) + 1);
  const cities: CityInsight[] = [...new Set([...interestByCity.keys(), ...backersByCity.keys()])]
    .flatMap((name) => {
      const c = cityByName(name);
      if (!c) return [];
      const interest = interestByCity.get(c.name) ?? 0;
      const backers = backersByCity.get(c.name) ?? 0;
      return [{ city: c.name, region: c.region, lon: c.lon, lat: c.lat, interest, backers, per100: interest ? Math.round((backers / interest) * 100) : 0 }];
    })
    .sort((a, b) => b.interest - a.interest);

  const regionCounts = new Map<string, number>();
  for (const c of cities) regionCounts.set(c.region, (regionCounts.get(c.region) ?? 0) + c.interest);
  const regions = shares([...regionCounts].map(([k, n]) => ({ k, n })), total, REGIONS.map((r) => ({ id: r, label: r })));

  const count = (key: (s: (typeof signals)[number]) => string[]) => {
    const m = new Map<string, number>();
    for (const s of signals) for (const k of key(s)) m.set(k, (m.get(k) ?? 0) + 1);
    return [...m].map(([k, n]) => ({ k, n }));
  };
  const wants = shares(count((s) => JSON.parse(s.products_json)), total, [...WANTS]).map((w) => {
    const productId = WANTS.find((x) => x.id === w.id)?.productId;
    return { ...w, inKit: !!productId && permitted.has(productId) };
  });

  const prices = signals.map((s) => s.price_minor).sort((a, b) => a - b);
  const reachAt = (price: number) => (prices.length ? prices.filter((p) => p >= price).length / prices.length : 0);
  const priceCurve = PRICE_BANDS.map((b) => ({ priceMinor: b, share: reachAt(b) }));
  const medianPriceMinor = prices.length ? prices[Math.floor((prices.length - 1) / 2)] : null;

  const teeCampaigns = all<{ title: string; price: number }>(
    `SELECT json_extract(v.content_json, '$.copy.title') AS title, json_extract(v.content_json, '$.offer.priceMinor') AS price
     FROM campaigns c JOIN campaign_versions v ON v.id = COALESCE(c.published_version_id, (SELECT id FROM campaign_versions WHERE campaign_id = c.id ORDER BY version_no DESC LIMIT 1))
     WHERE c.kit_id = ? AND json_extract(v.content_json, '$.productId') = 'tshirt' ORDER BY price`,
    kit.id,
  ).map((r) => ({ title: r.title, priceMinor: r.price, reach: reachAt(r.price) }));

  const backerEmails = new Set(backerRows.map((r) => r.email));
  const converted = signals.filter((s) => backerEmails.has(s.email)).length;

  const firstSignalAt = signals.reduce<string | null>((m, s) => (!m || s.created_at < m ? s.created_at : m), null);
  const firstLaunchAt = get<{ t: string | null }>("SELECT MIN(published_at) AS t FROM campaigns WHERE kit_id = ?", kit.id)?.t ?? null;
  const signalsBeforeFirstLaunch = firstLaunchAt ? signals.filter((s) => s.created_at < firstLaunchAt).length : total;

  const insights: AudienceInsights = {
    kit,
    total,
    firstSignalAt,
    firstLaunchAt,
    signalsBeforeFirstLaunch,
    cities,
    regions,
    ages: shares(count((s) => [s.age_band]), total, AGE_BANDS.map((a) => ({ id: a, label: a }))),
    wants,
    channels: shares(count((s) => [s.channel]), total, [...WATCH_CHANNELS]),
    languages: shares(count((s) => [s.language]), total, [...LANGUAGES]),
    priceCurve,
    medianPriceMinor,
    teeCampaigns,
    conversion: { signals: total, converted, rate: total ? converted / total : 0 },
    findings: [],
  };
  insights.findings = findingsFor(insights);
  return insights;
}

export interface Finding {
  title: string;
  detail: string;
  /** The same finding in Japanese, for the IP owner's view. */
  ja: { title: string; detail: string };
}

/** Plain-language findings computed from the numbers. The AI summary builds on these. */
export function findingsFor(a: AudienceInsights): Finding[] {
  if (!a.total) return [];
  const out: Finding[] = [];
  const top = a.cities.slice(0, 3);
  const topShare = top.reduce((s, c) => s + c.interest, 0) / a.total;
  out.push({
    title: `${top.map((c) => c.city).join(", ")} lead`,
    detail: `${pct(topShare)} of interested fans are in these three cities.`,
    ja: { title: `${top.map((c) => c.city).join("・")}が上位`, detail: `購入意向のあるファンの${pct(topShare)}が、この3都市に集中しています。` },
  });

  // Strong interest, nobody has sold there yet: a whole region first, else single cities.
  const region = REGIONS.map((r) => {
    const cs = a.cities.filter((c) => c.region === r);
    return { r, cs, interest: cs.reduce((s, c) => s + c.interest, 0), backers: cs.reduce((s, c) => s + c.backers, 0) };
  }).find((x) => x.backers === 0 && x.interest >= a.total * 0.04);
  const gaps = region ? region.cs.filter((c) => c.interest > 0) : a.cities.filter((c) => c.interest >= a.total * 0.03 && c.backers === 0);
  if (gaps.length) {
    const n = gaps.reduce((s, c) => s + c.interest, 0);
    out.push({
      title: region ? `Untapped: the ${region.r} (${gaps.map((c) => c.city).join(", ")})` : `Untapped: ${gaps.map((c) => c.city).join(" & ")}`,
      detail: `${n} fans (${pct(n / a.total)}) said they’d buy, but no campaign has sold there yet.`,
      ja: {
        title: region ? `未開拓：${pulseJa(region.r)}（${gaps.map((c) => c.city).join("・")}）` : `未開拓：${gaps.map((c) => c.city).join("・")}`,
        detail: `${n}人（${pct(n / a.total)}）のファンが購入意向を示していますが、まだこの地域で販売したキャンペーンはございません。`,
      },
    });
  }

  if (a.medianPriceMinor) {
    const tee = a.teeCampaigns[a.teeCampaigns.length - 1];
    const lower = a.priceCurve.filter((p) => p.priceMinor < (tee?.priceMinor ?? Infinity)).at(-1);
    out.push({
      title: `Typical fan would pay ${formatINR(a.medianPriceMinor)} for a tee`,
      detail: tee && lower
        ? `At ${formatINR(tee.priceMinor)}, ${pct(tee.reach)} of fans are in reach; at ${formatINR(lower.priceMinor)}, ${pct(lower.share)} are.`
        : `Half of interested fans would pay at least ${formatINR(a.medianPriceMinor)}.`,
      ja: {
        title: `Tシャツの想定価格の中央値は${formatINR(a.medianPriceMinor)}`,
        detail:
          tee && lower
            ? `${formatINR(tee.priceMinor)}ではファンの${pct(tee.reach)}、${formatINR(lower.priceMinor)}では${pct(lower.share)}が購入圏内です。`
            : `購入意向のあるファンの半数が、${formatINR(a.medianPriceMinor)}以上を支払ってもよいと回答しています。`,
      },
    });
  }

  const missing = a.wants.filter((w) => !w.inKit && w.share >= 0.15).slice(0, 2);
  if (missing.length) {
    out.push({
      title: `Asked for, not in the kit: ${missing.map((w) => w.label.toLowerCase()).join(", ")}`,
      detail: `${missing.map((w) => `${pct(w.share)} want ${w.label.toLowerCase()}s`).join("; ")}. The current kit doesn’t allow ${missing.length > 1 ? "these" : "this"} yet.`,
      ja: {
        title: `ご要望があるもののキット対象外：${missing.map((w) => pulseJa(w.id, w.label)).join("・")}`,
        detail: `${missing.map((w) => `${pct(w.share)}が${pulseJa(w.id, w.label)}を希望`).join("、")}しています。現在のキットではまだ許諾されておりません。`,
      },
    });
  }

  const dub = a.languages.filter((l) => l.id !== "ja_en" && l.id !== "en").reduce((s, l) => s + l.share, 0);
  if (dub > 0.2) {
    const lead = a.languages.find((l) => l.id !== "ja_en" && l.id !== "en")!.id;
    out.push({
      title: `${pct(dub)} watch in an Indian language`,
      detail: `${labelOf(LANGUAGES, lead)} leads. Local-language print lines and captions travel further.`,
      ja: { title: `${pct(dub)}がインドの言語で視聴`, detail: `最も多いのは${pulseJa(lead)}です。現地の言語を使った印刷テキストや字幕は、より広く届きます。` },
    });
  }

  const ch = a.channels.slice(0, 2);
  out.push({
    title: `Found on ${ch.map((c) => c.label).join(" and ")}`,
    detail: `${pct(ch.reduce((s, c) => s + c.share, 0))} of fans watch or discover the show there.`,
    ja: { title: `主な接点は${ch.map((c) => pulseJa(c.id, c.label)).join("と")}`, detail: `ファンの${pct(ch.reduce((s, c) => s + c.share, 0))}が、ここで作品を視聴・発見しています。` },
  });
  return out;
}

export function defaultKitId(): string | undefined {
  return get<{ id: string }>("SELECT id FROM kits ORDER BY created_at LIMIT 1")?.id;
}

export function interestFor(kitId: string, email: string) {
  const k = getKit(kitId);
  if (!k) return undefined;
  return get<{ city: string; age_band: string; price_minor: number; products_json: string; channel: string; language: string }>(
    "SELECT city, age_band, price_minor, products_json, channel, language FROM interest_signals WHERE kit_id = ? AND email = ?",
    kitId,
    email.toLowerCase(),
  );
}
