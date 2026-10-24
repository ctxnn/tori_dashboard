import { PRODUCTS, TERRITORIES, layoutName } from "@/lib/catalog";
import type { Asset, KitVersion } from "@/lib/domain/kits";
import { getUser } from "@/lib/domain/core";
import { formatDate } from "@/lib/labels";
import { bpsToPercent, formatINR } from "@/lib/money";
import { Badge } from "./ui";

export function KitRulesSummary({ kv }: { kv: KitVersion }) {
  const r = kv.rules;
  const approver = getUser(r.requiredApproverId);
  const rows: [string, React.ReactNode][] = [
    [
      "Permitted products",
      <ul key="p" className="space-y-1">
        {r.products.map((p) => (
          <li key={p.productId}>
            <span className="font-medium">{PRODUCTS[p.productId]?.name ?? p.productId}</span>
            <span className="text-moss"> · {p.layouts.map((l) => layoutName(p.productId, l)).join(", ")} · {formatINR(p.minPriceMinor)}–{formatINR(p.maxPriceMinor)}</span>
          </li>
        ))}
      </ul>,
    ],
    ["Territory", r.territories.map((t) => TERRITORIES[t] ?? t).join(", ")],
    ["Licence window", `${formatDate(r.window.start)} → ${formatDate(r.window.end)}`],
    ["Required approver", approver ? `${approver.name}, ${approver.title}` : "—"],
    ["Artwork size", `${Math.round(r.artworkScale.min * 100)}–${Math.round(r.artworkScale.max * 100)}% of the template’s print area, unaltered`],
    [
      "Wording not allowed",
      <span key="t" className="flex flex-wrap gap-1">
        {r.prohibitedTerms.map((t) => (
          <Badge key={t}>{t}</Badge>
        ))}
      </span>,
    ],
    ["Licensor royalty", `${bpsToPercent(r.royaltyBps)} of net item sales on delivered units`],
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

export function AssetGrid({ assets, approvedIds, showFiles = true }: { assets: Asset[]; approvedIds?: string[]; showFiles?: boolean }) {
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
                {approvedIds && <Badge tone={approved ? "ok" : "neutral"}>{approved ? "In kit" : "Library"}</Badge>}
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
