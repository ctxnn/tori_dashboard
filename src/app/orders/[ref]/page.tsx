import Link from "next/link";
import { notFound } from "next/navigation";
import { currentUser } from "@/lib/auth";
import { get } from "@/lib/db";
import { getCampaign, getVersion } from "@/lib/domain/campaigns";
import { campaignProgress, deliveriesForOrder, getOrderByRef } from "@/lib/domain/orders";
import { SELLER } from "@/lib/domain/core";
import { ORDER_STATUS, formatDate, formatDateTime } from "@/lib/labels";
import { formatINR } from "@/lib/money";
import { Badge, Card, CardHeader, KeyValue, Notice, ProgressBar, SimBadge, buttonClass, cx } from "@/components/ui";
import { Preview } from "@/components/preview";
import { RetryPayment } from "./retry";

export const metadata = { title: "Your preorder" };

const STEPS = [
  { key: "paid", label: "Paid" },
  { key: "in_production", label: "In production" },
  { key: "shipped", label: "Shipped" },
  { key: "delivered", label: "Delivered" },
];

export default async function OrderPage({ params, searchParams }: { params: Promise<{ ref: string }>; searchParams: Promise<{ t?: string }> }) {
  const { ref } = await params;
  const { t } = await searchParams;
  const user = await currentUser();
  const order = getOrderByRef(ref);
  if (!order) notFound();
  const allowed = (t && t === order.access_token) || user?.role === "operator" || (user && order.fan_user_id === user.id);
  if (!allowed) {
    return <Notice tone="warn" title="This order link is incomplete">Open the link from your confirmation, or sign in as the fan who placed it.</Notice>;
  }
  const c = getCampaign(order.campaign_id)!;
  const v = getVersion(order.campaign_version_id)!;
  const current = c.published_version_id ? getVersion(c.published_version_id) : undefined;
  const progress = campaignProgress(c);
  const st = ORDER_STATUS[order.status];
  const intent = get<{ checkout_url: string | null; status: string }>("SELECT checkout_url, status FROM payment_intents WHERE order_id = ?", order.id);
  const refund = get<{ status: string; reason: string; created_at: string; completed_at: string | null }>("SELECT * FROM refunds WHERE order_id = ?", order.id);
  const events = deliveriesForOrder(order.id);
  const stepIndex = STEPS.findIndex((s) => s.key === order.status);

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-sand pb-3">
        <div className="label flex items-center gap-2 text-moss">
          <span className="h-2 w-2 bg-vermilion" aria-hidden /> Preorder <span className="text-ink">{order.public_ref}</span>
        </div>
        <div className="flex items-center gap-2">
          {!order.livemode && <SimBadge />}
          <Badge tone={st.tone}>{st.label}</Badge>
        </div>
      </div>
      <h1 className="text-[34px] font-semibold leading-[1.02] sm:text-[48px]">{v.content.copy.title}</h1>

      {order.status === "pending_payment" && intent?.checkout_url && (
        <Notice tone="info" title="Payment not completed yet">
          <span className="block">If you closed the payment page, you can pick up where you left off.</span>
          <Link href={intent.checkout_url} className={cx(buttonClass("primary", "sm"), "mt-2")}>Continue to payment</Link>
        </Notice>
      )}
      {order.status === "payment_failed" && (
        <Notice tone="fail" title="Your payment was declined">
          Nothing was charged. <RetryPayment orderRef={order.public_ref} token={t ?? ""} />
        </Notice>
      )}
      {["paid", "in_production"].includes(order.status) && (
        <Notice tone="ok" title={order.status === "paid" ? "You’re in — payment confirmed" : "Your item is being made"}>
          {order.status === "paid"
            ? progress.thresholdMet
              ? "The production threshold has been reached. We’ll confirm production and ship within about three weeks."
              : `${progress.paidUnits} of ${progress.threshold} paid preorders so far. If the threshold isn’t reached by ${formatDate(progress.deadline)}, you’ll be refunded in full automatically.`
            : `${SELLER.name} is producing this run.`}
        </Notice>
      )}
      {(order.status === "refund_pending" || order.status === "refunded") && (
        <Notice tone="warn" title={order.status === "refunded" ? `Refunded ${formatINR(order.total_minor)}` : "Refund in progress"}>
          {refund?.reason}. {order.status === "refunded" && refund?.completed_at ? `Completed ${formatDateTime(refund.completed_at)}.` : ""}
        </Notice>
      )}

      {STEPS.some((s) => s.key === order.status) && (
        <ol className="grid grid-cols-4 gap-2" aria-label="Order progress">
          {STEPS.map((s, i) => (
            <li key={s.key} className="text-center text-xs">
              <div className={cx("h-1.5 rounded-full", i <= stepIndex ? "bg-ok" : "bg-sand")} />
              <div className={cx("mt-2", i <= stepIndex ? "font-medium text-ink" : "text-moss")}>{s.label}</div>
            </li>
          ))}
        </ol>
      )}

      <div className="grid gap-6 md:grid-cols-[300px_1fr]">
        <Card className="overflow-hidden">
          <Preview svg={v.previewSvg} className="bg-[#ECEBE5]" />
          <div className="px-4 py-3 text-xs text-moss">
            You bought design version {v.versionNo}.{current && current.id !== v.id ? ` The campaign has since moved to v${current.versionNo}; your order keeps v${v.versionNo}.` : ""}
          </div>
        </Card>
        <Card>
          <CardHeader title="Order details" />
          <div className="px-5 pb-3 sm:px-6">
            <KeyValue
              items={[
                ["Name", order.buyer_name],
                ["Email", order.buyer_email],
                ["Size", order.size],
                ["Quantity", order.quantity],
                ["Item price", formatINR(order.unit_price_minor)],
                ["Shipping", formatINR(order.shipping_minor)],
                ["Total", <span key="t" className="font-display text-lg">{formatINR(order.total_minor)}</span>],
                ["Placed", formatDateTime(order.created_at)],
                ["Paid", formatDateTime(order.paid_at)],
                ["Seller", SELLER.name],
              ]}
            />
          </div>
        </Card>
      </div>

      <Card>
        <CardHeader title="Payment events" subtitle="What Torii received from the payment provider. Repeated events are recognised and ignored." />
        {events.length === 0 ? (
          <p className="px-6 py-4 text-sm text-moss">No events yet.</p>
        ) : (
          <ul className="divide-y divide-sand text-sm">
            {events.map((e) => (
              <li key={e.id} className="flex flex-wrap items-center justify-between gap-2 px-5 py-2.5 sm:px-6">
                <span className="font-mono text-xs">{e.type}</span>
                <span className="text-ink-2">{e.detail}</span>
                <Badge tone={e.outcome === "processed" ? "ok" : e.outcome === "duplicate" ? "gold" : "neutral"}>{e.outcome === "duplicate" ? "Duplicate ignored" : e.outcome}</Badge>
                <span className="text-xs text-moss">{formatDateTime(e.received_at)}</span>
              </li>
            ))}
          </ul>
        )}
      </Card>

      {progress.threshold > 0 && ["live"].includes(c.sales_status) && (
        <div>
          <ProgressBar value={progress.paidUnits} max={progress.threshold} />
          <p className="mt-1 text-xs text-moss">{progress.paidUnits} of {progress.threshold} paid preorders · <Link href={`/c/${c.slug}`} className="underline">campaign page</Link></p>
        </div>
      )}
    </div>
  );
}
