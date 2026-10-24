// Explicit rule checks. Pure function: given a proposal and the exact kit version it
// targets, report every rule as pass / fail / warn / pending. These checks enforce
// declared rules only; they do not establish copyright ownership or replace human
// creative and commercial judgement.
import { PRODUCTS, TEXT_COLOURS, TERRITORIES, contrastRatio, productName, layoutName, swatch } from "../catalog";
import type { Content } from "../content";
import type { KitRules } from "../kit-rules";
import { formatINR } from "../money";

export type CheckStatus = "pass" | "fail" | "warn" | "pending" | "skipped";

export interface CheckResult {
  id: string;
  label: string;
  status: CheckStatus;
  message: string;
  source: "kit" | "platform" | "approval";
}

export interface CheckContext {
  kitVersionNo: number;
  rules: KitRules;
  approvedAssets: { id: string; code: string; name: string }[];
  approverName: string;
  today: string;
  /** Whether the required approver has approved this exact content. */
  approved: boolean;
  /** Whether we're checking for submission (dates must be in the future). */
  forSubmission?: boolean;
}

function list(names: string[]): string {
  if (names.length <= 1) return names.join("");
  return `${names.slice(0, -1).join(", ")} and ${names[names.length - 1]}`;
}

function textFields(c: Content): [string, string][] {
  return [
    ["print text", `${c.design.text.line1} ${c.design.text.line2}`],
    ["title", c.copy.title],
    ["tagline", c.copy.tagline],
    ["story", c.copy.story],
  ];
}

