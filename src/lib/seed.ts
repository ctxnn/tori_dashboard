// Demonstration data. Everything here is fictional: the Sky Courier property, its
// owner studio, creators, fans, the seller and all commercial terms.
//
// Rather than inserting finished rows, the seed replays a believable history
// through the real domain functions with a simulated clock, so seeded campaigns
// went through the same rule checks, approvals, payment events and ledger posts
// as anything created in the UI.
import fs from "node:fs";
import path from "node:path";
import { isEmpty, run, wipeDatabase } from "./db";
import type { ContentInput } from "./content";
import { setClock } from "./util";
import { getUser, setCostAssumptions, setPlatformTerms, DEFAULT_COSTS, DEFAULT_PLATFORM_TERMS, type User } from "./domain/core";
import { createAsset, publishKitVersion } from "./domain/kits";
import { createCampaign, publishVersion, saveDraft, submitVersion, latestVersion, type Campaign } from "./domain/campaigns";
import { reviewVersion } from "./domain/reviews";
import { createOrder } from "./domain/orders";
import { simulatorComplete, simulatorResend } from "./domain/payments/simulator";
import { requestRefund } from "./domain/refunds";
import { markDelivered, markShipped, releaseProduction } from "./domain/fulfilment";
import { recordInterest } from "./domain/audience";
import { follow } from "./domain/community";
import { AGE_BANDS, LANGUAGES, PRICE_BANDS, WANTS, WATCH_CHANNELS } from "./pulse";
import type { KitRules } from "./kit-rules";

const DAY = 86_400_000;
const T = () => {
  const d = new Date();
  d.setUTCHours(6, 0, 0, 0);
  return d.getTime();
};
const dayIso = (offset: number) => new Date(T() + offset * DAY).toISOString().slice(0, 10);

let base = 0;
function at(offsetDays: number, hours = 0) {
  setClock(new Date(base + offsetDays * DAY + hours * 3_600_000));
}

