import Link from "next/link";
import { requirePageRole } from "@/lib/auth";
import { comparisonBase, diffContent, getCampaign, listCampaigns, reviewQueue, summarise } from "@/lib/domain/campaigns";
import { getKitVersion, latestKitVersion, listKits } from "@/lib/domain/kits";
import { getUser } from "@/lib/domain/core";
import { campaignProgress } from "@/lib/domain/orders";
import { REVIEW_STATUS, SALES_STATUS, formatDate, formatDateTime } from "@/lib/labels";
import { productName } from "@/lib/catalog";
import { formatINR } from "@/lib/money";
import { Badge, Card, CardHeader, EmptyState, LinkButton, PageHeader, ProgressBar } from "@/components/ui";
import { Preview } from "@/components/preview";
import { CheckSummary } from "@/components/check-list";

export const metadata = { title: "Owner overview" };

export default async function OwnerHome() {
  const user = await requirePageRole("owner");
  const kits = listKits().filter((k) => k.owner_org === user.org);
  const queue = reviewQueue(user.org);
  const campaigns = listCampaigns({ kitIds: kits.map((k) => k.id) }).map(summarise);

  return (
    <div className="space-y-10">
      <PageHeader
        eyebrow={`${user.org} · ${user.title}`}
        stage={3}
        meta={[["Awaiting you", queue.length], ["Collaborations", campaigns.length]]}
        title="Collaborations on your property"
        description="Review what creators propose against the kit you published, and see what fans actually paid for."
        actions={<LinkButton href="/owner/kit" variant="secondary">Manage asset kit</LinkButton>}
      />

      <section aria-labelledby="queue">
        <div className="mb-4 flex items-baseline justify-between">
          <h2 id="queue" className="text-xl font-semibold">Waiting for your decision</h2>
          <span className="text-sm text-moss">{queue.length} proposal{queue.length === 1 ? "" : "s"}</span>
        </div>
        {queue.length === 0 ? (
          <EmptyState title="Nothing to review">New proposals appear here once a creator submits them and they pass every rule check.</EmptyState>
        ) : (
          <ul className="grid gap-4 md:grid-cols-2">
            {queue.map((v) => {
              const c = getCampaign(v.campaignId)!;
              const creator = getUser(c.creator_id)!;
              const kv = getKitVersion(v.kitVersionId)!;
              const base = comparisonBase(v);
              const changes = base ? diffContent(base.content, base.kitVersionId, v.content, v.kitVersionId) : [];
              const canApprove = kv.rules.requiredApproverId === user.id;
              return (
                <li key={v.id}>
                  <Card className="flex h-full flex-col gap-4 p-4 sm:flex-row sm:p-5">
                    <Preview svg={v.previewSvg} className="w-full shrink-0 overflow-hidden rounded-xl sm:w-32" />
                    <div className="flex min-w-0 flex-1 flex-col">
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="font-display text-lg font-semibold">{v.content.copy.title}</h3>
                        <Badge tone="info">v{v.versionNo}</Badge>
                      </div>
                      <p className="text-sm text-moss">
                        {creator.name} · {productName(v.content.productId)} · {formatINR(v.content.offer.priceMinor)} · submitted {formatDateTime(v.submittedAt)}
                      </p>
                      <div className="mt-2">
                        <CheckSummary checks={v.checks} />
                      </div>
                      <p className="mt-1 text-sm text-ink-2">
                        {base ? `${changes.length} change${changes.length === 1 ? "" : "s"} since v${base.versionNo} (${REVIEW_STATUS[base.reviewStatus].label.toLowerCase()})` : "First version — no earlier proposal to compare."}
                      </p>
                      {!canApprove && <p className="mt-1 text-xs text-warn">You can request changes; approval must come from the kit’s named approver.</p>}
                      <div className="mt-auto pt-3">
                        <LinkButton href={`/owner/reviews/${v.id}`} size="sm">Open review</LinkButton>
                      </div>
                    </div>
                  </Card>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      <section aria-labelledby="kits">
        <h2 id="kits" className="mb-4 text-xl font-semibold">Your kit</h2>
        {kits.map((k) => {
          const kv = latestKitVersion(k.id)!;
          return (
            <Card key={k.id} className="p-5 sm:p-6">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <div className="font-display text-xl font-semibold">{k.property_name}</div>
                  <p className="mt-1 max-w-2xl text-sm text-ink-2">{k.summary}</p>
                </div>
                <Badge tone="pine">Kit v{kv.versionNo} · {formatDate(kv.publishedAt)}</Badge>
              </div>
              <div className="mt-4 grid gap-4 text-sm sm:grid-cols-4">
                <div><div className="text-moss">Products</div><div className="font-medium">{kv.rules.products.map((p) => productName(p.productId)).join(", ")}</div></div>
                <div><div className="text-moss">Approved assets</div><div className="font-medium">{kv.assetIds.length}</div></div>
                <div><div className="text-moss">Territory</div><div className="font-medium">{kv.rules.territories.join(", ")}</div></div>
                <div><div className="text-moss">Approver</div><div className="font-medium">{getUser(kv.rules.requiredApproverId)?.name}</div></div>
              </div>
            </Card>
          );
        })}
      </section>

      <section aria-labelledby="all">
        <Card>
          <CardHeader title="All collaborations" subtitle="Live and past campaigns built on your kit." />
          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px] text-left text-sm">
              <thead className="border-b border-sand text-xs uppercase tracking-wider text-moss">
                <tr>
                  <th className="px-5 py-3 font-medium sm:px-6">Campaign</th>
                  <th className="px-3 py-3 font-medium">Latest version</th>
                  <th className="px-3 py-3 font-medium">Sales</th>
                  <th className="px-3 py-3 font-medium">Paid units</th>
                  <th className="px-5 py-3 font-medium sm:px-6"><span className="sr-only">Links</span></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-sand">
                {campaigns.map((s) => {
                  const p = s.published ? campaignProgress(s.campaign) : null;
                  const rs = REVIEW_STATUS[s.latest.reviewStatus];
                  const ss = SALES_STATUS[s.campaign.sales_status];
                  return (
                    <tr key={s.campaign.id} className="align-middle">
                      <td className="px-5 py-3 sm:px-6">
                        <div className="font-medium">{s.latest.content.copy.title}</div>
                        <div className="text-xs text-moss">{s.creator.name} · {productName(s.latest.content.productId)}</div>
                      </td>
                      <td className="px-3 py-3"><Badge tone={rs.tone}>v{s.latest.versionNo} · {rs.label}</Badge></td>
                      <td className="px-3 py-3"><Badge tone={ss.tone}>{ss.label}</Badge></td>
                      <td className="px-3 py-3">
                        {p ? (
                          <div className="w-36">
                            <ProgressBar value={p.paidUnits} max={p.threshold} />
                            <div className="mt-1 text-xs text-moss">{p.paidUnits} / {p.threshold}</div>
                          </div>
                        ) : (
                          <span className="text-moss">—</span>
                        )}
                      </td>
                      <td className="space-x-3 whitespace-nowrap px-5 py-3 text-right sm:px-6">
                        {s.latest.reviewStatus === "submitted" && <Link className="font-medium text-pine hover:underline" href={`/owner/reviews/${s.latest.id}`}>Review</Link>}
                        {s.published && <Link className="font-medium text-pine hover:underline" href={`/c/${s.campaign.slug}`}>Page</Link>}
                        {s.published && <Link className="font-medium text-pine hover:underline" href={`/statements/${s.campaign.id}`}>Statement</Link>}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Card>
      </section>
    </div>
  );
}
