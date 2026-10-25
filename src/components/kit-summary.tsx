import { PRODUCTS, TERRITORIES, TERRITORIES_JA, layoutName, productNameJa } from "@/lib/catalog";
import { makeT, type T } from "@/lib/i18n-shared";
import type { Asset, KitVersion } from "@/lib/domain/kits";
import { getUser } from "@/lib/domain/core";
import { formatDate } from "@/lib/labels";
import { bpsToPercent, formatINR } from "@/lib/money";
import { Badge } from "./ui";

export function KitRulesSummary({ kv, t = makeT("en") }: { kv: KitVersion; t?: T }) {
  const r = kv.rules;
  const approver = getUser(r.requiredApproverId);
  const rows: [string, React.ReactNode][] = [
    [
      t("Permitted products", "許諾商品"),
      <ul key="p" className="space-y-1">
        {r.products.map((p) => (
          <li key={p.productId}>
            <span className="font-medium">{t(PRODUCTS[p.productId]?.name ?? p.productId, productNameJa(p.productId))}</span>
            <span className="text-moss"> · {p.layouts.map((l) => layoutName(p.productId, l)).join(", ")} · {formatINR(p.minPriceMinor)}–{formatINR(p.maxPriceMinor)}</span>
          </li>
        ))}
      </ul>,
    ],
    [t("Territory", "販売地域"), r.territories.map((x) => t(TERRITORIES[x] ?? x, TERRITORIES_JA[x] ?? x)).join(t(", ", "、"))],
    [t("Licence window", "ライセンス期間"), t(`${formatDate(r.window.start)} → ${formatDate(r.window.end)}`, `${t.date(r.window.start)} 〜 ${t.date(r.window.end)}`)],
    [t("Required approver", "ご承認者"), approver ? `${approver.name}, ${approver.title}` : "—"],
    [
      t("Artwork size", "素材のサイズ"),
      t(
        `${Math.round(r.artworkScale.min * 100)}–${Math.round(r.artworkScale.max * 100)}% of the template’s print area, unaltered`,
        `テンプレート印刷範囲の${Math.round(r.artworkScale.min * 100)}〜${Math.round(r.artworkScale.max * 100)}%（改変なし）`,
      ),
    ],
    [
      t("Wording not allowed", "使用できない表現"),
      <span key="t" className="flex flex-wrap gap-1">
        {r.prohibitedTerms.map((term) => (
          <Badge key={term}>{term}</Badge>
        ))}
      </span>,
    ],
    [t("Licensor royalty", "ライセンス料"), t(`${bpsToPercent(r.royaltyBps)} of net item sales on delivered units`, `お届けした商品の純売上の${bpsToPercent(r.royaltyBps)}`)],
  ];
  return (
    <dl className="divide-y divide-sand text-sm">
      {rows.map(([k, v]) => (
        <div key={k} className="grid gap-1 py-3 sm:grid-cols-[180px_1fr] sm:gap-4">
          <dt className="text-moss">{k}</dt>
          <dd className="text-ink">{v}</dd>
        </div>
      ))}
    </dl>
  );
}

export function AssetGrid({ assets, approvedIds, showFiles = true, t = makeT("en") }: { assets: Asset[]; approvedIds?: string[]; showFiles?: boolean; t?: T }) {
  return (
    <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
      {assets.map((a) => {
        const approved = !approvedIds || approvedIds.includes(a.id);
        return (
          <li key={a.id} className="overflow-hidden rounded-xl border border-sand bg-card">
            <div className="aspect-square bg-[repeating-conic-gradient(#efe8da_0_25%,#f8f4ec_0_50%)] bg-[length:16px_16px] p-4">
              {showFiles && (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={`/api/assets/${a.id}`} alt={a.name} className="h-full w-full object-contain" />
              )}
            </div>
            <div className="space-y-1 p-3">
              <div className="flex items-start justify-between gap-2">
                <span className="text-sm font-medium leading-tight">{a.name}</span>
                {approvedIds && <Badge tone={approved ? "ok" : "neutral"}>{approved ? t("In kit", "キットに収録") : t("Library", "ライブラリ")}</Badge>}
              </div>
              <div className="font-mono text-[11px] text-moss">{a.code} · {a.mime.replace("image/", "").toUpperCase()} · {Math.max(1, Math.round(a.byte_size / 1024))} KB</div>
              {a.description && <p className="text-xs leading-snug text-moss">{a.description}</p>}
            </div>
          </li>
        );
      })}
    </ul>
  );
}
