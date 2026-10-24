import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { requirePageRole } from "@/lib/auth";
import { comparisonBase, diffContent, getCampaign, listVersions, summarise } from "@/lib/domain/campaigns";
import { assetsForVersion, getKitVersion, latestKitVersion, listAssets, listKitVersions } from "@/lib/domain/kits";
import { getPlatformTerms, getUser } from "@/lib/domain/core";
import { reviewsForCampaign } from "@/lib/domain/reviews";
import { campaignProgress } from "@/lib/domain/orders";
import { REVIEW_STATUS, formatDate, formatDateTime } from "@/lib/labels";
import { Badge, Card, CardHeader } from "@/components/ui";
import { Preview } from "@/components/preview";
import { VersionDiff } from "@/components/version-diff";
import { Workspace } from "./workspace";
import { aiAvailable } from "@/lib/assist";

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const c = getCampaign(id);
  return { title: c ? summarise(c).latest.content.copy.title : "Campaign" };
}

export default async function CampaignWorkspacePage({ params }: { params: Promise<{ id: string }> }) {
  const user = await requirePageRole("creator");
  const { id } = await params;
  const c = getCampaign(id);
  if (!c) notFound();
  if (c.creator_id !== user.id) redirect("/creator");

  const s = summarise(c);
  const versions = listVersions(c.id);
  const kv = latestKitVersion(c.kit_id)!;
  const approver = getUser(kv.rules.requiredApproverId);
  const reviews = reviewsForCampaign(c.id);
  const latestKv = getKitVersion(s.latest.kitVersionId)!;
  const approvedUnpublished = versions.find((v) => v.reviewStatus === "approved" && v.id !== c.published_version_id && v.versionNo > (s.published?.versionNo ?? 0));
  const allAssets = listAssets(c.kit_id);
  const assetNames = Object.fromEntries(allAssets.map((a) => [a.id, `${a.code} · ${a.name}`]));
  const kitVersionNames = Object.fromEntries(listKitVersions(c.kit_id).map((k) => [k.id, `Kit v${k.versionNo}`]));
  const progress = s.published ? campaignProgress(c) : null;

  return (
    <div className="space-y-10">
      <Workspace
        campaign={{ id: c.id, slug: c.slug, salesStatus: c.sales_status }}
        latest={{
          id: s.latest.id,
          versionNo: s.latest.versionNo,
          reviewStatus: s.latest.reviewStatus,
          content: s.latest.content,
          checks: s.latest.checks,
          kitVersionNo: latestKv.versionNo,
          submittedAt: s.latest.submittedAt,
        }}
        published={s.published ? { id: s.published.id, versionNo: s.published.versionNo } : null}
        approvedUnpublished={approvedUnpublished ? { id: approvedUnpublished.id, versionNo: approvedUnpublished.versionNo } : null}
        kit={{
          id: s.kit.id,
          name: s.kit.property_name,
          owner: s.kit.owner_org,
          creditLine: s.kit.credit_line,
          versionNo: kv.versionNo,
          rules: kv.rules,
          assets: assetsForVersion(kv).map((a) => ({ id: a.id, code: a.code, name: a.name, description: a.description })),
          approverName: approver ? `${approver.name} (${approver.title})` : "the named approver",
        }}
        platformTerms={getPlatformTerms()}
        lastReview={reviews[0] ? { decision: reviews[0].decision, comment: reviews[0].comment, reviewerName: reviews[0].reviewer_name, versionNo: reviews[0].version_no } : null}
        progress={progress ? { paidUnits: progress.paidUnits, threshold: progress.threshold } : null}
        aiEnabled={aiAvailable()}
      />

      <Card>
        <CardHeader
          eyebrow="Audit trail"
          title="Version history"
          subtitle="Every submitted version is frozen. Approvals belong to one exact version."
          action={s.published && <Link href={`/statements/${c.id}`} className="text-sm font-medium text-pine hover:underline">Commercial statement →</Link>}
        />
        <ol className="divide-y divide-sand">
          {versions.map((v) => {
            const base = comparisonBase(v);
            const changes = base ? diffContent(base.content, base.kitVersionId, v.content, v.kitVersionId) : [];
            const vReviews = reviews.filter((r) => r.campaign_version_id === v.id);
            const st = REVIEW_STATUS[v.reviewStatus];
            return (
              <li key={v.id} className="grid gap-4 px-5 py-5 sm:grid-cols-[96px_1fr] sm:px-6">
                <Preview svg={v.previewSvg} className="w-24 overflow-hidden rounded-lg" />
                <div className="min-w-0 space-y-3">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-display text-base font-semibold">Version {v.versionNo}</span>
                    <Badge tone={st.tone}>{st.label}</Badge>
                    {c.published_version_id === v.id && <Badge tone="vermilion">Live for fans</Badge>}
                    <span className="text-xs text-moss">
                      {kitVersionNames[v.kitVersionId]} · created {formatDate(v.createdAt)}
                      {v.submittedAt && ` · submitted ${formatDateTime(v.submittedAt)}`}
                    </span>
                  </div>
                  {vReviews.map((r) => (
                    <p key={r.id} className="rounded-lg bg-ivory px-3 py-2 text-sm text-ink-2">
                      <span className="font-medium text-ink">{r.reviewer_name}</span> {r.decision === "approved" ? "approved" : r.decision === "rejected" ? "rejected" : "requested changes"} · {formatDateTime(r.created_at)}
                      {r.comment && <span className="block italic">“{r.comment}”</span>}
                      <span className="mt-1 block font-mono text-[11px] text-moss">fingerprint {r.content_hash.slice(0, 12)}</span>
                    </p>
                  ))}
                  {base && changes.length > 0 && (
                    <details className="group">
                      <summary className="cursor-pointer text-sm font-medium text-pine">
                        {changes.length} change{changes.length > 1 ? "s" : ""} from v{base.versionNo}
                      </summary>
                      <div className="mt-2">
                        <VersionDiff changes={changes} lookups={{ assets: assetNames, kitVersions: kitVersionNames, productId: v.content.productId }} beforeLabel={`v${base.versionNo}`} afterLabel={`v${v.versionNo}`} />
                      </div>
                    </details>
                  )}
                </div>
              </li>
            );
          })}
        </ol>
      </Card>
    </div>
  );
}
