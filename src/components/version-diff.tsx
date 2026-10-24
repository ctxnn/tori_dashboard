import { CHANNELS, PRODUCTS, TEXT_COLOURS, TERRITORIES, layoutName, productName } from "@/lib/catalog";
import type { FieldChange } from "@/lib/domain/campaigns";
import { bpsToPercent, formatINR } from "@/lib/money";
import { cx } from "./ui";

type Lookups = { assets: Record<string, string>; kitVersions: Record<string, string>; productId: string };

export function formatField(path: string, value: unknown, l: Lookups): string {
  if (value === undefined || value === null || value === "") return "—";
  switch (path) {
    case "productId":
      return productName(String(value));
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
      return value === "display" ? "Serif display" : "Clean sans";
    case "offer.priceMinor":
    case "offer.shippingMinor":
      return formatINR(Number(value));
    case "offer.territory":
      return TERRITORIES[String(value)] ?? String(value);
    case "offer.sizes":
      return (value as string[]).join(", ");
    case "offer.thresholdUnits":
    case "offer.expectedUnits":
      return `${value} units`;
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

export function VersionDiff({ changes, lookups, beforeLabel, afterLabel }: { changes: FieldChange[]; lookups: Lookups; beforeLabel: string; afterLabel: string }) {
  if (!changes.length) return <p className="text-sm text-moss">No differences in proposal content.</p>;
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[520px] text-left text-sm">
        <thead>
          <tr className="border-b border-sand text-xs uppercase tracking-wider text-moss">
            <th className="py-2 pr-3 font-medium">Field</th>
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
                  {c.label}
                  {MATERIAL_GROUPS[c.path] && <span className="ml-1.5 rounded bg-vermilion-soft px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-vermilion-2">Creative</span>}
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
