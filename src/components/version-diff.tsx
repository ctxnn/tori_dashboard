import { CHANNELS, PRODUCTS, TEXT_COLOURS, TERRITORIES, TERRITORIES_JA, layoutName, productName, productNameJa } from "@/lib/catalog";
import { makeT, type T } from "@/lib/i18n-shared";
import type { FieldChange } from "@/lib/domain/campaigns";
import { bpsToPercent, formatINR } from "@/lib/money";
import { cx } from "./ui";

type Lookups = { assets: Record<string, string>; kitVersions: Record<string, string>; productId: string; ja?: boolean };

const FIELD_JA: Record<string, string> = {
  productId: "商品", layoutId: "レイアウト", "design.artworkAssetId": "素材", "design.artworkScale": "素材の表示サイズ", "design.baseColour": "生地の色",
  "design.text.line1": "印刷テキスト（1行目）", "design.text.line2": "印刷テキスト（2行目）", "design.text.font": "書体", "design.text.colour": "文字の色", "design.text.position": "文字の位置",
  "copy.title": "キャンペーン名", "copy.tagline": "キャッチコピー", "copy.story": "紹介文", "copy.audience": "想定する読者", "copy.localAngle": "地域ならではの切り口",
  "distribution.channels": "販売チャネル", "distribution.launchMoment": "発売のタイミング", "distribution.creatorCommitment": "クリエイターの取り組み",
  "offer.priceMinor": "商品価格", "offer.shippingMinor": "送料", "offer.thresholdUnits": "生産条件", "offer.launchDate": "開始日", "offer.deadline": "予約締切日",
  "offer.territory": "販売地域", "offer.sizes": "サイズ", "offer.expectedUnits": "クリエイターの需要見込み", "terms.royaltyBps": "ライセンス料率", "terms.creatorBps": "クリエイター報酬",
  "terms.platformBps": "Torii手数料", kitVersion: "キットのバージョン",
};

export function formatField(path: string, value: unknown, l: Lookups): string {
  if (value === undefined || value === null || value === "") return "—";
  switch (path) {
    case "productId":
      return l.ja ? productNameJa(String(value)) : productName(String(value));
    case "layoutId":
      return layoutName(l.productId, String(value));
    case "design.artworkAssetId":
      return l.assets[String(value)] ?? String(value);
    case "design.artworkScale":
      return `${Math.round(Number(value) * 100)}%`;
    case "design.baseColour":
      return Object.values(PRODUCTS).flatMap((p) => p.baseColours).find((s) => s.id === value)?.name ?? String(value);
    case "design.text.colour":
      return TEXT_COLOURS.find((s) => s.id === value)?.name ?? String(value);
    case "design.text.font":
      return value === "display" ? (l.ja ? "明朝系ディスプレイ" : "Serif display") : l.ja ? "ゴシック体" : "Clean sans";
    case "offer.priceMinor":
    case "offer.shippingMinor":
      return formatINR(Number(value));
    case "offer.territory":
      return (l.ja ? TERRITORIES_JA[String(value)] : undefined) ?? TERRITORIES[String(value)] ?? String(value);
    case "offer.sizes":
      return (value as string[]).join(", ");
    case "offer.thresholdUnits":
    case "offer.expectedUnits":
      return l.ja ? `${value}点` : `${value} units`;
    case "terms.royaltyBps":
    case "terms.creatorBps":
    case "terms.platformBps":
      return bpsToPercent(Number(value));
    case "distribution.channels":
      return (value as { id: string; plannedReach: number }[])
        .map((c) => `${CHANNELS.find((x) => x.id === c.id)?.label ?? c.id} (${c.plannedReach.toLocaleString("en-IN")})`)
        .join(", ") || "—";
    case "kitVersion":
      return l.kitVersions[String(value)] ?? String(value);
    default:
      return String(value);
  }
}

const MATERIAL_GROUPS: Record<string, string> = {
  productId: "Creative", layoutId: "Creative", "design.artworkAssetId": "Creative", "design.artworkScale": "Creative", "design.baseColour": "Creative",
  "design.text.line1": "Creative", "design.text.line2": "Creative", "design.text.font": "Creative", "design.text.colour": "Creative", "design.text.position": "Creative",
};

export function VersionDiff({ changes, lookups: lk, beforeLabel, afterLabel, t = makeT("en") }: { changes: FieldChange[]; lookups: Lookups; beforeLabel: string; afterLabel: string; t?: T }) {
  const lookups = { ...lk, ja: t.ja };
  if (!changes.length) return <p className="text-sm text-moss">{t("No differences in proposal content.", "企画内容に差分はございません。")}</p>;
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[520px] text-left text-sm">
        <thead>
          <tr className="border-b border-sand text-xs uppercase tracking-wider text-moss">
            <th className="py-2 pr-3 font-medium">{t("Field", "項目")}</th>
            <th className="py-2 pr-3 font-medium">{beforeLabel}</th>
            <th className="py-2 font-medium">{afterLabel}</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-sand">
          {changes.map((c) => {
            const long = typeof c.after === "string" && c.after.length > 60;
            return (
              <tr key={c.path} className="align-top">
                <th scope="row" className="py-2.5 pr-3 font-medium text-ink">
                  {t(c.label, FIELD_JA[c.path] ?? c.label)}
                  {MATERIAL_GROUPS[c.path] && <span className="ml-1.5 rounded bg-vermilion-soft px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-vermilion-2">{t("Creative", "デザイン")}</span>}
                </th>
                <td className={cx("py-2.5 pr-3 text-moss", long ? "max-w-xs" : "")}>
                  <del className="decoration-fail/50">{formatField(c.path, c.before, lookups)}</del>
                </td>
                <td className={cx("py-2.5 text-ink", long ? "max-w-xs" : "")}>
                  <ins className="rounded bg-ok-soft/70 px-1 no-underline">{formatField(c.path, c.after, lookups)}</ins>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
