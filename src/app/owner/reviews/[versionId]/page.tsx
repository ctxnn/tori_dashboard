import Link from "next/link";
import { notFound } from "next/navigation";
import { requirePageRole } from "@/lib/auth";
import { comparisonBase, diffContent, evaluate, getCampaign, getVersion, hashContent } from "@/lib/domain/campaigns";
import { getKit, getKitVersion, listAssets, listKitVersions } from "@/lib/domain/kits";
import { getUser } from "@/lib/domain/core";
import { reviewsForCampaign } from "@/lib/domain/reviews";
import { CHANNELS, TERRITORIES, layoutName, productName } from "@/lib/catalog";
import { REVIEW_STATUS, formatDate, formatDateTime } from "@/lib/labels";
import { allocate, bpsToPercent, formatINR } from "@/lib/money";
import { Badge, Card, CardHeader, KeyValue, Notice, ProofFrame, Seal, StageRail } from "@/components/ui";
import { Preview } from "@/components/preview";
import { CheckList, CheckSummary } from "@/components/check-list";
import { VersionDiff } from "@/components/version-diff";
import { DecisionPanel } from "./decision-panel";

export const metadata = { title: "Review proposal" };

export default async function ReviewPage({ params }: { params: Promise<{ versionId: string }> }) {
  const user = await requirePageRole("owner");
  const { versionId } = await params;
  const v = getVersion(versionId);
  if (!v) notFound();
  const c = getCampaign(v.campaignId)!;
  const kit = getKit(c.kit_id)!;
  if (kit.owner_org !== user.org) notFound();
  const kv = getKitVersion(v.kitVersionId)!;
  const creator = getUser(c.creator_id)!;
  const approver = getUser(kv.rules.requiredApproverId)!;
  const base = comparisonBase(v);
  const changes = base ? diffContent(base.content, base.kitVersionId, v.content, v.kitVersionId) : [];
  // Re-run the checks now, on the server, rather than trusting what was stored at submission.
  const checks = evaluate(v.content, kv, { approved: v.reviewStatus === "approved", forSubmission: v.reviewStatus === "submitted" });
  const integrityOk = hashContent(v.content, v.kitVersionId) === v.contentHash;
  const reviews = reviewsForCampaign(c.id).filter((r) => r.campaign_version_id === v.id);
  const assets = Object.fromEntries(listAssets(kit.id).map((a) => [a.id, `${a.code} · ${a.name}`]));
  const kitVersions = Object.fromEntries(listKitVersions(kit.id).map((k) => [k.id, `Kit v${k.versionNo}`]));
  const o = v.content.offer;
  const t = v.content.terms;
  const atThreshold = allocate(o.priceMinor * o.thresholdUnits, t);
  const status = REVIEW_STATUS[v.reviewStatus];
  const live = c.published_version_id && c.published_version_id !== v.id ? getVersion(c.published_version_id) : undefined;
  const compareTo = base;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-sand pb-3">
        <Link href="/owner" className="label flex items-center gap-2 text-moss hover:text-ink">
          <span className="h-2 w-2 bg-vermilion" aria-hidden /> Review queue / {creator.org}
        </Link>
        <StageRail current={3} />
      </div>
      <div className="flex flex-wrap items-end justify-between gap-6 pt-2">
        <div className="min-w-0">
          <h1 className="text-[34px] font-semibold leading-[1.02] sm:text-[48px]">{v.content.copy.title}</h1>
          <div className="mt-3 flex flex-wrap items-center gap-2 text-sm">
            <Badge tone={status.tone}>Version {v.versionNo} · {status.label}</Badge>
            <span className="text-moss">by {creator.name}</span>
          </div>
        </div>
        <dl className="grid grid-cols-2 gap-x-8 gap-y-2 sm:flex">
          {[
            ["Submitted", formatDateTime(v.submittedAt)],
            ["Kit", `v${kv.versionNo}`],
            ["Fingerprint", v.contentHash.slice(0, 12)],
          ].map(([k, val]) => (
            <div key={k}>
              <dt className="label text-moss">{k}</dt>
              <dd className={`mt-0.5 font-mono text-sm ${k === "Fingerprint" && !integrityOk ? "text-fail" : "text-ink"}`}>{val}</dd>
            </div>
          ))}
        </dl>
      </div>
      {!integrityOk && <Notice tone="fail" title="Fingerprint mismatch">Stored content doesn’t match its fingerprint. This version can’t be approved.</Notice>}

      {v.reviewStatus === "superseded" && <Notice tone="warn" title="This version was replaced">The creator submitted a newer version. Decisions can only be made on the latest submission.</Notice>}
      {live && <Notice tone="info" title={`Fans are currently buying version ${live.versionNo}`}>Approving this version doesn’t change the live page until the creator publishes it. Existing orders keep v{live.versionNo}.</Notice>}

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_380px]">
        <div className="min-w-0 space-y-6">
          {/* Creative */}
          <Card>
            <CardHeader eyebrow="Exact creative" title={compareTo ? `v${compareTo.versionNo} → v${v.versionNo}` : `Version ${v.versionNo}`} subtitle="Previews are generated from the saved design data, not uploaded mock-ups." />
            <div className={`grid gap-6 p-5 sm:p-6 ${compareTo ? "sm:grid-cols-2" : "max-w-md"}`}>
              {compareTo && (
                <ProofFrame label={`Before · v${compareTo.versionNo}`} corner={<Badge tone={REVIEW_STATUS[compareTo.reviewStatus].tone}>{REVIEW_STATUS[compareTo.reviewStatus].label}</Badge>}>
                  <Preview svg={compareTo.previewSvg} className="overflow-hidden rounded-md opacity-80 grayscale-[35%]" />
                </ProofFrame>
              )}
              <ProofFrame label={`Proposed · v${v.versionNo}`} corner={<span className="font-mono text-[11px] text-moss">{v.contentHash.slice(0, 8)}</span>}>
                <Preview svg={v.previewSvg} className="overflow-hidden rounded-md" />
              </ProofFrame>
            </div>
            <div className="border-t border-sand px-5 py-4 text-sm sm:px-6">
              <KeyValue
                items={[
                  ["Product & layout", `${productName(v.content.productId)} · ${layoutName(v.content.productId, v.content.layoutId)}`],
                  ["Artwork", assets[v.content.design.artworkAssetId] ?? "Unknown"],
                  ["Print text", <span key="t">{v.content.design.text.line1 || "—"}{v.content.design.text.line2 && <span className="block text-moss">{v.content.design.text.line2}</span>}</span>],
                ]}
              />
            </div>
          </Card>

          {/* Changes */}
          <Card>
            <CardHeader
              eyebrow="Changes"
              title={compareTo ? `What changed since v${compareTo.versionNo}` : "First submission"}
              subtitle={compareTo ? `Compared with the last ${compareTo.reviewStatus === "approved" ? "approved" : "earlier"} version. Approval never carries over: each version needs its own decision.` : undefined}
            />
            <div className="p-5 sm:p-6">
              {compareTo ? (
                <VersionDiff changes={changes} lookups={{ assets, kitVersions, productId: v.content.productId }} beforeLabel={`v${compareTo.versionNo}`} afterLabel={`v${v.versionNo}`} />
              ) : (
                <p className="text-sm text-moss">There’s no earlier version of this campaign.</p>
              )}
            </div>
          </Card>

          {/* Offer */}
          <Card>
            <CardHeader eyebrow="Offer" title="What fans will be asked to pay" />
            <div className="grid gap-6 p-5 sm:grid-cols-2 sm:p-6">
              <KeyValue
                items={[
                  ["Item price", formatINR(o.priceMinor)],
                  ["Shipping", formatINR(o.shippingMinor)],
                  ["Fan pays (1 unit)", formatINR(o.priceMinor + o.shippingMinor)],
                  ["Production threshold", `${o.thresholdUnits} paid units`],
                  ["Creator’s estimate", `${o.expectedUnits} units`],
                  ["Preorders", `${formatDate(o.launchDate)} → ${formatDate(o.deadline)}`],
                  ["Territory", TERRITORIES[o.territory] ?? o.territory],
                  ["Sizes", o.sizes.join(", ")],
                ]}
              />
              <div>
                <div className="mb-2 text-sm font-medium">At threshold ({o.thresholdUnits} delivered units)</div>
                <KeyValue
                  items={[
                    ["Net item sales", formatINR(atThreshold.netItemSales)],
                    [`Your royalty (${bpsToPercent(t.royaltyBps)})`, formatINR(atThreshold.licensorRoyalty)],
                    [`Creator (${bpsToPercent(t.creatorBps)})`, formatINR(atThreshold.creatorEarnings)],
                    [`Torii (${bpsToPercent(t.platformBps)})`, formatINR(atThreshold.toriiCommission)],
                    ["Seller share", formatINR(atThreshold.sellerShare)],
                  ]}
                />
                <p className="mt-2 text-xs text-moss">Illustrative terms. Earnings are recorded only when units are delivered.</p>
              </div>
            </div>
          </Card>

          {/* Creator contribution */}
          <Card>
            <CardHeader eyebrow="Creator’s contribution" title="Audience, local angle and distribution" />
            <div className="space-y-5 p-5 text-sm leading-relaxed sm:p-6">
              {v.content.copy.tagline && <p className="font-display text-lg italic text-ink">“{v.content.copy.tagline}”</p>}
              <div><div className="mb-1 text-xs font-semibold uppercase tracking-wider text-moss">Story</div><p className="text-ink-2">{v.content.copy.story || "—"}</p></div>
              <div className="grid gap-5 sm:grid-cols-2">
                <div><div className="mb-1 text-xs font-semibold uppercase tracking-wider text-moss">Audience</div><p className="text-ink-2">{v.content.copy.audience || "—"}</p></div>
                <div><div className="mb-1 text-xs font-semibold uppercase tracking-wider text-moss">Local angle</div><p className="text-ink-2">{v.content.copy.localAngle || "—"}</p></div>
              </div>
              <div>
                <div className="mb-1 text-xs font-semibold uppercase tracking-wider text-moss">Distribution</div>
                <ul className="flex flex-wrap gap-2">
                  {v.content.distribution.channels.map((ch) => (
                    <li key={ch.id}><Badge>{CHANNELS.find((x) => x.id === ch.id)?.label ?? ch.id} · {ch.plannedReach.toLocaleString("en-IN")}</Badge></li>
                  ))}
                </ul>
                {v.content.distribution.launchMoment && <p className="mt-2 text-ink-2"><span className="text-moss">Launch moment:</span> {v.content.distribution.launchMoment}</p>}
                {v.content.distribution.creatorCommitment && <p className="text-ink-2"><span className="text-moss">Commitment:</span> {v.content.distribution.creatorCommitment}</p>}
              </div>
            </div>
          </Card>
        </div>

        <aside className="space-y-6 lg:sticky lg:top-20 lg:self-start">
          <Card className="p-5">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-base font-semibold">Rule checks</h2>
              <span className="text-xs text-moss">Re-run just now</span>
            </div>
            <CheckSummary checks={checks} />
            <div className="mt-3"><CheckList checks={checks} /></div>
            <p className="mt-4 border-t border-sand pt-3 text-xs leading-relaxed text-moss">
              Automated checks enforce the rules declared in kit v{kv.versionNo}. They don’t establish copyright ownership or replace your creative and commercial judgement.
            </p>
          </Card>
          <Card className="p-5">
            <h2 className="text-base font-semibold">Your decision</h2>
            {reviews.length > 0 && (
              <ul className="mt-3 space-y-2">
                {reviews.map((r) => (
                  <li key={r.id} className="rounded-lg bg-ivory px-3 py-2 text-sm">
                    <span className="font-medium">{r.reviewer_name}</span> {r.decision.replace("_", " ")} · {formatDateTime(r.created_at)}
                    {r.comment && <span className="block italic text-ink-2">“{r.comment}”</span>}
                  </li>
                ))}
              </ul>
            )}
            {v.reviewStatus === "submitted" ? (
              <DecisionPanel
                versionId={v.id}
                versionNo={v.versionNo}
                contentHash={v.contentHash}
                canApprove={user.id === approver.id}
                approverName={`${approver.name} (${approver.title})`}
                hasFailures={checks.some((x) => x.status === "fail")}
              />
            ) : (
              <div className="mt-4 flex items-center gap-4">
                {v.reviewStatus === "approved" && <Seal sub={`v${v.versionNo} · ${v.contentHash.slice(0, 6)}`} className="h-24 w-24 shrink-0" />}
                <p className="text-sm text-moss">This version is {status.label.toLowerCase()}; no further decision is needed.</p>
              </div>
            )}
          </Card>
        </aside>
      </div>
    </div>
  );
}
