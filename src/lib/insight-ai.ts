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
import { pulseJa } from "./pulse-ja";

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

function offline(a: ReturnType<typeof audienceInsights>, out: "en" | "ja" = "en"): AudienceSummary {
  if (out === "ja") return offlineJa(a);
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

/** The computed summary in polite Japanese, for an IP owner reading the portal in Japanese. */
function offlineJa(a: ReturnType<typeof audienceInsights>): AudienceSummary {
  const gap = a.findings.find((f) => f.title.startsWith("Untapped"));
  const missing = a.wants.filter((w) => !w.inKit).slice(0, 2);
  const lower = [...a.priceCurve].reverse().find((p) => p.share >= 0.6);
  const lang = a.languages.find((l) => l.id !== "ja_en" && l.id !== "en");
  const moves = [
    gap && { title: "北東部でクリエイターを募集する", detail: `${gap.ja?.detail ?? gap.detail}独自のファンを持つ現地のクリエイターと組むことが、最も費用を抑えた参入方法です。` },
    lower && {
      title: `${formatINR(lower.priceMinor)}のTシャツを試す`,
      detail: `購入意向のあるファンの${Math.round(lower.share * 100)}%が${formatINR(lower.priceMinor)}を支払ってもよいと回答しています。現在のTシャツはこれより高い価格帯です。`,
    },
    missing.length && {
      title: `${missing.map((m) => pulseJa(m.id, m.label)).join("と")}をキットに加える`,
      detail: `${missing.map((m) => `${Math.round(m.share * 100)}%が${pulseJa(m.id, m.label)}を希望`).join("、")}しています。手頃な価格の商品は、学生の予算にも合います。`,
    },
    lang && {
      title: `${pulseJa(lang.id, lang.label)}のファン向けにクリエイターへ共有する`,
      detail: `${Math.round(lang.share * 100)}%が${pulseJa(lang.id, lang.label)}で視聴しています。その言語での印刷テキストや字幕は、より広く届きます。`,
    },
  ].filter(Boolean) as { title: string; detail: string }[];
  return {
    source: "offline",
    note: "AIキーが設定されていないため、Toriiが数値から算出した要約です。",
    headline: `${a.cities.length}都市の${a.total}人のファンからご要望が寄せられ、すでに${Math.round(a.conversion.rate * 100)}%が予約にご参加いただいています。`,
    moves: moves.slice(0, 3),
  };
}

export async function summariseAudience(input: { kitId: string; actor: User; lang?: "en" | "ja" }): Promise<AudienceSummary> {
  const kit = requireKit(input.kitId);
  requireAudienceView(input.actor, kit);
  const a = audienceInsights(kit.id);
  const ja = input.lang === "ja";
  if (!a.total) return { source: "offline", headline: ja ? "まだアンケートの回答はございません。" : "No pulse answers yet.", moves: [] };
  if (!aiAvailable()) return offline(a, input.lang);

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
        "Cite the numbers. Don't invent data that isn't in the facts.",
        ja
          ? "Write in natural, polite business Japanese (です・ます調, with appropriate keigo for a rights holder). Keep city names, product names and rupee amounts as given."
          : "Plain, warm English for a busy reader.",
      ].join("\n"),
      messages: [{ role: "user", content: JSON.stringify(facts) }],
      output_config: { effort: "low", format: betaZodOutputFormat(SummarySchema) },
    });
    if (response.stop_reason === "refusal" || !response.parsed_output)
      return { ...offline(a, input.lang), note: ja ? "AIで要約できなかったため、Toriiが算出いたしました。" : "The AI couldn’t summarise this, so Torii computed it instead." };
    return { source: "claude", model: response.model, headline: response.parsed_output.headline, moves: response.parsed_output.moves.slice(0, 3) };
  } catch (err) {
    if (err instanceof Anthropic.APIError || err instanceof Anthropic.APIConnectionError) {
      console.error("audience summary:", err.message);
      return { ...offline(a, input.lang), note: ja ? "AIサービスをご利用いただけなかったため、Toriiが要約を算出いたしました。" : "The AI service was unavailable, so Torii computed this summary instead." };
    }
    throw err;
  }
}
