// Optional audience summary. Turns the aggregated pulse into three next moves for
// an IP owner. Like the brief assistant:
//
// - With ANTHROPIC_API_KEY set, Claude writes the summary as schema-constrained JSON
//   from the aggregates only (no emails or individual answers are sent).
// - Without a key, a deterministic summary is built from the computed findings.
import Anthropic from "@anthropic-ai/sdk";
import { betaZodOutputFormat } from "@anthropic-ai/sdk/helpers/beta/zod";
import { z } from "zod";
import { AI_MODEL, aiAvailable } from "./assist";
import { formatINR } from "./money";
import { audienceInsights, requireAudienceView } from "./domain/audience";
import { requireKit } from "./domain/kits";
import type { User } from "./domain/core";

export interface AudienceSummary {
  source: "claude" | "offline";
  model?: string;
  note?: string;
  headline: string;
  moves: { title: string; detail: string }[];
}

const SummarySchema = z.object({
  headline: z.string().describe("One sentence, at most 140 characters: the single most useful thing the owner should know"),
  moves: z
    .array(
      z.object({
        title: z.string().describe("Three to seven words, an action"),
        detail: z.string().describe("One or two sentences citing the specific numbers that justify it"),
      }),
    )
    .describe("Exactly three concrete next moves, most valuable first"),
});

function offline(a: ReturnType<typeof audienceInsights>): AudienceSummary {
  const gap = a.findings.find((f) => f.title.startsWith("Untapped"));
  const missing = a.wants.filter((w) => !w.inKit).slice(0, 2);
  // The highest price that still reaches most interested fans.
  const lower = [...a.priceCurve].reverse().find((p) => p.share >= 0.6);
  const lang = a.languages.find((l) => l.id !== "ja_en" && l.id !== "en");
  const moves = [
    gap && { title: "Recruit a creator in the Northeast", detail: `${gap.detail} A local creator with their own audience is the cheapest way in.` },
    lower && { title: `Test a ${formatINR(lower.priceMinor)} tee`, detail: `${Math.round(lower.share * 100)}% of interested fans would pay ${formatINR(lower.priceMinor)}; current tees sit higher.` },
    missing.length && { title: `Add ${missing.map((m) => m.label.toLowerCase()).join(" and ")} to the kit`, detail: `${missing.map((m) => `${Math.round(m.share * 100)}% asked for ${m.label.toLowerCase()}s`).join(", ")}. Low-price items also suit student budgets.` },
    lang && { title: `Brief creators on ${lang.label.toLowerCase()} fans`, detail: `${Math.round(lang.share * 100)}% watch in ${lang.label}. Print lines and captions in their language travel further.` },
  ].filter(Boolean) as { title: string; detail: string }[];
  return {
    source: "offline",
    note: "No AI key configured — this summary is computed from the numbers by Torii.",
    headline: `${a.total} fans in ${a.cities.length} cities told you what they want — ${Math.round(a.conversion.rate * 100)}% have already backed a run.`,
    moves: moves.slice(0, 3),
  };
}

export async function summariseAudience(input: { kitId: string; actor: User }): Promise<AudienceSummary> {
  const kit = requireKit(input.kitId);
  requireAudienceView(input.actor, kit);
  const a = audienceInsights(kit.id);
  if (!a.total) return { source: "offline", headline: "No pulse answers yet.", moves: [] };
  if (!aiAvailable()) return offline(a);

  const facts = {
    property: kit.property_name,
    totalFans: a.total,
    cities: a.cities.map((c) => ({ city: c.city, region: c.region, interested: c.interest, paidBackers: c.backers })),
    medianTeePrice: a.medianPriceMinor && formatINR(a.medianPriceMinor),
    reachByPrice: a.priceCurve.map((p) => ({ price: formatINR(p.priceMinor), share: Math.round(p.share * 100) })),
    currentTees: a.teeCampaigns.map((t) => ({ title: t.title, price: formatINR(t.priceMinor), reach: Math.round(t.reach * 100) })),
    wants: a.wants.map((w) => ({ item: w.label, share: Math.round(w.share * 100), allowedByKit: w.inKit })),
    languages: a.languages.map((l) => ({ language: l.label, share: Math.round(l.share * 100) })),
    channels: a.channels.map((c) => ({ channel: c.label, share: Math.round(c.share * 100) })),
    ages: a.ages.map((x) => ({ age: x.label, share: Math.round(x.share * 100) })),
    pulseToPaidConversion: Math.round(a.conversion.rate * 100),
  };

  try {
    const client = new Anthropic();
    const response = await client.beta.messages.parse({
      model: AI_MODEL,
      max_tokens: 2000,
      betas: ["server-side-fallback-2026-07-01"],
      fallbacks: "default",
      system: [
        "You advise a Japanese IP owner's licensing team on official merchandise collaborations with Indian creators.",
        "You get aggregated answers from a fan pulse (percentages are shares of all respondents) and what fans actually paid for.",
        "Recommend three concrete, specific next moves the owner can take within the existing workflow: which regions to recruit creators in, price points to test, products to add to the asset kit, how to localise.",
        "Cite the numbers. Don't invent data that isn't in the facts. Plain, warm English for a busy reader.",
      ].join("\n"),
      messages: [{ role: "user", content: JSON.stringify(facts) }],
      output_config: { effort: "low", format: betaZodOutputFormat(SummarySchema) },
    });
    if (response.stop_reason === "refusal" || !response.parsed_output) return { ...offline(a), note: "The AI couldn’t summarise this, so Torii computed it instead." };
    return { source: "claude", model: response.model, headline: response.parsed_output.headline, moves: response.parsed_output.moves.slice(0, 3) };
  } catch (err) {
    if (err instanceof Anthropic.APIError || err instanceof Anthropic.APIConnectionError) {
      console.error("audience summary:", err.message);
      return { ...offline(a), note: "The AI service was unavailable, so Torii computed this summary instead." };
    }
    throw err;
  }
}
