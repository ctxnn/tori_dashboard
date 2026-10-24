// Optional brief assistant. Turns a creator's brief into two structured design
// directions that reference only the kit's approved assets and templates.
//
// - With ANTHROPIC_API_KEY set, Claude drafts the directions as schema-constrained
//   JSON (the schema's enums are built from this kit, so it can only name assets,
//   products and layouts that exist).
// - Without a key, a deterministic offline helper produces directions from templates.
//
// Either way the output is re-validated on the server and run through the same rule
// checks as a real proposal. Nothing is saved: the creator applies a direction to
// their draft, and a human still approves the final version.
import Anthropic from "@anthropic-ai/sdk";
import { betaZodOutputFormat } from "@anthropic-ai/sdk/helpers/beta/zod";
import { z } from "zod";
import { PRODUCTS, TEXT_COLOURS } from "./catalog";
import { ContentInputSchema, type ContentInput } from "./content";
import { HttpError, forbidden } from "./errors";
import { evaluate, latestVersion, requireCampaign } from "./domain/campaigns";
import { termsFor, type User } from "./domain/core";
import { assetsForVersion, latestKitVersion, requireKit } from "./domain/kits";
import type { CheckResult } from "./domain/rules";

export const AI_MODEL = "claude-opus-5-5";

export function aiAvailable(): boolean {
  return !!process.env.ANTHROPIC_API_KEY && process.env.TORII_AI !== "off";
}

export interface Direction {
  name: string;
  rationale: string;
  reviewNote: string;
  content: ContentInput;
  valid: boolean;
  problems: string[];
  checks: CheckResult[];
}

export interface AssistResult {
  source: "claude" | "offline";
  model?: string;
  note?: string;
  directions: Direction[];
}

interface KitContext {
  products: { productId: string; layouts: string[]; minPriceMinor: number; maxPriceMinor: number }[];
  assets: { id: string; code: string; name: string; description: string }[];
  prohibited: string[];
}

function directionSchema(kit: KitContext) {
  const productIds = kit.products.map((p) => p.productId) as [string, ...string[]];
  const layoutIds = [...new Set(kit.products.flatMap((p) => p.layouts))] as [string, ...string[]];
  const colours = [...new Set(kit.products.flatMap((p) => PRODUCTS[p.productId].baseColours.map((c) => c.id)))] as [string, ...string[]];
  return z.object({
    directions: z
      .array(
        z.object({
          name: z.string().describe("Two to four words naming the direction"),
          rationale: z.string().describe("One or two sentences: why this suits the audience in the brief"),
          reviewNote: z.string().describe("One sentence for the IP owner's reviewer: what is being asked for and how it stays within the kit"),
          productId: z.enum(productIds),
          layoutId: z.enum(layoutIds),
          artworkAssetId: z.enum(kit.assets.map((a) => a.id) as [string, ...string[]]),
          baseColour: z.enum(colours),
          textColour: z.enum(TEXT_COLOURS.map((c) => c.id) as [string, ...string[]]),
          font: z.enum(["display", "sans"]),
          textPosition: z.enum(["above", "below"]),
          line1: z.string().describe("Print text line 1, at most 28 characters"),
          line2: z.string().describe("Print text line 2, at most 40 characters; empty for pocket layouts"),
          title: z.string().describe("Campaign title, at most 80 characters"),
          tagline: z.string().describe("At most 120 characters"),
          story: z.string().describe("Two to four sentences for the fan page"),
          audience: z.string().describe("Who it is for, specifically"),
          localAngle: z.string().describe("What makes it locally relevant"),
          priceRupees: z.number().int().describe("Item price in whole rupees, inside the owner's band for the chosen product"),
        }),
      )
      .describe("Exactly two contrasting directions"),
  });
}

type Raw = z.infer<ReturnType<typeof directionSchema>>["directions"][number];

function toContent(raw: Raw, base: ContentInput): ContentInput {
  const product = PRODUCTS[raw.productId];
  return {
    ...base,
    productId: raw.productId,
    layoutId: raw.layoutId,
    design: {
      artworkAssetId: raw.artworkAssetId,
      artworkScale: base.design.artworkScale,
      baseColour: raw.baseColour,
      text: { line1: raw.line1, line2: raw.layoutId === "pocket" ? "" : raw.line2, font: raw.font, colour: raw.textColour, position: raw.textPosition },
    },
    copy: { title: raw.title, tagline: raw.tagline, story: raw.story, audience: raw.audience, localAngle: raw.localAngle },
    offer: {
      ...base.offer,
      priceMinor: Math.round(raw.priceRupees) * 100,
      sizes: base.offer.sizes.filter((s) => product?.sizes.includes(s)).length ? base.offer.sizes.filter((s) => product.sizes.includes(s)) : product?.sizes ?? base.offer.sizes,
    },
  };
}

