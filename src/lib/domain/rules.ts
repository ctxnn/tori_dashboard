// Explicit rule checks. Pure function: given a proposal and the exact kit version it
// targets, report every rule as pass / fail / warn / pending. These checks enforce
// declared rules only; they do not establish copyright ownership or replace human
// creative and commercial judgement.
import { PRODUCTS, TEXT_COLOURS, TERRITORIES, TERRITORIES_JA, contrastRatio, productName, productNameJa, layoutName, swatch } from "../catalog";
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
  /** The same result in Japanese, for the IP owner's view. Absent on checks recorded before it existed. */
  ja?: { label: string; message: string };
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

function listJa(names: string[]): string {
  return names.join("、");
}

const FIELD_JA: Record<string, string> = { "print text": "印刷テキスト", title: "タイトル", tagline: "キャッチコピー", story: "紹介文" };

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
  const kitJa = `キット第${ctx.kitVersionNo}版`;
  const pj = (id: string) => productNameJa(id);
  const tj = (t: string) => TERRITORIES_JA[t] ?? TERRITORIES[t] ?? t;
  const out: CheckResult[] = [];
  const push = (r: CheckResult) => out.push(r);

  // 1. Product
  const productRule = rules.products.find((p) => p.productId === c.productId);
  const permittedNames = rules.products.map((p) => productName(p.productId));
  push(
    productRule
      ? { id: "product", label: "Permitted product", status: "pass", source: "kit", message: `${productName(c.productId)} is permitted by ${kit}.`, ja: { label: "許諾された商品", message: `${pj(c.productId)}は${kitJa}で許諾されています。` } }
      : {
          id: "product",
          label: "Permitted product",
          status: "fail",
          source: "kit",
          message: `${productName(c.productId)} isn't covered by this licence. ${kit} permits ${list(permittedNames)} only. Choose one of those, or ask the owner to add ${productName(c.productId).toLowerCase()} to a future kit version.`,
          ja: { label: "許諾された商品", message: `${pj(c.productId)}は本ライセンスの対象外です。${kitJa}で許諾されているのは${listJa(rules.products.map((x) => pj(x.productId)))}のみです。` },
        },
  );

  // 2. Layout
  if (!productRule) {
    push({ id: "layout", label: "Permitted layout", status: "skipped", source: "kit", message: "Not checked because the product isn't permitted.", ja: { label: "許諾されたレイアウト", message: "商品が許諾対象外のため、確認しておりません。" } });
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
      ja: {
        label: "許諾されたレイアウト",
        message: ok
          ? `「${layoutName(c.productId, c.layoutId)}」は承認済みのレイアウトです。`
          : `「${layoutName(c.productId, c.layoutId)}」は${pj(c.productId)}では承認されていません。承認済み：${listJa(productRule.layouts.map((l) => layoutName(c.productId, l)))}。`,
      },
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
    ja: {
      label: "承認済みの素材",
      message: asset
        ? `${asset.code}「${asset.name}」は${kitJa}の承認済み素材です。`
        : `選択された素材は${kitJa}の承認済み素材に含まれていません。キットでご提供いただいた素材のみ使用できます。`,
    },
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
    ja: {
      label: "素材は提供されたまま使用",
      message: scaleOk
        ? `素材は改変されず、${Math.round(scale * 100)}%で使用されています（許容範囲 ${Math.round(min * 100)}〜${Math.round(max * 100)}%）。`
        : `素材が${Math.round(scale * 100)}%で使用されています。キットの許容範囲は${Math.round(min * 100)}〜${Math.round(max * 100)}%です。`,
    },
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
    ja: {
      label: "販売地域",
      message: terrOk
        ? `${tj(c.offer.territory)}での販売は許諾されています。`
        : `${tj(c.offer.territory)}は許諾地域ではありません。許諾地域：${listJa(rules.territories.map(tj))}。`,
    },
  });

  // 6. Campaign dates
  const dateProblems: string[] = [];
  const dateProblemsJa: string[] = [];
  if (c.offer.launchDate < rules.window.start) {
    dateProblems.push(`launch (${c.offer.launchDate}) is before the licence window opens on ${rules.window.start}`);
    dateProblemsJa.push(`開始日（${c.offer.launchDate}）がライセンス期間の開始（${rules.window.start}）より前です`);
  }
  if (c.offer.deadline > rules.window.end) {
    dateProblems.push(`deadline (${c.offer.deadline}) is after the licence window closes on ${rules.window.end}`);
    dateProblemsJa.push(`締切日（${c.offer.deadline}）がライセンス期間の終了（${rules.window.end}）より後です`);
  }
  if (c.offer.deadline < c.offer.launchDate) {
    dateProblems.push("deadline is before the launch date");
    dateProblemsJa.push("締切日が開始日より前です");
  }
  push({
    id: "dates",
    label: "Campaign dates",
    status: dateProblems.length ? "fail" : "pass",
    source: "kit",
    message: dateProblems.length
      ? `The ${dateProblems.join("; and the ")}.`
      : `Runs ${c.offer.launchDate} → ${c.offer.deadline}, inside the licence window (${rules.window.start} → ${rules.window.end}).`,
    ja: {
      label: "キャンペーン期間",
      message: dateProblemsJa.length
        ? `${dateProblemsJa.join("。また、")}。`
        : `${c.offer.launchDate}〜${c.offer.deadline}の期間で、ライセンス期間（${rules.window.start}〜${rules.window.end}）内です。`,
    },
  });
  if (ctx.forSubmission && c.offer.deadline < ctx.today) {
    push({ id: "deadline_future", label: "Deadline still ahead", status: "fail", source: "platform", message: `The preorder deadline (${c.offer.deadline}) has already passed.`, ja: { label: "締切日が未来であること", message: `予約の締切日（${c.offer.deadline}）はすでに過ぎています。` } });
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
      ja: {
        label: "権利者さまの価格帯内",
        message: ok
          ? `${formatINR(p)}は${formatINR(productRule.minPriceMinor)}〜${formatINR(productRule.maxPriceMinor)}の範囲内です。`
          : `${formatINR(p)}は、${pj(c.productId)}の価格帯（${formatINR(productRule.minPriceMinor)}〜${formatINR(productRule.maxPriceMinor)}）の範囲外です。`,
      },
    });
  }

  // 8. Prohibited terms
  const hits: string[] = [];
  const hitsJa: string[] = [];
  for (const term of rules.prohibitedTerms) {
    const re = new RegExp(`(^|[^\\p{L}\\p{N}])${term.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}($|[^\\p{L}\\p{N}])`, "iu");
    for (const [field, text] of textFields(c))
      if (re.test(text)) {
        hits.push(`“${term}” in ${field}`);
        hitsJa.push(`${FIELD_JA[field] ?? field}の「${term}」`);
      }
  }
  push({
    id: "terms",
    label: "Wording",
    status: hits.length ? "fail" : "pass",
    source: "kit",
    message: hits.length ? `The kit doesn't allow ${list(hits)}.` : "No wording the owner has ruled out.",
    ja: { label: "文言", message: hitsJa.length ? `キットで使用が認められていない表現があります：${listJa(hitsJa)}。` : "権利者さまが禁止された表現は含まれていません。" },
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
      ja: { label: "テンプレートの選択肢", message: ok ? "色とサイズは商品テンプレートと一致しています。" : "一部の色またはサイズが、この商品テンプレートに存在しません。" },
    });
    if (base && ink && contrastRatio(base.hex, ink.hex) < 2.2 && (c.design.text.line1 || c.design.text.line2)) {
      push({ id: "legibility", label: "Print legibility", status: "warn", source: "platform", message: `${ink.name} text on ${base.name} has low contrast and may be hard to read.`, ja: { label: "印刷の視認性", message: `${base.name}の上の${ink.name}の文字はコントラストが低く、読みにくい可能性があります。` } });
    }
    const layout = product.layouts.find((l) => l.id === c.layoutId);
    if (layout?.textLines === 1 && c.design.text.line2.trim()) {
      push({ id: "unused_text", label: "Unused text", status: "warn", source: "platform", message: `${layout.name} prints one line only; line 2 won't appear on the product.`, ja: { label: "使われないテキスト", message: `「${layout.name}」は1行のみ印刷されるため、2行目は商品に表示されません。` } });
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
      ja: { label: "需要と生産条件", message: `クリエイターの見込み（${c.offer.expectedUnits}点）が、生産条件（${c.offer.thresholdUnits}点）を下回っています。` },
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
    ja: {
      label: "必要な承認",
      message: ctx.approved ? `${ctx.approverName}様より、このバージョンについてご承認いただいています。` : `公開には${ctx.approverName}様のご承認が必要です。`,
    },
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