export function runRuleChecks(c: Content, ctx: CheckContext): CheckResult[] {
  const { rules } = ctx;
  const kit = `Kit v${ctx.kitVersionNo}`;
  const out: CheckResult[] = [];
  const push = (r: CheckResult) => out.push(r);

  // 1. Product
  const productRule = rules.products.find((p) => p.productId === c.productId);
  const permittedNames = rules.products.map((p) => productName(p.productId));
  push(
    productRule
      ? { id: "product", label: "Permitted product", status: "pass", source: "kit", message: `${productName(c.productId)} is permitted by ${kit}.` }
      : {
          id: "product",
          label: "Permitted product",
          status: "fail",
          source: "kit",
          message: `${productName(c.productId)} isn't covered by this licence. ${kit} permits ${list(permittedNames)} only. Choose one of those, or ask the owner to add ${productName(c.productId).toLowerCase()} to a future kit version.`,
        },
  );

  // 2. Layout
  if (!productRule) {
    push({ id: "layout", label: "Permitted layout", status: "skipped", source: "kit", message: "Not checked because the product isn't permitted." });
  } else {
    const ok = productRule.layouts.includes(c.layoutId);
    push({
      id: "layout",
      label: "Permitted layout",
      status: ok ? "pass" : "fail",
      source: "kit",
      message: ok
        ? `${layoutName(c.productId, c.layoutId)} is an approved layout.`
        : `${layoutName(c.productId, c.layoutId)} isn't approved for ${productName(c.productId)}. Approved: ${list(productRule.layouts.map((l) => layoutName(c.productId, l)))}.`,
    });
  }

  // 3. Artwork
  const asset = ctx.approvedAssets.find((a) => a.id === c.design.artworkAssetId);
  push({
    id: "artwork",
    label: "Approved artwork",
    status: asset ? "pass" : "fail",
    source: "kit",
    message: asset
      ? `${asset.code} “${asset.name}” is in ${kit}'s approved asset list.`
      : `The selected artwork isn't in ${kit}'s approved asset list. Only supplied kit assets can be used.`,
  });

  // 4. Artwork treatment
  const { min, max } = rules.artworkScale;
  const scale = c.design.artworkScale;
  const scaleOk = scale >= min - 1e-9 && scale <= max + 1e-9;
  push({
    id: "artwork_scale",
    label: "Artwork shown as supplied",
    status: scaleOk ? "pass" : "fail",
    source: "kit",
    message: scaleOk
      ? `Artwork is unaltered and shown at ${Math.round(scale * 100)}% (allowed ${Math.round(min * 100)}–${Math.round(max * 100)}%).`
      : `Artwork is shown at ${Math.round(scale * 100)}%; the kit allows ${Math.round(min * 100)}–${Math.round(max * 100)}%.`,
  });

  // 5. Territory
  const terrOk = rules.territories.includes(c.offer.territory);
  push({
    id: "territory",
    label: "Territory",
    status: terrOk ? "pass" : "fail",
    source: "kit",
    message: terrOk
      ? `Selling in ${TERRITORIES[c.offer.territory] ?? c.offer.territory} is permitted.`
      : `${TERRITORIES[c.offer.territory] ?? c.offer.territory} isn't a licensed territory. Permitted: ${list(rules.territories.map((t) => TERRITORIES[t] ?? t))}.`,
  });

  // 6. Campaign dates
  const dateProblems: string[] = [];
  if (c.offer.launchDate < rules.window.start) dateProblems.push(`launch (${c.offer.launchDate}) is before the licence window opens on ${rules.window.start}`);
  if (c.offer.deadline > rules.window.end) dateProblems.push(`deadline (${c.offer.deadline}) is after the licence window closes on ${rules.window.end}`);
  if (c.offer.deadline < c.offer.launchDate) dateProblems.push("deadline is before the launch date");
  push({
    id: "dates",
    label: "Campaign dates",
    status: dateProblems.length ? "fail" : "pass",
    source: "kit",
    message: dateProblems.length
      ? `The ${dateProblems.join("; and the ")}.`
      : `Runs ${c.offer.launchDate} → ${c.offer.deadline}, inside the licence window (${rules.window.start} → ${rules.window.end}).`,
  });
  if (ctx.forSubmission && c.offer.deadline < ctx.today) {
    push({ id: "deadline_future", label: "Deadline still ahead", status: "fail", source: "platform", message: `The preorder deadline (${c.offer.deadline}) has already passed.` });
  }

  // 7. Price band
  if (productRule) {
    const p = c.offer.priceMinor;
    const ok = p >= productRule.minPriceMinor && p <= productRule.maxPriceMinor;
    push({
      id: "price",
      label: "Price within owner's band",
      status: ok ? "pass" : "fail",
      source: "kit",
      message: ok
        ? `${formatINR(p)} is within ${formatINR(productRule.minPriceMinor)}–${formatINR(productRule.maxPriceMinor)}.`
        : `${formatINR(p)} is outside the owner's band of ${formatINR(productRule.minPriceMinor)}–${formatINR(productRule.maxPriceMinor)} for ${productName(c.productId)}.`,
    });
  }

  // 8. Prohibited terms
  const hits: string[] = [];
  for (const term of rules.prohibitedTerms) {
    const re = new RegExp(`(^|[^\\p{L}\\p{N}])${term.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}($|[^\\p{L}\\p{N}])`, "iu");
    for (const [field, text] of textFields(c)) if (re.test(text)) hits.push(`“${term}” in ${field}`);
  }
  push({
    id: "terms",
    label: "Wording",
    status: hits.length ? "fail" : "pass",
    source: "kit",
    message: hits.length ? `The kit doesn't allow ${list(hits)}.` : "No wording the owner has ruled out.",
  });

  // 9. Template integrity (platform)
  const product = PRODUCTS[c.productId];
  if (product) {
    const base = swatch(product.baseColours, c.design.baseColour);
    const ink = swatch(TEXT_COLOURS, c.design.text.colour);
    const badSizes = c.offer.sizes.filter((s) => !product.sizes.includes(s));
    const ok = !!base && !!ink && badSizes.length === 0;
    push({
      id: "template",
      label: "Template options",
      status: ok ? "pass" : "fail",
      source: "platform",
      message: ok ? "Colours and sizes match the product template." : "Some colour or size options don't exist for this product template.",
    });
    if (base && ink && contrastRatio(base.hex, ink.hex) < 2.2 && (c.design.text.line1 || c.design.text.line2)) {
      push({ id: "legibility", label: "Print legibility", status: "warn", source: "platform", message: `${ink.name} text on ${base.name} has low contrast and may be hard to read.` });
    }
    const layout = product.layouts.find((l) => l.id === c.layoutId);
    if (layout?.textLines === 1 && c.design.text.line2.trim()) {
      push({ id: "unused_text", label: "Unused text", status: "warn", source: "platform", message: `${layout.name} prints one line only; line 2 won't appear on the product.` });
    }
  }

  // 10. Demand sanity (advisory)
  if (c.offer.expectedUnits < c.offer.thresholdUnits) {
    push({
      id: "demand",
      label: "Demand vs threshold",
      status: "warn",
      source: "platform",
      message: `Your own estimate (${c.offer.expectedUnits} units) is below the production threshold (${c.offer.thresholdUnits}).`,
    });
  }

  // 11. Human approval
  push({
    id: "approval",
    label: "Required approval",
    status: ctx.approved ? "pass" : "pending",
    source: "approval",
    message: ctx.approved
      ? `Approved by ${ctx.approverName} for this exact version.`
      : `Needs approval from ${ctx.approverName} before it can be published.`,
  });

  return out;
}

export function hasBlockingFailure(checks: CheckResult[]): boolean {
  return checks.some((c) => c.status === "fail");
}

export function summariseFailures(checks: CheckResult[]): string {
  const fails = checks.filter((c) => c.status === "fail");
  if (!fails.length) return "All rule checks passed.";
  return fails.length === 1 ? fails[0].message : `${fails.length} rule checks failed: ${fails.map((f) => f.label.toLowerCase()).join(", ")}.`;
}