// Small deterministic PRNG so every reset produces the same demo.
function prng(seed: number) {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const FIRST = ["Aanya", "Vihaan", "Ishita", "Arjun", "Saanvi", "Kabir", "Diya", "Reyansh", "Anika", "Advait", "Myra", "Rohan", "Tara", "Neel", "Kiara", "Dev", "Zoya", "Aditya", "Riya", "Om", "Navya", "Yash", "Sara", "Ira", "Kunal", "Mehak", "Parth", "Tanvi", "Laksh", "Nitya"];
const LAST = ["S", "K", "M", "R", "P", "D", "G", "B", "N", "T", "J", "V"];
// Where each campaign's buyers live: its creator's own reach, not the whole country.
const FIRST_FLIGHT_CITIES = ["Delhi", "Delhi", "Delhi", "Delhi", "Delhi", "Chandigarh", "Patiala", "Jaipur", "Lucknow", "Bengaluru", "Mumbai", "Pune"];
const MONSOON_CITIES = ["Mumbai", "Mumbai", "Mumbai", "Pune", "Pune", "Bengaluru", "Ahmedabad"];
const MIDNIGHT_CITIES = ["Patiala", "Patiala", "Patiala", "Chandigarh", "Chandigarh", "Delhi", "Delhi", "Hyderabad", "Kolkata", "Chennai"];

/** Stable pick from a list by name, so the same fan reads as one person. */
function pickBy(name: string, list: string[]): string {
  let h = 0;
  for (const ch of name) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  return list[h % list.length];
}

const USERS: User[] = [
  { id: "usr_haruka", name: "Haruka Sato", email: "haruka@kumolantern.example", role: "owner", org: "Kumo Lantern Studio", title: "Licensing lead", bio: "Required approver for Sky Courier merchandise." },
  { id: "usr_daichi", name: "Daichi Mori", email: "daichi@kumolantern.example", role: "owner", org: "Kumo Lantern Studio", title: "Brand coordinator", bio: "Reviews proposals; can request changes but isn't the named approver." },
  { id: "usr_riya", name: "Riya Menon", email: "riya@chaiandcels.example", role: "creator", org: "Chai & Cels Collective", title: "Illustrator & club organiser", bio: "Runs a network of 22 college anime clubs across Delhi NCR (~14k members)." },
  { id: "usr_kabir", name: "Kabir Shah", email: "kabir@paneltheory.example", role: "creator", org: "Panel Theory", title: "Webcomic studio, Mumbai", bio: "Prints and sells zines and posters at conventions." },
  { id: "usr_aarav", name: "Aarav Gupta", email: "aarav@fan.example", role: "fan", org: "Fan", title: "Sky Courier fan, Patiala", bio: "" },
  { id: "usr_meera", name: "Meera Iyer", email: "meera@torii.example", role: "operator", org: "Torii", title: "Campaign operations", bio: "Releases production, runs fulfilment and refunds." },
];

function content(over: Partial<ContentInput> & { design: ContentInput["design"]; copy: ContentInput["copy"]; offer: ContentInput["offer"] }): ContentInput {
  return {
    productId: "tshirt",
    layoutId: "centre",
    distribution: { channels: [], launchMoment: "", creatorCommitment: "" },
    ...over,
  };
}

interface Buyer {
  name: string;
  email: string;
  city: string;
}

/**
 * `returning` brings back earlier backers: a share of orders come from people who
 * bought a previous run. It draws from its own PRNG so the rest of the history
 * (and every total derived from it) stays exactly the same.
 */
async function buyMany(c: Campaign, n: { orders: number; fromDay: number; toDay: number; rand: () => number; sizes: string[]; cities: string[]; maxQty?: number; fan?: User; failEvery?: number; unpaid?: number; returning?: { from: Buyer[]; share: number; seed: number } }) {
  const refs: { orderId: string; ref: string; buyer: Buyer }[] = [];
  const back = n.returning && prng(n.returning.seed);
  for (let i = 0; i < n.orders; i++) {
    const day = n.fromDay + ((n.toDay - n.fromDay) * i) / Math.max(1, n.orders);
    at(day, 2 + Math.floor(n.rand() * 12));
    const first = FIRST[Math.floor(n.rand() * FIRST.length)];
    const last = LAST[Math.floor(n.rand() * LAST.length)];
    // One address per person, so a fan who backs two runs is recognisably the same fan.
    let buyer: Buyer = { name: `${first} ${last}.`, email: `${first.toLowerCase()}.${last.toLowerCase()}@fan.example`, city: "" };
    const qty = n.maxQty && n.rand() < 0.25 ? 2 : 1;
    const size = n.sizes[Math.floor(n.rand() * n.sizes.length)];
    n.rand(); // kept so the draw sequence (and every seeded total) is unchanged
    buyer.city = pickBy(first + last, n.cities);
    if (back && n.returning!.from.length && back() < n.returning!.share) {
      buyer = n.returning!.from[Math.floor(back() * n.returning!.from.length)];
    }
    const { order, checkoutUrl } = await createOrder(
      {
        slug: c.slug,
        size,
        quantity: qty,
        buyerName: buyer.name,
        buyerEmail: buyer.email,
        buyerCity: buyer.city,
        checkoutKey: `seed-${c.id}-${i}`,
      },
      undefined,
    );
    const ref = checkoutUrl.split("/").pop()!;
    const unpaid = n.unpaid && i >= n.orders - n.unpaid;
    if (unpaid) continue;
    if (n.failEvery && i % n.failEvery === n.failEvery - 1) {
      await simulatorComplete(ref, "failed");
      continue;
    }
    await simulatorComplete(ref, "succeeded");
    refs.push({ orderId: order.id, ref, buyer });
  }
  return refs;
}

export async function seedDemo(): Promise<void> {
  base = T();
  try {
    await seedHistory();
  } finally {
    setClock(null);
  }
}

async function seedHistory() {
  const rand = prng(20261020);
  for (const u of USERS) {
    run("INSERT INTO users (id, name, email, role, org, title, bio) VALUES (?, ?, ?, ?, ?, ?, ?)", u.id, u.name, u.email, u.role, u.org, u.title, u.bio);
  }
  const [haruka, daichi, riya, kabir, aarav, meera] = USERS.map((u) => getUser(u.id)!);
  setPlatformTerms(DEFAULT_PLATFORM_TERMS);
  setCostAssumptions(DEFAULT_COSTS);

  // ---- Owner kit -----------------------------------------------------------
  at(-62);
  run(
    "INSERT INTO kits (id, property_name, owner_org, summary, credit_line, created_at) VALUES (?, ?, ?, ?, ?, ?)",
    "kit_skycourier",
    "Sky Courier",
    "Kumo Lantern Studio",
    "A gentle adventure series about a paper courier who delivers letters across the sky. Fictional property created for this demonstration.",
    "Sky Courier © Kumo Lantern Studio · demonstration property",
    new Date(base - 62 * DAY).toISOString(),
  );
  const art = path.join(process.cwd(), "seed", "artwork");
  const upload = (file: string, name: string, description: string) =>
    createAsset({ kitId: "kit_skycourier", name, description, data: fs.readFileSync(path.join(art, file)), actor: haruka });
  const kite = upload("courier-kite.svg", "Courier Kite", "Key visual: the courier in flight over a vermilion sun and seigaiha waves.");
  const emblem = upload("cloud-post-emblem.svg", "Cloud Post Emblem", "Circular badge with a winged envelope. Keep the ring text intact.");
  const night = upload("night-route.svg", "Night Route", "Transparent artwork for dark garments: moon, dotted route, parcel.");

  await seedPulse(haruka);

  const v1Rules: KitRules = {
    products: [{ productId: "tshirt", layouts: ["centre"], minPriceMinor: 49900, maxPriceMinor: 149900 }],
    territories: ["IN"],
    window: { start: dayIso(-60), end: dayIso(150) },
    requiredApproverId: haruka.id,
    artworkScale: { min: 0.7, max: 1 },
    prohibitedTerms: ["free", "bootleg", "unofficial", "replica", "fan-made"],
    royaltyBps: 1000,
  };
  at(-60);
  publishKitVersion({ kitId: "kit_skycourier", rules: v1Rules, assetIds: [kite.id, emblem.id, night.id], notes: "Launch kit: centre-print T-shirts for India.", actor: haruka });

  // ---- Campaign A: completed, 100 delivered units --------------------------
  at(-56);
  const first = createCampaign({
    kitId: "kit_skycourier",
    title: "First Flight Tee",
    actor: riya,
    content: content({
      design: { artworkAssetId: kite.id, artworkScale: 1, baseColour: "ivory", text: { line1: "Chitthi pahunchegi", line2: "THE LETTER WILL ARRIVE", font: "display", colour: "ink", position: "below" } },
      copy: {
        title: "First Flight Tee",
        tagline: "The courier's very first delivery, on washi-ivory cotton.",
        story: "Episode one — a nervous paper courier carrying a single letter across a monsoon sky — is the scene our clubs rewatch every orientation week. This tee puts that moment on heavyweight ivory cotton with the line our members already quote to each other.",
        audience: "First- and second-year students in 22 Delhi NCR college anime clubs (~14k members). Mostly 18–22, buy merch at fests, hesitate above ₹800.",
        localAngle: "Timed to orientation week. A Hinglish line that already works as an in-joke, and a price that stays under ₹800 with shipping.",
      },
      distribution: {
        channels: [{ id: "instagram", plannedReach: 18000 }, { id: "campus_stall", plannedReach: 3000 }, { id: "whatsapp", plannedReach: 6000 }],
        launchMoment: "Orientation week screenings across 22 colleges",
        creatorCommitment: "3 reels, two fest stall days and a pinned post in every club group",
      },
      offer: { priceMinor: 69900, shippingMinor: 7900, thresholdUnits: 80, launchDate: dayIso(-55), deadline: dayIso(-25), territory: "IN", sizes: ["S", "M", "L", "XL"], expectedUnits: 120 },
    }),
  });
  submitVersion({ versionId: latestVersion(first.id).id, actor: riya });
  at(-55);
  reviewVersion({ versionId: latestVersion(first.id).id, actor: haruka, decision: "approved", comment: "Lovely use of the key visual. Approved." });
  publishVersion({ versionId: latestVersion(first.id).id, actor: riya });
  const firstRefs = await buyMany(first, { orders: 83, fromDay: -54, toDay: -26, rand, sizes: ["S", "M", "M", "L", "L", "XL"], cities: FIRST_FLIGHT_CITIES, maxQty: 2 });
  // Trim to exactly 100 delivered units + 3 refunded orders for a clean example.
  // (The PRNG is fixed, so this is deterministic.)
  at(-41);
  await simulatorResend(firstRefs[3].ref); // a provider retry: recorded as a duplicate, changes nothing
  await simulatorResend(firstRefs[10].ref);
  const { listOrders } = await import("./domain/orders");
  const paid = listOrders(first.id, ["paid"]).reverse();
  let units = paid.reduce((s, o) => s + o.quantity, 0);
  const refundTargets: string[] = [];
  // Refund single-unit orders until 100 remain, and at least three refunds happen.
  for (const o of paid) {
    if (refundTargets.length >= 3 && units <= 100) break;
    if (units - o.quantity < 100) continue;
    refundTargets.push(o.id);
    units -= o.quantity;
  }
  for (const [i, orderId] of refundTargets.entries()) {
    at(-40 + i, 3);
    await requestRefund({ orderId, actor: meera, reason: i === 0 ? "Fan asked to cancel before production" : "Duplicate purchase by the same fan" });
  }
  // Aarav was one of First Flight's backers: his order is one of the delivered ones.
  {
    const mine = paid.filter((o) => !refundTargets.includes(o.id) && o.quantity === 1)[4];
    run("UPDATE orders SET fan_user_id = ?, buyer_name = ?, buyer_email = ?, buyer_city = 'Patiala' WHERE id = ?", aarav.id, aarav.name, aarav.email, mine.id);
  }
  at(-24);
  releaseProduction({ campaignId: first.id, actor: meera });
  at(-14);
  markShipped({ campaignId: first.id, actor: meera });
  at(-8);
  markDelivered({ campaignId: first.id, actor: meera });

  // ---- Kit v2: adds pocket layout, posters and a new seal ------------------
  at(-30);
  const seal = upload("parcel-seal.svg", "Parcel Seal", "Hanko-style seal mark for small placements.");
  publishKitVersion({
    kitId: "kit_skycourier",
    rules: {
      ...v1Rules,
      products: [
        { productId: "tshirt", layouts: ["centre", "pocket"], minPriceMinor: 49900, maxPriceMinor: 149900 },
        { productId: "poster", layouts: ["gallery", "framed"], minPriceMinor: 29900, maxPriceMinor: 99900 },
      ],
    },
    assetIds: [kite.id, emblem.id, night.id, seal.id],
    notes: "Adds pocket-print tees, A3 posters and the Parcel Seal mark. Glassware is still out of scope.",
    actor: haruka,
  });

  // ---- Campaign D: poster that missed its threshold ------------------------
  at(-29);
  const monsoon = createCampaign({
    kitId: "kit_skycourier",
    title: "Monsoon Route Poster",
    actor: kabir,
    content: content({
      productId: "poster",
      layoutId: "gallery",
      design: { artworkAssetId: kite.id, artworkScale: 0.9, baseColour: "paper", text: { line1: "Monsoon Route", line2: "SKY COURIER · A3 PRINT", font: "display", colour: "ink", position: "below" } },
      copy: {
        title: "Monsoon Route Poster",
        tagline: "An A3 print for the rainy-season rewatch.",
        story: "A gallery-style A3 print of the courier's monsoon flight, for desks, hostel walls and the Panel Theory zine table.",
        audience: "Readers of Panel Theory's webcomics in Mumbai and Pune; convention regulars.",
        localAngle: "Released for monsoon season, sold at our convention table and online.",
      },
      distribution: { channels: [{ id: "instagram", plannedReach: 5000 }, { id: "convention", plannedReach: 1500 }], launchMoment: "Monsoon season", creatorCommitment: "Two posts and a convention table" },
      offer: { priceMinor: 44900, shippingMinor: 9900, thresholdUnits: 40, launchDate: dayIso(-28), deadline: dayIso(-3), territory: "IN", sizes: ["A3"], expectedUnits: 45 },
    }),
  });
  submitVersion({ versionId: latestVersion(monsoon.id).id, actor: kabir });
  at(-28);
  reviewVersion({ versionId: latestVersion(monsoon.id).id, actor: haruka, decision: "approved", comment: "Approved." });
  publishVersion({ versionId: latestVersion(monsoon.id).id, actor: kabir });
  await buyMany(monsoon, { orders: 14, fromDay: -27, toDay: -4, rand, sizes: ["A3"], cities: MONSOON_CITIES, unpaid: 2 });
  at(-10, 5);
  {
    const { checkoutUrl } = await createOrder(
      { slug: monsoon.slug, size: "A3", quantity: 1, buyerName: aarav.name, buyerEmail: aarav.email, buyerCity: "Patiala", checkoutKey: `seed-aarav-${monsoon.id}` },
      aarav,
    );
    await simulatorComplete(checkoutUrl.split("/").pop()!, "succeeded");
  }

  // ---- Campaign B: live, close to threshold, with a pending v3 -------------
  at(-18);
  const midnightContent = content({
    design: { artworkAssetId: night.id, artworkScale: 1, baseColour: "ink", text: { line1: "Raat ki delivery", line2: "MIDNIGHT ROUTE · CAMPUS DROP", font: "display", colour: "ivory", position: "below" } },
    copy: {
      title: "Midnight Delivery Tee",
      tagline: "For everyone who has submitted an assignment at 11:58 pm.",
      story: "Sky Courier's night-route episode on a sumi-ink tee, screen printed so it survives hostel laundry. Designed with our club members for end-semester week.",
      audience: "Engineering and design students in Patiala, Chandigarh and Delhi; heavy Discord users who watch simulcasts late at night.",
      localAngle: "An end-sem drop with a Hinglish line that reads as an inside joke, delivered to hostel addresses.",
    },
    distribution: {
      channels: [{ id: "discord", plannedReach: 9000 }, { id: "instagram", plannedReach: 15000 }, { id: "campus_stall", plannedReach: 2500 }],
      launchMoment: "End-semester week, 9 campuses",
      creatorCommitment: "Discord watch-party, 2 reels and a stall at Patiala's tech fest",
    },
    offer: { priceMinor: 74900, shippingMinor: 7900, thresholdUnits: 50, launchDate: dayIso(-14), deadline: dayIso(12), territory: "IN", sizes: ["S", "M", "L", "XL"], expectedUnits: 70 },
  });
  const midnight = createCampaign({ kitId: "kit_skycourier", title: "Midnight Delivery Tee", actor: riya, content: midnightContent });
  submitVersion({ versionId: latestVersion(midnight.id).id, actor: riya });
  at(-16);
  reviewVersion({
    versionId: latestVersion(midnight.id).id,
    actor: daichi,
    decision: "changes_requested",
    comment: "Please bring the price down to ₹699 to match First Flight, and credit the property in the story.",
  });
  at(-15);
  saveDraft({
    campaignId: midnight.id,
    actor: riya,
    content: {
      ...midnightContent,
      copy: { ...midnightContent.copy, story: `${midnightContent.copy.story} An official Sky Courier collaboration with Kumo Lantern Studio.` },
      offer: { ...midnightContent.offer, priceMinor: 69900 },
    },
  });
  submitVersion({ versionId: latestVersion(midnight.id).id, actor: riya });
  at(-14);
  reviewVersion({ versionId: latestVersion(midnight.id).id, actor: haruka, decision: "approved", comment: "Thanks for the changes. Approved for India." });
  publishVersion({ versionId: latestVersion(midnight.id).id, actor: riya });
  const midRefs = await buyMany(midnight, { orders: 41, fromDay: -13, toDay: -1, rand, sizes: ["S", "M", "L", "L", "XL"], cities: MIDNIGHT_CITIES, maxQty: 2, failEvery: 13, unpaid: 1,
    // Same creator, same clubs: a good share of Midnight's buyers backed First Flight.
    returning: { from: firstRefs.filter((r) => !refundTargets.includes(r.orderId)).map((r) => r.buyer), share: 0.4, seed: 4141 } });
  at(-6);
  await simulatorResend(midRefs[5].ref);
  {
    at(-3, 4);
    const { checkoutUrl } = await createOrder(
      { slug: midnight.slug, size: "M", quantity: 1, buyerName: aarav.name, buyerEmail: aarav.email, buyerCity: "Patiala", checkoutKey: `seed-aarav-${midnight.id}` },
      aarav,
    );
    await simulatorComplete(checkoutUrl.split("/").pop()!, "succeeded");
  }
  // Aarav answers the pulse (which follows the property for him) and follows Riya.
  at(-3, 6);
  recordInterest({ kitId: "kit_skycourier", email: aarav.email, city: "Patiala", ageBand: "18–24", priceMinor: 69900, wants: ["tshirt", "poster", "pin"], channel: "crunchyroll", language: "hi" }, aarav);
  follow(aarav, "creator", riya.id);

  // ---- Campaign F: Diwali poster, approved; today is its backers' day ------
  at(-3, 2);
  const lanterns = createCampaign({
    kitId: "kit_skycourier",
    title: "Festival of Lanterns Poster",
    actor: riya,
    content: content({
      productId: "poster",
      layoutId: "framed",
      design: { artworkAssetId: night.id, artworkScale: 0.9, baseColour: "night", text: { line1: "Roshni ki chitthi", line2: "A DIWALI DELIVERY · A3 PRINT", font: "display", colour: "gold", position: "below" } },
      copy: {
        title: "Festival of Lanterns Poster",
        tagline: "The courier’s night route, lit for Diwali.",
        story: "Kumo Lantern’s night-route artwork meets the paper lanterns on every balcony in our colony. A framed A3 print to give before Diwali — an official Sky Courier collaboration with Kumo Lantern Studio.",
        audience: "Club members and their families looking for a Diwali gift that isn’t another box of sweets; Instagram followers across Delhi NCR and Punjab.",
        localAngle: "Japanese paper lanterns and Diwali diyas carry the same idea: a light left on for someone coming home.",
      },
      distribution: {
        channels: [{ id: "instagram", plannedReach: 16000 }, { id: "whatsapp", plannedReach: 6000 }],
        launchMoment: "Ten days before Diwali",
        creatorCommitment: "A reel, a gifting post and a pinned message in every club group",
      },
      offer: { priceMinor: 44900, shippingMinor: 7900, thresholdUnits: 40, launchDate: dayIso(1), deadline: dayIso(18), territory: "IN", sizes: ["A3"], expectedUnits: 60 },
    }),
  });
  submitVersion({ versionId: latestVersion(lanterns.id).id, actor: riya });
  at(-3, 22);
  reviewVersion({ versionId: latestVersion(lanterns.id).id, actor: haruka, decision: "approved", comment: "Beautiful pairing of the lanterns. Approved for India." });
  at(-2, 1);
  publishVersion({ versionId: latestVersion(lanterns.id).id, actor: riya });

  // Riya edits the live campaign: v3 needs fresh approval; fans still buy v2.
  at(-1, 3);
  const v2 = latestVersion(midnight.id);
  saveDraft({
    campaignId: midnight.id,
    actor: riya,
    content: {
      productId: v2.content.productId,
      layoutId: v2.content.layoutId,
      design: { ...v2.content.design, text: { ...v2.content.design.text, line2: "MIDNIGHT ROUTE · HOSTEL EDITION" } },
      copy: v2.content.copy,
      distribution: v2.content.distribution,
      offer: { ...v2.content.offer, sizes: ["S", "M", "L", "XL", "XXL"], expectedUnits: 90 },
    },
  });
  submitVersion({ versionId: latestVersion(midnight.id).id, actor: riya });

  // ---- Campaign C: new pocket tee awaiting first review --------------------
  at(-2);
  const pocket = createCampaign({
    kitId: "kit_skycourier",
    title: "Courier Club Pocket Tee",
    actor: kabir,
    content: content({
      layoutId: "pocket",
      design: { artworkAssetId: seal.id, artworkScale: 1, baseColour: "sage", text: { line1: "COURIER CLUB", line2: "", font: "sans", colour: "ink", position: "below" } },
      copy: {
        title: "Courier Club Pocket Tee",
        tagline: "A quiet pocket mark for people who get the reference.",
        story: "A small Parcel Seal on the chest of a matcha-sage tee. Made for Panel Theory's Sunday sketch meet-ups in Bandra.",
        audience: "Working illustrators and webcomic readers, 22–30, who prefer understated merch they can wear to work.",
        localAngle: "Understated design for an older audience who buy fewer but better pieces; sold at sketch meet-ups and conventions.",
      },
      distribution: { channels: [{ id: "instagram", plannedReach: 7000 }, { id: "convention", plannedReach: 2000 }], launchMoment: "Mumbai Comic weekend", creatorCommitment: "Meet-up announcement and a convention table" },
      offer: { priceMinor: 64900, shippingMinor: 7900, thresholdUnits: 40, launchDate: dayIso(2), deadline: dayIso(32), territory: "IN", sizes: ["S", "M", "L", "XL"], expectedUnits: 55 },
    }),
  });
  at(-1, 6);
  submitVersion({ versionId: latestVersion(pocket.id).id, actor: kabir });

  // ---- Campaign E: glassware draft blocked by the kit rules ----------------
  at(-1, 8);
  const glass = createCampaign({
    kitId: "kit_skycourier",
    title: "Courier Chai Glass",
    actor: kabir,
    content: content({
      productId: "glassware",
      layoutId: "wrap",
      design: { artworkAssetId: emblem.id, artworkScale: 0.8, baseColour: "clear", text: { line1: "Cutting chai express", line2: "", font: "display", colour: "vermilion", position: "below" } },
      copy: {
        title: "Courier Chai Glass",
        tagline: "A cutting-chai glass with the Cloud Post emblem.",
        story: "For the tea stall outside every campus.",
        audience: "Chai drinkers who also watch Sky Courier.",
        localAngle: "Cutting chai is the most local object we could think of.",
      },
      offer: { priceMinor: 54900, shippingMinor: 9900, thresholdUnits: 60, launchDate: dayIso(3), deadline: dayIso(40), territory: "IN", sizes: ["350 ml"], expectedUnits: 80 },
    }),
  });
  try {
    submitVersion({ versionId: latestVersion(glass.id).id, actor: kabir });
  } catch {
    // Expected: glassware isn't permitted by the kit. The blocked attempt is in the audit log.
  }
}

/** Seed only if the database is empty (first boot). */
export async function ensureSeeded(): Promise<void> {
  if (isEmpty()) await seedDemo();
}

export async function resetDemo(): Promise<void> {
  wipeDatabase();
  await seedDemo();
}

// ---------------------------------------------------------------------------
// The fan pulse: ~650 fans across India answered before (and during) the first
// campaigns. Deterministic, and independent of the order history's randomness.
// ---------------------------------------------------------------------------

const PULSE_CITIES: [string, number][] = [
  ["Delhi", 15], ["Mumbai", 12], ["Bengaluru", 12], ["Hyderabad", 8], ["Pune", 7], ["Kolkata", 7], ["Chennai", 6], ["Guwahati", 5],
  ["Chandigarh", 4], ["Shillong", 3], ["Patiala", 3], ["Jaipur", 3], ["Lucknow", 3], ["Ahmedabad", 3], ["Kochi", 3], ["Indore", 2], ["Bhopal", 2], ["Bhubaneswar", 2],
];
const METROS = new Set(["Delhi", "Mumbai", "Bengaluru", "Hyderabad", "Pune", "Chennai", "Kolkata"]);

function weighted<T>(rand: () => number, items: [T, number][]): T {
  const total = items.reduce((s, [, w]) => s + w, 0);
  let r = rand() * total;
  for (const [item, w] of items) if ((r -= w) < 0) return item;
  return items[items.length - 1][0];
}

async function seedPulse(owner: User) {
  void owner;
  const r = prng(72026);
  const WANT_P: Record<string, number> = { tshirt: 0.72, poster: 0.41, hoodie: 0.38, glassware: 0.27, stickers: 0.46, pin: 0.31, tote: 0.22, figure: 0.19 };
  for (let i = 0; i < 700; i++) {
    // Most answers arrive in the fortnight before the first campaign; the rest trickle in.
    const early = r() < 0.7;
    at(early ? -76 + r() * 19 : -55 + r() * 52, 0);
    const city = weighted(r, PULSE_CITIES.map(([c, w]) => [c, w] as [string, number]));
    const age = weighted(r, [[AGE_BANDS[0], 14], [AGE_BANDS[1], 52], [AGE_BANDS[2], 27], [AGE_BANDS[3], 7]]);
    let band = weighted(r, PRICE_BANDS.map((p, k) => [k, [5, 10, 19, 24, 18, 12, 8, 4][k]] as [number, number]));
    if (METROS.has(city) && r() < 0.2) band = Math.min(PRICE_BANDS.length - 1, band + 1);
    if ((age === AGE_BANDS[0] || age === AGE_BANDS[1]) && r() < 0.25) band = Math.max(0, band - 1);
    const wants = WANTS.map((w) => w.id).filter((w) => r() < WANT_P[w]);
    if (!wants.length) wants.push("tshirt");
    const south = city === "Chennai" ? "ta" : city === "Hyderabad" ? "te" : null;
    const language = south && r() < 0.35 ? south
      : ["Guwahati", "Shillong", "Kolkata", "Bhubaneswar"].includes(city) && r() < 0.3 ? weighted(r, [["en", 2], ["other", 1]])
      : weighted(r, LANGUAGES.map((l) => [l.id, { ja_en: 50, hi: 30, en: 12, ta: 3, te: 3, other: 2 }[l.id]] as [string, number]));
    const channel = weighted(r, WATCH_CHANNELS.map((c) => [c.id, { crunchyroll: 28, netflix: 22, youtube: 16, reels: 17, discord: 9, friends: 8 }[c.id]] as [string, number]));
    const first = FIRST[Math.floor(r() * FIRST.length)];
    const last = LAST[Math.floor(r() * LAST.length)];
    // Some pulse fans later buy under the same address; most are new to the shop.
    const email = r() < 0.45 ? `${first.toLowerCase()}.${last.toLowerCase()}@fan.example` : `${first.toLowerCase()}.${last.toLowerCase()}.${i}@pulse.example`;
    recordInterest({ kitId: "kit_skycourier", email, city, ageBand: age, priceMinor: PRICE_BANDS[band], wants, channel, language });
  }
}
