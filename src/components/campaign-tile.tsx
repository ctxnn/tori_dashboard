import Link from "next/link";
import type { CampaignSummary } from "@/lib/domain/campaigns";
import { campaignProgress } from "@/lib/domain/orders";
import { SALES_STATUS, formatDate } from "@/lib/labels";
import { formatINR } from "@/lib/money";
import { productName } from "@/lib/catalog";
import { Badge, ProgressBar } from "./ui";
import { Preview } from "./preview";

/** A published campaign as a product proof: crop-marked preview, gate meter, facts. */
export function CampaignTile({ s, index }: { s: CampaignSummary; index?: number }) {
  const v = s.published!;
  const p = campaignProgress(s.campaign);
  const st = SALES_STATUS[s.campaign.sales_status];
  return (
    <Link
      href={`/c/${s.campaign.slug}`}
      className="group block h-full"
      aria-label={`${v.content.copy.title} by ${s.creator.name}, ${formatINR(v.content.offer.priceMinor)}, ${st.label}, ${p.paidUnits} of ${p.threshold} paid`}
    >
      <div className="flex h-full flex-col">
        <div className="relative overflow-hidden rounded-[var(--radius-card)] border border-sand bg-[#ECEBE5] transition-shadow group-hover:shadow-[var(--shadow-lift)]">
          <Preview svg={v.previewSvg} className="transition-transform duration-500 group-hover:scale-[1.025]" />
          <div className="absolute left-3 top-3"><Badge tone={st.tone}>{st.label}</Badge></div>
          {index !== undefined && <div className="label absolute right-4 top-4 text-ink/40">No. {String(index + 1).padStart(2, "0")}</div>}
        </div>
        <div className="flex flex-1 flex-col pt-4">
          <div className="flex items-baseline justify-between gap-3">
            <h3 className="text-[17px] font-semibold leading-snug tracking-[-0.02em] text-ink">{v.content.copy.title}</h3>
            <span className="font-mono text-sm text-ink">{formatINR(v.content.offer.priceMinor)}</span>
          </div>
          <p className="mt-0.5 text-[13px] text-moss">
            {s.creator.name} · {productName(v.content.productId)}
          </p>
          <div className="mt-auto pt-4">
            <ProgressBar value={p.paidUnits} max={p.threshold} />
            <div className="mt-2 flex justify-between font-mono text-[11px] text-moss">
              <span>
                <span className="text-ink">{p.paidUnits}</span>/{p.threshold} paid
              </span>
              <span>{p.deadlinePassed ? `closed ${formatDate(p.deadline, { day: "numeric", month: "short" })}` : `${p.daysLeft}d left`}</span>
            </div>
          </div>
        </div>
      </div>
    </Link>
  );
}
