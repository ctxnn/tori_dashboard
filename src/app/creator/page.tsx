import Link from "next/link";
import { requirePageRole } from "@/lib/auth";
import { listCampaigns, summarise } from "@/lib/domain/campaigns";
import { listKits, latestKitVersion } from "@/lib/domain/kits";
import { campaignProgress } from "@/lib/domain/orders";
import { reviewsForCampaign } from "@/lib/domain/reviews";
import { REVIEW_STATUS, SALES_STATUS, formatDate } from "@/lib/labels";
import { productName } from "@/lib/catalog";
import { formatINR } from "@/lib/money";
import { Arrow, Badge, Card, EmptyState, PageHeader, ProgressBar } from "@/components/ui";
import { Preview } from "@/components/preview";
import { NewCampaignForm } from "./new-campaign-form";

export const metadata = { title: "Studio" };

export default async function CreatorHome() {
  const user = await requirePageRole("creator");
  const campaigns = listCampaigns({ creatorId: user.id }).map(summarise);
  const kits = listKits().map((k) => ({ id: k.id, name: k.property_name, owner: k.owner_org, version: latestKitVersion(k.id)?.versionNo ?? 0 }));
  const live = campaigns.filter((s) => s.campaign.sales_status === "live").length;
  const inReview = campaigns.filter((s) => s.latest.reviewStatus === "submitted").length;

  return (
    <div>
      <PageHeader
        eyebrow={`${user.org} · Creator studio`}
        stage={2}
        title={<>Hello, {user.name.split(" ")[0]}. <span className="font-serif font-normal italic text-moss">What are we making?</span></>}
        description="Shape a product for your audience from an owner’s authorised kit, get it approved, then test real demand with preorders."
        meta={[
          ["Campaigns", campaigns.length],
          ["In review", inReview],
          ["Taking preorders", live],
        ]}
      />
      <div className="grid gap-10 lg:grid-cols-[1fr_320px]">
        <section aria-labelledby="mine">
          <h2 id="mine" className="label mb-3 text-moss">Your campaigns</h2>
          {campaigns.length === 0 ? (
            <EmptyState title="No campaigns yet">Start one from the Sky Courier kit. Drafts stay private until they’re approved and published.</EmptyState>
          ) : (
            <ul className="divide-y divide-sand border-y border-sand">
              {campaigns.map((s) => {
                const review = REVIEW_STATUS[s.latest.reviewStatus];
                const sales = SALES_STATUS[s.campaign.sales_status];
                const p = s.published ? campaignProgress(s.campaign) : null;
                const lastReview = reviewsForCampaign(s.campaign.id)[0];
                const fails = s.latest.checks.filter((c) => c.status === "fail");
                let note: { tone: string; text: string } | null = null;
                if (s.latest.reviewStatus === "draft" && fails.length) note = { tone: "text-fail", text: `Blocked — ${fails[0].message}` };
                else if (lastReview && lastReview.decision !== "approved" && lastReview.version_no === s.latest.versionNo) note = { tone: "text-warn", text: `${lastReview.reviewer_name}: “${lastReview.comment}”` };
                else if (s.published && s.published.id !== s.latest.id) note = { tone: "text-ink-2", text: `Fans buy v${s.published.versionNo}; v${s.latest.versionNo} needs its own approval.` };
                return (
                  <li key={s.campaign.id}>
                    <Link href={`/creator/campaigns/${s.campaign.id}`} className="group grid grid-cols-[88px_1fr] items-center gap-4 py-4 transition-colors hover:bg-card sm:grid-cols-[112px_1fr_180px_32px] sm:gap-6 sm:px-3">
                      <Preview svg={s.latest.previewSvg} className="overflow-hidden rounded-md border border-sand" />
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <h3 className="text-[17px] font-semibold tracking-[-0.02em]">{s.latest.content.copy.title}</h3>
                          <Badge tone={review.tone}>v{s.latest.versionNo} · {review.label}</Badge>
                          {s.campaign.sales_status !== "not_published" && <Badge tone={sales.tone}>{sales.label}</Badge>}
                        </div>
                        <p className="mt-1 font-mono text-[12px] text-moss">
                          {productName(s.latest.content.productId)} · {formatINR(s.latest.content.offer.priceMinor)} · updated {formatDate(s.campaign.updated_at)}
                        </p>
                        {note && <p className={`mt-1.5 line-clamp-2 text-[13px] ${note.tone}`}>{note.text}</p>}
                      </div>
                      <div className="col-span-2 sm:col-span-1">
                        {p ? (
                          <>
                            <ProgressBar value={p.paidUnits} max={p.threshold} />
                            <div className="mt-1.5 font-mono text-[11px] text-moss"><span className="text-ink">{p.paidUnits}</span>/{p.threshold} paid units</div>
                          </>
                        ) : (
                          <span className="font-mono text-[11px] text-moss">Not published</span>
                        )}
                      </div>
                      <span className="hidden h-8 w-8 place-items-center rounded-full border border-sand-2 transition-colors group-hover:border-ink group-hover:bg-ink group-hover:text-paper sm:grid"><Arrow /></span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          )}
        </section>
        <aside className="space-y-6">
          <Card className="p-5">
            <div className="label text-moss">New</div>
            <h2 className="mt-1 text-lg font-semibold">Start a campaign</h2>
            <p className="mt-1 text-sm text-moss">You’ll work inside the kit’s latest rules.</p>
            <div className="mt-4"><NewCampaignForm kits={kits} /></div>
          </Card>
          <div className="px-1">
            <h2 className="label mb-3 text-moss">How approval works</h2>
            <ol className="space-y-3 text-[13.5px] text-ink-2">
              {[
                "Save drafts freely — the server checks every rule as you edit.",
                "Submit. Anything that breaks a kit rule is refused, with the reason.",
                "The kit’s named approver approves that exact version.",
                "Publish. Later edits start a new version that needs fresh approval.",
              ].map((t, i) => (
                <li key={i} className="grid grid-cols-[24px_1fr]">
                  <span className="pt-0.5 font-mono text-[13px] leading-none text-vermilion">{String(i + 1).padStart(2, "0")}</span>
                  <span>{t}</span>
                </li>
              ))}
            </ol>
          </div>
        </aside>
      </div>
    </div>
  );
}
