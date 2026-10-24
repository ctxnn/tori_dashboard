import Link from "next/link";
import { notFound } from "next/navigation";
import { requirePageRole } from "@/lib/auth";
import { canViewCampaign, getCampaign } from "@/lib/domain/campaigns";
import { buildStatement, BUCKETS } from "@/lib/domain/statements";
import { SELLER } from "@/lib/domain/core";
import { ORDER_STATUS, SALES_STATUS, formatDate, formatDateTime } from "@/lib/labels";
import { bpsToPercent, formatINR } from "@/lib/money";
import { productName } from "@/lib/catalog";
import { Badge, Card, CardHeader, Notice, StageRail, buttonClass, cx } from "@/components/ui";
import { AllocationBar } from "@/components/allocation-bar";
import { PrintButton } from "./print-button";

export const metadata = { title: "Commercial statement" };

function Row({ label, value, sub, href, strong, negative }: { label: React.ReactNode; value: number; sub?: React.ReactNode; href?: string; strong?: boolean; negative?: boolean }) {
  return (
    <div className={cx("flex items-baseline justify-between gap-4 py-2.5", strong && "border-t border-ink/20 pt-3")}>
      <div className="min-w-0">
        <div className={cx("text-sm", strong ? "font-semibold text-ink" : "text-ink-2")}>{label}</div>
        {sub && <div className="text-xs text-moss">{sub}</div>}
      </div>
      <div className="flex shrink-0 items-baseline gap-3">
        {href && <Link href={href} className="text-xs font-medium text-pine hover:underline print:hidden">orders →</Link>}
        <span className={cx("tabular-nums", strong ? "font-display text-lg font-semibold" : "text-sm font-medium", negative && "text-fail")}>{formatINR(value)}</span>
      </div>
    </div>
  );
}

