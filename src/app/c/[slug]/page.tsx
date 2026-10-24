import Link from "next/link";
import { notFound } from "next/navigation";
import { currentUser } from "@/lib/auth";
import { getCampaignBySlug, getVersion, isApproved } from "@/lib/domain/campaigns";
import { getKit, getKitVersion } from "@/lib/domain/kits";
import { SELLER, getUser } from "@/lib/domain/core";
import { campaignProgress, canOrder } from "@/lib/domain/orders";
import { reviewsForCampaign } from "@/lib/domain/reviews";
import { CHANNELS, layoutName, productName } from "@/lib/catalog";
import { formatDate } from "@/lib/labels";
import { formatINR } from "@/lib/money";
import { Notice, ProgressBar, ProofFrame, Seal, SimBadge, StageRail, ToriiMark } from "@/components/ui";
import { Preview } from "@/components/preview";
import { OrderForm } from "./order-form";

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const c = getCampaignBySlug(slug);
  const v = c?.published_version_id ? getVersion(c.published_version_id) : undefined;
  return { title: v?.content.copy.title ?? "Campaign", description: v?.content.copy.tagline };
}

export default async function CampaignPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const c = getCampaignBySlug(slug);
  if (!c || !c.published_version_id) notFound();
  const v = getVersion(c.published_version_id)!;
  const kit = getKit(c.kit_id)!;
  const kv = getKitVersion(v.kitVersionId)!;
  const creator = getUser(c.creator_id)!;
  const approval = reviewsForCampaign(c.id).find((r) => r.campaign_version_id === v.id && r.decision === "approved");
  const progress = campaignProgress(c, v);
  const status = canOrder(c);
  const user = await currentUser();
  const o = v.content.offer;
  const approvedOk = isApproved(v);
  const remaining = Math.max(0, progress.threshold - progress.paidUnits);

  let banner: { tone: "ok" | "warn" | "fail" | "info" | "neutral"; title: string; body: string } | null = null;
  if (c.sales_status === "production_released") banner = { tone: "ok", title: "Production confirmed", body: `${progress.paidUnits} fans preordered, so ${SELLER.name} is making this run. Preorders are closed.` };
  else if (c.sales_status === "completed") banner = { tone: "ok", title: "Made and delivered", body: "This run has been produced and delivered. Thank you to everyone who backed it." };
  else if (c.sales_status === "cancelling" || c.sales_status === "cancelled")
    banner = { tone: "fail", title: c.sales_status === "cancelled" ? "Cancelled · everyone refunded" : "Cancelled · refunds in progress", body: `This run didn’t go ahead${c.cancel_reason ? ` (${c.cancel_reason.toLowerCase()})` : ""}. Every payment is refunded in full, shipping included.` };
  else if (progress.deadlinePassed) banner = { tone: progress.thresholdMet ? "ok" : "warn", title: "Preorders closed", body: progress.thresholdMet ? "The threshold was reached. Production will be confirmed shortly." : "The threshold wasn’t reached by the deadline. All payments will be refunded in full." };
  else if (progress.thresholdMet) banner = { tone: "ok", title: "Threshold reached", body: `Production is unlocked. Preorders stay open until ${formatDate(o.deadline)}.` };

  return (
    <div>
      <div className="mb-8 flex flex-wrap items-center justify-between gap-3 border-b border-sand pb-3">
        <div className="label flex items-center gap-2 text-moss">
          <ToriiMark className="h-3.5 w-3.5 text-vermilion" /> Official {kit.property_name} collaboration · {kit.owner_org}
        </div>
        <StageRail current={4} />
      </div>

      <div className="grid gap-10 lg:grid-cols-[1.1fr_0.9fr] lg:gap-14">
        <div className="lg:sticky lg:top-20 lg:self-start">
          <ProofFrame label={`Proof · design v${v.versionNo} · kit v${kv.versionNo}`} corner={<SimBadge />}>
            <div className="overflow-hidden rounded-md bg-[#ECEBE5]">
              <Preview svg={v.previewSvg} label={`${productName(v.content.productId)} preview`} />
            </div>
          </ProofFrame>
          <p className="mt-3 px-3 text-xs text-moss">Generated from the approved design data. Final print colours may vary slightly.</p>
        </div>

        <div className="min-w-0">
          <h1 className="text-[40px] font-semibold leading-[1] tracking-[-0.04em] sm:text-[60px]">{v.content.copy.title}</h1>
          {v.content.copy.tagline && <p className="mt-4 font-serif text-[22px] italic leading-snug text-ink-2 sm:text-[26px]">{v.content.copy.tagline}</p>}
          <p className="mt-4 text-sm text-moss">
            Designed by <span className="font-medium text-ink">{creator.name}</span> · {creator.org} · {productName(v.content.productId)}, {layoutName(v.content.productId, v.content.layoutId).toLowerCase()}
          </p>

          <div className="mt-8 flex items-end justify-between gap-4 border-t border-ink pt-5">
            <div>
              <div className="label text-moss">Price</div>
              <div className="mt-1 text-[44px] font-semibold leading-none tracking-[-0.045em] tabular-nums">{formatINR(o.priceMinor)}</div>
            </div>
            <div className="text-right font-mono text-xs leading-relaxed text-moss">
              + {formatINR(o.shippingMinor)} shipping / order
              <br />
              total shown before you pay
            </div>
          </div>

          <div className="mt-6 rounded-[var(--radius-card)] bg-ink p-5 text-paper">
            <div className="flex items-end justify-between gap-3">
              <div>
                <div className="label text-paper/50">Production gate</div>
                <div className="mt-1 font-mono">
                  <span className="text-[34px] font-semibold leading-none tracking-[-0.04em]">{progress.paidUnits}</span>
                  <span className="text-paper/50"> / {progress.threshold} paid</span>
                </div>
              </div>
              <div className="text-right font-mono text-xs text-paper/60">
                {progress.deadlinePassed ? `closed ${formatDate(o.deadline)}` : `${progress.daysLeft} days left`}
                <br />
                ends {formatDate(o.deadline)}
              </div>
            </div>
            <div className="mt-4"><ProgressBar value={progress.paidUnits} max={progress.threshold} dark size="lg" label="Paid preorders towards the production threshold" /></div>
            <p className="mt-3 text-[13px] text-paper/70">
              {progress.thresholdMet ? "Enough fans have paid for this run to be made." : `${remaining} more paid preorder${remaining === 1 ? "" : "s"} needed by the deadline for production to start.`}
            </p>
          </div>

          {banner && <Notice tone={banner.tone} title={banner.title} className="mt-4">{banner.body}</Notice>}

          <div className="mt-6">
            {status.ok ? (
              <OrderForm slug={c.slug} sizes={o.sizes} priceMinor={o.priceMinor} shippingMinor={o.shippingMinor} defaults={user?.role === "fan" ? { name: user.name, email: user.email } : undefined} />
            ) : (
              !banner && <Notice tone="neutral">{status.reason}</Notice>
            )}
          </div>

          <ol className="mt-8 divide-y divide-sand border-y border-sand text-sm">
            {[
              ["Pay now, made only if it works", `Production starts only at ${progress.threshold} paid preorders.`],
              ["Full refund otherwise", `Miss the threshold by ${formatDate(o.deadline)} and everyone gets everything back, shipping included.`],
              ["Delivered anywhere in India", "Ships within about three weeks of production being confirmed."],
            ].map(([t, d], i) => (
              <li key={t} className="grid grid-cols-[32px_1fr] gap-2 py-3.5">
                <span className="pt-1 font-mono text-[13px] leading-none text-vermilion">{String(i + 1).padStart(2, "0")}</span>
                <span>
                  <span className="font-medium text-ink">{t}</span>
                  <span className="mt-0.5 block text-moss">{d}</span>
                </span>
              </li>
            ))}
          </ol>
        </div>
      </div>

      <section className="mt-24 grid gap-10 border-t border-ink pt-10 lg:grid-cols-[1fr_1.2fr]">
        <div>
          <div className="label text-moss">Why this exists</div>
          {v.content.copy.localAngle && <p className="mt-4 font-serif text-[28px] leading-[1.18] text-ink sm:text-[34px]">“{v.content.copy.localAngle}”</p>}
          <div className="mt-6 flex items-center gap-3 text-sm">
            <span className="grid h-10 w-10 place-items-center rounded-full bg-pine text-xs font-semibold text-paper">{creator.name.split(" ").map((p) => p[0]).join("")}</span>
            <span>
              <span className="block font-medium">{creator.name}</span>
              <span className="block text-moss">{creator.title}, {creator.org}</span>
            </span>
          </div>
        </div>
        <div className="space-y-8">
          <p className="text-[17px] leading-relaxed text-ink-2">{v.content.copy.story}</p>
          {v.content.distribution.channels.length > 0 && (
            <div>
              <div className="label text-moss">Where you’ll find it</div>
              <ul className="mt-3 flex flex-wrap gap-2">
                {v.content.distribution.channels.map((ch) => (
                  <li key={ch.id} className="rounded-full border border-sand-2 px-3 py-1 text-[13px] text-ink-2">{CHANNELS.find((x) => x.id === ch.id)?.label ?? ch.id}</li>
                ))}
              </ul>
            </div>
          )}
          <div className="grid gap-6 rounded-[var(--radius-card)] border border-sand bg-card p-6 sm:grid-cols-[auto_1fr]">
            <Seal sub={approvedOk ? `v${v.versionNo} · ${v.contentHash.slice(0, 6)}` : "unverified"} tone={approvedOk ? "vermilion" : "moss"} className="h-24 w-24" />
            <div>
              <div className="text-[17px] font-semibold">Officially licensed</div>
              <p className="mt-1 text-sm text-moss">{kit.credit_line}</p>
              <dl className="mt-4 grid grid-cols-2 gap-x-6 gap-y-3 text-sm">
                {[
                  ["Licensor", kit.owner_org],
                  ["Approved by", approval ? `${approval.reviewer_name}` : "—"],
                  ["Approved on", approval ? formatDate(approval.created_at) : "—"],
                  ["Sold & shipped by", `${SELLER.name}, ${SELLER.location.split(",")[0]}`],
                ].map(([k, val]) => (
                  <div key={k}>
                    <dt className="label text-moss">{k}</dt>
                    <dd className="mt-0.5 font-medium">{val}</dd>
                  </div>
                ))}
              </dl>
            </div>
          </div>
          <p className="text-xs text-moss">
            Demonstration only: Sky Courier, {kit.owner_org}, {SELLER.name} and all terms are fictional. <Link href="/" className="underline">About Torii</Link>
          </p>
        </div>
      </section>
    </div>
  );
}