// ---------------------------------------------------------------------------
// Offline helper: no network, deterministic, still useful for the demo.
// ---------------------------------------------------------------------------

function offline(brief: string, kit: KitContext, base: ContentInput): Raw[] {
  const b = brief.toLowerCase();
  const street = /street|bold|loud|oversize|graphic/.test(b);
  const minimal = /minimal|quiet|subtle|office|work|clean/.test(b);
  const college = /college|campus|hostel|student|fest/.test(b);
  const night = /night|exam|late|midnight/.test(b);
  const tee = kit.products.find((p) => p.productId === "tshirt") ?? kit.products[0];
  const pick = (re: RegExp) => kit.assets.find((a) => re.test(`${a.name} ${a.description}`.toLowerCase())) ?? kit.assets[0];
  const hero = night ? pick(/night|moon/) : pick(/kite|key visual/);
  const small = pick(/seal|emblem|small/);
  const audience = college ? "College students who already wear fandom to class and buy at fests" : "Fans who want something they can wear every day";
  const price = (p: typeof tee) => Math.round(Math.min(Math.max(69900, p.minPriceMinor), p.maxPriceMinor) / 100);
  const pocketOk = tee.layouts.includes("pocket");
  return [
    {
      name: street || !minimal ? "Bold centre drop" : "Clean centre print",
      rationale: `A large ${hero.name} print reads from across a campus quad — the statement piece for ${college ? "fest season" : "a first drop"}.`,
      reviewNote: `Uses ${hero.code} unaltered on a centre-print tee within the price band; print text is the creator's own line.`,
      productId: tee.productId,
      layoutId: tee.layouts.includes("centre") ? "centre" : tee.layouts[0],
      artworkAssetId: hero.id,
      baseColour: night ? "ink" : "ivory",
      textColour: night ? "ivory" : "ink",
      font: "display",
      textPosition: "below",
      line1: night ? "Raat ki delivery" : "Chitthi pahunchegi",
      line2: night ? "LATE NIGHT ROUTE" : "THE LETTER WILL ARRIVE",
      title: night ? "Late Route Tee" : "Courier Drop Tee",
      tagline: night ? "For the 2 a.m. study group." : "The courier, big and bold, for everyday wear.",
      story: `${base.copy.story || "A creator-led take on Sky Courier."} Printed centre-front so the artwork does the talking.`,
      audience,
      localAngle: "A Hinglish line that works as an in-joke, priced to stay under ₹800 with shipping.",
      priceRupees: price(tee),
    },
    {
      name: pocketOk ? "Quiet pocket mark" : "Alternate colourway",
      rationale: pocketOk ? `A small ${small.name} on the chest for fans who prefer understated merch they can wear to work.` : "Same layout in a softer colour for a second audience.",
      reviewNote: `Uses ${small.code} unaltered${pocketOk ? " on the pocket layout" : ""}; one short line of creator text.`,
      productId: tee.productId,
      layoutId: pocketOk ? "pocket" : tee.layouts[0],
      artworkAssetId: small.id,
      baseColour: "sage",
      textColour: "ink",
      font: "sans",
      textPosition: "below",
      line1: "COURIER CLUB",
      line2: "",
      title: "Courier Club Tee",
      tagline: "Only people who know, know.",
      story: `${base.copy.story || "A creator-led take on Sky Courier."} A small mark for everyday wear.`,
      audience: minimal ? "Working fans, 22–30, who buy fewer but better pieces" : audience,
      localAngle: "Understated enough for college and the office alike.",
      priceRupees: price(tee),
    },
  ];
}

// ---------------------------------------------------------------------------