export default async function StatementPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ bucket?: string }> }) {
  const user = await requirePageRole("owner", "creator", "operator");
  const { id } = await params;
  const { bucket } = await searchParams;
  const c = getCampaign(id);
  if (!c || !canViewCampaign(user, c)) notFound();
  const s = buildStatement(c.id);
  const r = s.recognised;
  const terms = s.byVersion[s.byVersion.length - 1]?.terms;
  const sales = SALES_STATUS[c.sales_status];
  const allOk = s.checks.every((x) => x.ok);
  const link = (b: string) => `/statements/${c.id}?bucket=${b}#orders`;
  const shownOrders = bucket ? s.orders.filter((o) => (bucket === "captured" ? o.paid_at : o.status === bucket)) : s.orders;
  const a = s.assumptions;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-sand pb-3">
        <div className="label flex items-center gap-2 text-moss">
          <span className="h-2 w-2 bg-vermilion" aria-hidden /> Commercial statement · {s.kit.property_name} × {s.creator.name}
        </div>
        <StageRail current={5} />
      </div>
      <div className="flex flex-wrap items-end justify-between gap-6 pt-2">
        <div className="min-w-0">
          <h1 className="text-[34px] font-semibold leading-[1.02] sm:text-[48px]">{s.title}</h1>
          <div className="mt-3 flex flex-wrap items-center gap-2 text-sm text-moss">
            <Badge tone={sales.tone}>{sales.label}</Badge>
            <span className="font-mono text-[12px]">seller {SELLER.name} · generated {formatDateTime(s.generatedAt)}</span>
          </div>
        </div>
        <div className="flex gap-2 print:hidden">
          <a href={`/api/statements/${c.id}/csv`} className={buttonClass("secondary", "sm")}>Export CSV</a>
          <PrintButton />
        </div>
      </div>

      {s.dataMode !== "live" && (
        <Notice tone="gold" title="Simulated test data — not live commercial results">
          Every payment and refund here came from Torii’s payment simulator. The structure is real; the money isn’t.
        </Notice>
      )}

      <section className="rounded-[var(--radius-card)] border border-sand bg-card p-5 sm:p-7">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <div className="label text-moss">Recorded · net item sales on {r.units} delivered units</div>
            <div className="mt-2 text-[44px] font-semibold leading-none tracking-[-0.045em] tabular-nums sm:text-[56px]">{formatINR(r.itemSales)}</div>
          </div>
          <div className="text-right font-mono text-xs leading-relaxed text-moss">
            net collected {formatINR(s.cash.netMinor)}
            <br />
            {s.cash.refundedCount} refund{s.cash.refundedCount === 1 ? "" : "s"} · {formatINR(s.cash.refundedMinor)}
          </div>
        </div>
        <div className="mt-6">
          <AllocationBar
            total={r.itemSales}
            slices={[
              { label: `Licensor ${terms ? bpsToPercent(terms.royaltyBps) : ""}`, sub: s.kit.owner_org, value: r.licensorRoyalty, className: "bg-vermilion text-white" },
              { label: `Creator ${terms ? bpsToPercent(terms.creatorBps) : ""}`, sub: s.creator.name, value: r.creatorEarnings, className: "bg-pine text-paper" },
              { label: `Torii ${terms ? bpsToPercent(terms.platformBps) : ""}`, sub: "Revenue before expenses, not profit", value: r.toriiCommission, className: "bg-ink text-paper" },
              { label: "Seller share", sub: `${SELLER.name} · production & fulfilment`, value: r.sellerShare, className: "bg-sand-2 text-ink" },
            ]}
          />
        </div>
      </section>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader eyebrow="Recorded · from the ledger" title="Money in and out" subtitle="Actual payment and refund events." />
          <div className="divide-y divide-sand px-5 sm:px-6">
            <Row label={`Payments captured (${s.cash.capturedCount})`} value={s.cash.capturedMinor} href={link("captured")} />
            <Row label={`Refunds paid (${s.cash.refundedCount})`} value={-s.cash.refundedMinor} negative href={link("refunded")} />
            <Row label="Net collected" value={s.cash.netMinor} strong sub="Held for paid, in-production, shipped and delivered orders." />
          </div>
        </Card>

        <Card>
          <CardHeader eyebrow="Recorded · earned on delivery" title={`${r.units} delivered units`} subtitle="Allocations are posted to the ledger when each order is delivered." />
          <div className="divide-y divide-sand px-5 sm:px-6">
            <Row label="Net item sales" value={r.itemSales} sub={`${r.orders} delivered orders`} href={link("delivered")} strong />
            <Row label={`Licensor royalty${terms ? ` · ${bpsToPercent(terms.royaltyBps)}` : ""}`} value={r.licensorRoyalty} sub={s.kit.owner_org} />
            <Row label={`Creator earnings${terms ? ` · ${bpsToPercent(terms.creatorBps)}` : ""}`} value={r.creatorEarnings} sub={s.creator.name} />
            <Row label={`Torii commission${terms ? ` · ${bpsToPercent(terms.platformBps)}` : ""}`} value={r.toriiCommission} sub="Revenue before Torii’s expenses — not profit." />
            <Row label="Seller share" value={r.sellerShare} sub={`${SELLER.name} · covers production and fulfilment`} />
            <Row label="Shipping charged" value={r.shipping} sub="Passed to the seller for courier costs." />
          </div>
        </Card>
      </div>

      <Card>
        <CardHeader
          eyebrow="Reconciliation"
          title={allOk ? "Everything reconciles" : "Something doesn’t reconcile"}
          subtitle="Ledger totals are recomputed independently from orders and compared."
          action={<Badge tone={allOk ? "ok" : "fail"}>{s.checks.filter((x) => x.ok).length}/{s.checks.length} checks pass</Badge>}
        />
        <ul className="grid gap-3 p-5 sm:grid-cols-2 sm:p-6">
          {s.checks.map((x) => (
            <li key={x.label} className={cx("flex gap-3 rounded-xl p-3", x.ok ? "bg-ok-soft/50" : "bg-fail-soft/70")}>
              <span className={cx("grid h-6 w-6 shrink-0 place-items-center rounded-full text-xs font-bold text-white", x.ok ? "bg-ok" : "bg-fail")} aria-hidden>{x.ok ? "✓" : "✕"}</span>
              <div className="text-sm">
                <div className="font-medium">{x.label}<span className="sr-only">: {x.ok ? "passes" : "fails"}</span></div>
                <div className="text-xs text-moss">{x.detail}</div>
              </div>
            </li>
          ))}
        </ul>
      </Card>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader eyebrow="Order states" title="Where every order is" subtitle="Each order sits in exactly one state." />
          <table className="w-full text-sm">
            <thead className="border-b border-sand text-xs uppercase tracking-wider text-moss">
              <tr>
                <th className="px-5 py-2 text-left font-medium sm:px-6">State</th>
                <th className="px-3 py-2 text-right font-medium">Orders</th>
                <th className="px-3 py-2 text-right font-medium">Units</th>
                <th className="px-5 py-2 text-right font-medium sm:px-6">Value</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-sand">
              {s.buckets.map((b) => (
                <tr key={b.key} className={b.orders ? "" : "text-moss"}>
                  <td className="px-5 py-2 sm:px-6">
                    {b.orders ? <Link href={link(b.key)} className="hover:underline">{b.label}</Link> : b.label}
                    {BUCKETS.find((x) => x.key === b.key)?.holdsCash && <span className="ml-1.5 text-[10px] uppercase tracking-wide text-moss">holds cash</span>}
                  </td>
                  <td className="px-3 py-2 text-right tabular-nums">{b.orders}</td>
                  <td className="px-3 py-2 text-right tabular-nums">{b.units}</td>
                  <td className="px-5 py-2 text-right tabular-nums sm:px-6">{formatINR(b.totalMinor)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>

        <div className="space-y-6">
          {s.pipeline.orders > 0 && (
            <Card>
              <CardHeader eyebrow="Projection · not yet earned" title={`${s.pipeline.units} units paid but not delivered`} subtitle="What these would add if every one is delivered." />
              <div className="divide-y divide-sand px-5 sm:px-6">
                <Row label="Net item sales" value={s.pipeline.itemSales} />
                <Row label="Licensor royalty" value={s.pipeline.licensorRoyalty} />
                <Row label="Creator earnings" value={s.pipeline.creatorEarnings} />
                <Row label="Torii commission" value={s.pipeline.toriiCommission} />
              </div>
            </Card>
          )}
          <Card className="border-dashed">
            <CardHeader eyebrow="Assumptions · not recorded" title="Estimated seller economics" subtitle="Illustrative costs set by the operator. Nothing below is a recorded transaction." />
            <div className="divide-y divide-sand px-5 sm:px-6">
              <Row label="Seller share + shipping charged" value={r.sellerShare + r.shipping} sub="Recorded" />
              <Row label={`Production · ${formatINR(a.costs.productionMinor[a.productId] ?? 0)} × ${r.units} ${productName(a.productId).toLowerCase()}s`} value={-a.productionCost} negative sub="Assumption" />
              <Row label={`Packaging · ${formatINR(a.costs.packagingMinor)} × ${r.orders} orders`} value={-a.packagingCost} negative sub="Assumption" />
              <Row label={`Courier · ${formatINR(a.costs.shippingCostMinor)} × ${r.orders} orders`} value={-a.shippingCost} negative sub="Assumption" />
              <Row label={`Payment processing · ${bpsToPercent(a.costs.paymentFeeBps)} of captured`} value={-a.paymentFees} negative sub="Assumption; fees on refunded payments assumed not returned" />
              <Row label="Estimated seller contribution" value={a.sellerContribution} strong negative={a.sellerContribution < 0} />
            </div>
          </Card>
        </div>
      </div>

      {s.byVersion.length > 0 && (
        <Card>
          <CardHeader eyebrow="Versions" title="Sales by approved version" subtitle="Orders keep the version, price and terms they were bought under." />
          <div className="overflow-x-auto">
            <table className="w-full min-w-[560px] text-sm">
              <thead className="border-b border-sand text-xs uppercase tracking-wider text-moss">
                <tr>
                  <th className="px-5 py-2 text-left font-medium sm:px-6">Version</th>
                  <th className="px-3 py-2 text-right font-medium">Price</th>
                  <th className="px-3 py-2 text-right font-medium">Paid orders</th>
                  <th className="px-3 py-2 text-right font-medium">Delivered units</th>
                  <th className="px-3 py-2 text-right font-medium">Item sales</th>
                  <th className="px-5 py-2 text-right font-medium sm:px-6">Terms (royalty / creator / Torii)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-sand">
                {s.byVersion.map((v) => (
                  <tr key={v.versionNo}>
                    <td className="px-5 py-2 sm:px-6">v{v.versionNo}</td>
                    <td className="px-3 py-2 text-right tabular-nums">{formatINR(v.priceMinor)}</td>
                    <td className="px-3 py-2 text-right tabular-nums">{v.orders}</td>
                    <td className="px-3 py-2 text-right tabular-nums">{v.delivered}</td>
                    <td className="px-3 py-2 text-right tabular-nums">{formatINR(v.itemSales)}</td>
                    <td className="px-5 py-2 text-right sm:px-6">{bpsToPercent(v.terms.royaltyBps)} / {bpsToPercent(v.terms.creatorBps)} / {bpsToPercent(v.terms.platformBps)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      <Card id="orders" className="scroll-mt-24">
        <CardHeader
          eyebrow="Underlying orders"
          title={bucket ? `${bucket === "captured" ? "Orders with a captured payment" : ORDER_STATUS[bucket]?.label ?? bucket} (${shownOrders.length})` : `All orders (${s.orders.length})`}
          action={bucket && <Link href={`/statements/${c.id}#orders`} className="text-sm font-medium text-pine hover:underline">Show all</Link>}
        />
        <div className="max-h-[480px] overflow-auto">
          <table className="w-full min-w-[720px] text-sm">
            <thead className="sticky top-0 bg-card text-xs uppercase tracking-wider text-moss shadow-[0_1px_0_var(--color-sand)]">
              <tr>
                <th className="px-5 py-2 text-left font-medium sm:px-6">Order</th>
                <th className="px-3 py-2 text-left font-medium">Version</th>
                <th className="px-3 py-2 text-left font-medium">Status</th>
                <th className="px-3 py-2 text-right font-medium">Qty</th>
                <th className="px-3 py-2 text-right font-medium">Item</th>
                <th className="px-3 py-2 text-right font-medium">Total</th>
                <th className="px-5 py-2 text-left font-medium sm:px-6">Dates</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-sand">
              {shownOrders.map((o) => (
                <tr key={o.id}>
                  <td className="px-5 py-2 font-mono text-xs sm:px-6">{o.public_ref}{!o.livemode && <span className="ml-1 font-sans text-[10px] text-[#7a5a22]">SIM</span>}</td>
                  <td className="px-3 py-2">v{o.versionNo}</td>
                  <td className="px-3 py-2"><Badge tone={ORDER_STATUS[o.status].tone}>{ORDER_STATUS[o.status].label}</Badge></td>
                  <td className="px-3 py-2 text-right tabular-nums">{o.quantity}</td>
                  <td className="px-3 py-2 text-right tabular-nums">{formatINR(o.unit_price_minor * o.quantity)}</td>
                  <td className="px-3 py-2 text-right tabular-nums">{formatINR(o.total_minor)}</td>
                  <td className="px-5 py-2 text-xs text-moss sm:px-6">
                    {o.paid_at ? `paid ${formatDate(o.paid_at)}` : "unpaid"}
                    {o.delivered_at && ` · delivered ${formatDate(o.delivered_at)}`}
                    {o.refunded_at && ` · refunded ${formatDate(o.refunded_at)}`}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
      <p className="text-xs text-moss">Money transfers to the licensor, creator and seller are a future integration. This statement is the record those payouts would be made from.</p>
    </div>
  );
}
