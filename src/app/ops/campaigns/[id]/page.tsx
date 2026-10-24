import Link from "next/link";
import { notFound } from "next/navigation";
import { requirePageRole } from "@/lib/auth";
import { getCampaign, listVersions, summarise } from "@/lib/domain/campaigns";
import { campaignProgress, deliveriesForCampaign, listOrders } from "@/lib/domain/orders";
import { refundsForCampaign } from "@/lib/domain/refunds";
import { auditFor } from "@/lib/domain/core";
import { ORDER_STATUS, SALES_STATUS, formatDate, formatDateTime } from "@/lib/labels";
import { formatINR } from "@/lib/money";
import { Badge, Card, CardHeader, LinkButton, Notice, ProgressBar, SimBadge, StageRail, Stat } from "@/components/ui";
import { OpsActions, RefundButton } from "./ops-actions";

export const metadata = { title: "Manage campaign" };

export default async function OpsCampaign({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ status?: string }> }) {
  await requirePageRole("operator");
  const { id } = await params;
  const { status: filter } = await searchParams;
  const c = getCampaign(id);
  if (!c || !c.published_version_id) notFound();
  const s = summarise(c);
  const p = campaignProgress(c);
  const orders = listOrders(c.id);
  const versions = new Map(listVersions(c.id).map((v) => [v.id, v.versionNo]));
  const shown = filter ? orders.filter((o) => o.status === filter) : orders;
  const refunds = refundsForCampaign(c.id);
  const events = deliveriesForCampaign(c.id, 30);
  const log = auditFor("campaign", [c.id]).slice(0, 12);
  const n = (...st: string[]) => orders.filter((o) => st.includes(o.status)).length;
  const st = SALES_STATUS[c.sales_status];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-sand pb-3">
        <Link href="/ops" className="label flex items-center gap-2 text-moss hover:text-ink">
          <span className="h-2 w-2 bg-vermilion" aria-hidden /> Operations / {s.creator.name}
        </Link>
        <StageRail current={c.sales_status === "live" ? 4 : 5} />
      </div>
      <div className="flex flex-wrap items-end justify-between gap-6 pt-2">
        <div className="min-w-0">
          <h1 className="text-[34px] font-semibold leading-[1.02] sm:text-[48px]">{s.published!.content.copy.title}</h1>
          <div className="mt-3 flex flex-wrap items-center gap-2 text-sm">
            <Badge tone={st.tone}>{st.label}</Badge>
            <SimBadge />
            <span className="font-mono text-[12px] text-moss">live v{s.published!.versionNo} · deadline {formatDate(p.deadline)}</span>
          </div>
        </div>
        <div className="flex gap-2">
          <LinkButton href={`/c/${c.slug}`} variant="secondary" size="sm">Campaign page</LinkButton>
          <LinkButton href={`/statements/${c.id}`} size="sm">Statement</LinkButton>
        </div>
      </div>

      {c.cancel_reason && <Notice tone="warn" title="Cancellation reason">{c.cancel_reason}</Notice>}

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_360px]">
        <div className="min-w-0 space-y-6">
          <Card className="p-5 sm:p-6">
            <div className="grid gap-5 sm:grid-cols-4">
              <Stat label="Paid units" value={`${p.paidUnits}/${p.threshold}`} tone={p.thresholdMet ? "ok" : p.deadlinePassed ? "fail" : undefined} hint={p.thresholdMet ? "Threshold met" : p.deadlinePassed ? "Missed" : `${p.daysLeft} days left`} />
              <Stat label="Paid / in production" value={n("paid", "in_production")} />
              <Stat label="Shipped / delivered" value={`${n("shipped")} / ${n("delivered")}`} />
              <Stat label="Refunded" value={n("refunded")} hint={n("refund_pending") ? `${n("refund_pending")} in progress` : undefined} />
            </div>
            <div className="mt-5"><ProgressBar value={p.paidUnits} max={p.threshold} /></div>
          </Card>

          <Card>
            <CardHeader
              title="Orders"
              subtitle="Each order keeps the version and price it was bought at."
              action={
                <div className="flex flex-wrap gap-1 text-xs">
                  <Link href={`/ops/campaigns/${c.id}`} className={`rounded-full px-2.5 py-1 ${!filter ? "bg-ink text-paper" : "bg-ivory"}`}>All {orders.length}</Link>
                  {Object.entries(ORDER_STATUS).filter(([k]) => n(k) > 0).map(([k, v]) => (
                    <Link key={k} href={`/ops/campaigns/${c.id}?status=${k}`} className={`rounded-full px-2.5 py-1 ${filter === k ? "bg-ink text-paper" : "bg-ivory"}`}>{v.label} {n(k)}</Link>
                  ))}
                </div>
              }
            />
            <div className="max-h-[520px] overflow-auto">
              <table className="w-full min-w-[720px] text-left text-sm">
                <thead className="sticky top-0 bg-card text-xs uppercase tracking-wider text-moss shadow-[0_1px_0_var(--color-sand)]">
                  <tr>
                    <th className="px-5 py-2.5 font-medium sm:px-6">Order</th>
                    <th className="px-3 py-2.5 font-medium">Buyer</th>
                    <th className="px-3 py-2.5 font-medium">Item</th>
                    <th className="px-3 py-2.5 font-medium">Total</th>
                    <th className="px-3 py-2.5 font-medium">Status</th>
                    <th className="px-5 py-2.5 sm:px-6"><span className="sr-only">Actions</span></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-sand">
                  {shown.map((o) => {
                    const os = ORDER_STATUS[o.status];
                    return (
                      <tr key={o.id}>
                        <td className="px-5 py-2.5 sm:px-6">
                          <Link href={`/orders/${o.public_ref}`} className="font-mono text-xs text-pine hover:underline">{o.public_ref}</Link>
                          <div className="text-xs text-moss">{formatDateTime(o.created_at)}</div>
                        </td>
                        <td className="px-3 py-2.5">{o.buyer_name}<div className="text-xs text-moss">{o.buyer_city}</div></td>
                        <td className="px-3 py-2.5">{o.quantity} × {o.size}<div className="text-xs text-moss">v{versions.get(o.campaign_version_id)} · {formatINR(o.unit_price_minor)}</div></td>
                        <td className="px-3 py-2.5 tabular-nums">{formatINR(o.total_minor)}</td>
                        <td className="px-3 py-2.5"><Badge tone={os.tone}>{os.label}</Badge></td>
                        <td className="px-5 py-2.5 text-right sm:px-6">{["paid", "in_production"].includes(o.status) && <RefundButton orderId={o.id} orderRef={o.public_ref} />}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </Card>

          <Card>
            <CardHeader title="Payment events" subtitle="Signed provider events received for this campaign. Duplicates are logged but never applied twice." />
            <ul className="max-h-80 divide-y divide-sand overflow-auto text-sm">
              {events.map((e) => (
                <li key={e.id} className="grid grid-cols-[1fr_auto] gap-x-3 gap-y-0.5 px-5 py-2 sm:grid-cols-[110px_160px_1fr_auto] sm:px-6">
                  <span className="font-mono text-xs text-moss">{e.public_ref}</span>
                  <span className="font-mono text-xs">{e.type}</span>
                  <span className="text-ink-2 max-sm:col-span-2">{e.detail}</span>
                  <Badge tone={e.outcome === "processed" ? "ok" : e.outcome === "duplicate" ? "gold" : "neutral"}>{e.outcome}</Badge>
                </li>
              ))}
            </ul>
          </Card>
        </div>

        <aside className="space-y-6 lg:sticky lg:top-20 lg:self-start">
          <OpsActions
            campaignId={c.id}
            salesStatus={c.sales_status}
            thresholdMet={p.thresholdMet}
            deadlinePassed={p.deadlinePassed}
            paidUnits={p.paidUnits}
            threshold={p.threshold}
            toShip={n("paid", "in_production")}
            toDeliver={n("shipped")}
            refundable={n("paid", "in_production", "refund_pending")}
            hasShipped={n("shipped", "delivered") > 0}
          />
          {refunds.length > 0 && (
            <Card className="p-5">
              <h2 className="text-base font-semibold">Refunds ({refunds.length})</h2>
              <ul className="mt-3 space-y-1.5 text-sm">
                {refunds.slice(0, 8).map((r) => (
                  <li key={r.id} className="flex justify-between gap-2">
                    <span className="font-mono text-xs">{r.public_ref}</span>
                    <span className="tabular-nums">{formatINR(r.amount_minor)}</span>
                    <Badge tone={r.status === "succeeded" ? "ok" : r.status === "failed" ? "fail" : "warn"}>{r.status}</Badge>
                  </li>
                ))}
              </ul>
              {refunds.length > 8 && <p className="mt-2 text-xs text-moss">+ {refunds.length - 8} more</p>}
            </Card>
          )}
          <Card className="p-5">
            <h2 className="text-base font-semibold">Activity</h2>
            <ul className="mt-3 space-y-2 text-sm">
              {log.map((a) => (
                <li key={a.id}>
                  <span className="font-medium">{a.action.replace(/[._]/g, " ")}</span>
                  <span className="block text-xs text-moss">{a.actor_name ?? "System"} · {formatDateTime(a.at)}</span>
                </li>
              ))}
            </ul>
          </Card>
        </aside>
      </div>
    </div>
  );
}