function validate(raws: Raw[], base: ContentInput, kv: ReturnType<typeof latestKitVersion> & {}): Direction[] {
  return raws.slice(0, 2).map((raw) => {
    const content = toContent(raw, base);
    const problems: string[] = [];
    const parsed = ContentInputSchema.safeParse(content);
    if (!parsed.success) problems.push(...parsed.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`));
    const checks = parsed.success ? evaluate({ ...parsed.data, terms: termsFor(kv.rules.royaltyBps) }, kv, { approved: false, forSubmission: true }) : [];
    for (const c of checks) if (c.status === "fail") problems.push(c.message);
    return { name: raw.name, rationale: raw.rationale, reviewNote: raw.reviewNote, content, valid: problems.length === 0, problems, checks };
  });
}

export async function suggestDirections(input: { campaignId: string; brief: string; actor: User; current: unknown }): Promise<AssistResult> {
  const c = requireCampaign(input.campaignId);
  if (input.actor.role !== "creator" || input.actor.id !== c.creator_id) throw forbidden("Only the campaign's creator can use the assistant");
  const brief = input.brief.trim().slice(0, 1200);
  if (brief.length < 8) throw new HttpError(400, "Describe what you want in a sentence or two");
  const kit = requireKit(c.kit_id);
  const kv = latestKitVersion(kit.id)!;
  const parsedCurrent = ContentInputSchema.safeParse(input.current);
  const base: ContentInput = parsedCurrent.success ? parsedCurrent.data : (() => {
    const l = latestVersion(c.id).content;
    return { productId: l.productId, layoutId: l.layoutId, design: l.design, copy: l.copy, distribution: l.distribution, offer: l.offer };
  })();
  const ctx: KitContext = {
    products: kv.rules.products,
    assets: assetsForVersion(kv).map((a) => ({ id: a.id, code: a.code, name: a.name, description: a.description })),
    prohibited: kv.rules.prohibitedTerms,
  };

  if (!aiAvailable()) {
    return { source: "offline", note: "No AI key configured — these come from Torii’s built-in templates.", directions: validate(offline(brief, ctx, base), base, kv) };
  }

  const client = new Anthropic();
  const system = [
    "You help an Indian creator propose official merchandise for a licensed Japanese property.",
    "Work strictly inside the owner's kit. You can only choose from the products, layouts, assets and colours in the schema; artwork is used unaltered.",
    `Property: ${kit.property_name} (${kit.summary}). Territory: ${kv.rules.territories.join(", ")}.`,
    `Products and price bands (₹): ${ctx.products.map((p) => `${p.productId} [layouts: ${p.layouts.join(", ")}] ${p.minPriceMinor / 100}–${p.maxPriceMinor / 100}`).join("; ")}.`,
    `Approved assets: ${ctx.assets.map((a) => `${a.id} = ${a.code} "${a.name}" — ${a.description}`).join("; ")}.`,
    `Never use these words anywhere: ${ctx.prohibited.join(", ")}.`,
    "Keep print line 1 to 28 characters and line 2 to 40. The pocket layout prints one line only.",
    "Return two clearly different directions. Write in plain, warm English; Hinglish print lines are welcome when they suit the audience.",
  ].join("\n");

  try {
    const response = await client.beta.messages.parse({
      model: AI_MODEL,
      max_tokens: 4000,
      betas: ["server-side-fallback-2026-07-01"],
      fallbacks: "default",
      system,
      messages: [{ role: "user", content: `Creator's brief: ${brief}\n\nCurrent draft title: ${base.copy.title}` }],
      output_config: { effort: "low", format: betaZodOutputFormat(directionSchema(ctx)) },
    });
    if (response.stop_reason === "refusal" || !response.parsed_output) {
      return { source: "offline", note: "The AI assistant couldn’t help with that brief, so here are template suggestions instead.", directions: validate(offline(brief, ctx, base), base, kv) };
    }
    return { source: "claude", model: response.model, directions: validate(response.parsed_output.directions, base, kv) };
  } catch (err) {
    if (err instanceof Anthropic.AuthenticationError) {
      return { source: "offline", note: "The AI key was rejected, so these come from Torii’s built-in templates.", directions: validate(offline(brief, ctx, base), base, kv) };
    }
    if (err instanceof Anthropic.APIError || err instanceof Anthropic.APIConnectionError) {
      console.error("assist:", err.message);
      return { source: "offline", note: "The AI service was unavailable, so these come from Torii’s built-in templates.", directions: validate(offline(brief, ctx, base), base, kv) };
    }
    throw err;
  }
}
