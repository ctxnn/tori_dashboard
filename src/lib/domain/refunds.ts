// Refunds and campaign cancellation. One refund row per order (UNIQUE), the
// provider is called with that row's id as idempotency key, and the ledger entry
// is keyed by refund id, so repeating any step never refunds twice.
import { all, get, run, tx } from "../db";
import { conflict, forbidden, notFound } from "../errors";
import { id, nowIso } from "../util";
import { audit, type User } from "./core";
import { requireCampaign } from "./campaigns";
import { getOrder, type Order } from "./orders";
import { getProvider } from "./payments/provider";

export interface Refund {
  id: string;
  order_id: string;
  amount_minor: number;
  reason: string;
  status: "pending" | "succeeded" | "failed";
  provider_ref: string | null;
  livemode: number;
  created_at: string;
  completed_at: string | null;
}

const REFUNDABLE = ["paid", "in_production", "refund_pending"];

export async function requestRefund(input: { orderId: string; actor: User | null; reason: string }): Promise<Order> {
  if (input.actor && input.actor.role !== "operator") throw forbidden("Only a Torii operator can issue refunds");
  const prepared = tx(() => {
    const order = getOrder(input.orderId);
    if (!order) throw notFound("Order");
    if (order.status === "refunded") return null;
    if (!REFUNDABLE.includes(order.status)) {
      throw conflict(`Order ${order.public_ref} is ${order.status.replace("_", " ")} and can't be refunded here.`);
    }
    const intent = get<{ provider: string; provider_ref: string; status: string }>(
      "SELECT provider, provider_ref, status FROM payment_intents WHERE order_id = ?",
      order.id,
    );
    if (!intent || intent.status !== "succeeded") throw conflict("There's no completed payment to refund");
    let refund = get<Refund>("SELECT * FROM refunds WHERE order_id = ?", order.id);
    if (refund?.status === "succeeded") return null;
    if (!refund) {
      const refundId = id("rfd");
      run(
        "INSERT INTO refunds (id, order_id, amount_minor, reason, status, requested_by, livemode, created_at) VALUES (?, ?, ?, ?, 'pending', ?, ?, ?)",
        refundId, order.id, order.total_minor, input.reason, input.actor?.id ?? null, order.livemode, nowIso(),
      );
      refund = get<Refund>("SELECT * FROM refunds WHERE id = ?", refundId)!;
      audit(input.actor?.id ?? null, "refund.requested", "order", order.id, { refundId, amount: order.total_minor, reason: input.reason });
    } else if (refund.status === "failed") {
      run("UPDATE refunds SET status = 'pending' WHERE id = ?", refund.id);
    }
    run("UPDATE orders SET status = 'refund_pending' WHERE id = ? AND status IN ('paid','in_production')", order.id);
    return { refund, provider: intent.provider, paymentRef: intent.provider_ref };
  });
  if (prepared) {
    await getProvider(prepared.provider).refund({
      paymentRef: prepared.paymentRef,
      amountMinor: prepared.refund.amount_minor,
      idempotencyKey: prepared.refund.id,
    });
  }
  return getOrder(input.orderId)!;
}

export function refundsForCampaign(campaignId: string): (Refund & { public_ref: string })[] {
  return all(
    "SELECT r.*, o.public_ref FROM refunds r JOIN orders o ON o.id = r.order_id WHERE o.campaign_id = ? ORDER BY r.created_at DESC",
    campaignId,
  );
}

export interface CancellationSummary {
  refunded: number;
  stillPending: number;
  unpaidCancelled: number;
  status: string;
}

/**
 * Cancel a campaign: close preorders, void unpaid orders and refund every paid one.
 * Safe to run again: it only picks up whatever is still outstanding.
 */
export async function cancelCampaign(input: { campaignId: string; actor: User; reason: string }): Promise<CancellationSummary> {
  if (input.actor.role !== "operator") throw forbidden("Only a Torii operator can cancel a campaign");
  const c = requireCampaign(input.campaignId);
  if (!["live", "production_released", "cancelling", "cancelled"].includes(c.sales_status)) {
    throw conflict("Only published campaigns can be cancelled");
  }
  const unpaidCancelled = tx(() => {
    const shipped = get<{ n: number }>("SELECT COUNT(*) AS n FROM orders WHERE campaign_id = ? AND status IN ('shipped','delivered')", c.id)!.n;
    if (shipped > 0) throw conflict("Some orders have already shipped. Refund individual orders instead of cancelling the campaign.");
    const ts = nowIso();
    if (c.sales_status !== "cancelling" && c.sales_status !== "cancelled") {
      run(
        "UPDATE campaigns SET sales_status = 'cancelling', cancel_reason = ?, updated_at = ? WHERE id = ?",
        input.reason.trim() || "Cancelled by operator", ts, c.id,
      );
      audit(input.actor.id, "campaign.cancellation_started", "campaign", c.id, { reason: input.reason });
    }
    const voided = run(
      "UPDATE orders SET status = 'cancelled', cancelled_at = ? WHERE campaign_id = ? AND status IN ('pending_payment','payment_failed')",
      ts, c.id,
    ).changes;
    run(
      "UPDATE payment_intents SET status = 'cancelled', updated_at = ? WHERE status IN ('requires_payment','failed') AND order_id IN (SELECT id FROM orders WHERE campaign_id = ?)",
      ts, c.id,
    );
    return voided;
  });

  const toRefund = all<{ id: string }>(
    "SELECT id FROM orders WHERE campaign_id = ? AND status IN ('paid','in_production','refund_pending') ORDER BY created_at",
    c.id,
  );
  for (const o of toRefund) {
    await requestRefund({ orderId: o.id, actor: null, reason: `Campaign cancelled: ${input.reason || "threshold not reached"}` });
  }
  return finaliseCancellation(c.id, unpaidCancelled);
}

function finaliseCancellation(campaignId: string, unpaidCancelled: number): CancellationSummary {
  return tx(() => {
    const outstanding = get<{ n: number }>(
      "SELECT COUNT(*) AS n FROM orders WHERE campaign_id = ? AND status IN ('paid','in_production','refund_pending')",
      campaignId,
    )!.n;
    const refunded = get<{ n: number }>("SELECT COUNT(*) AS n FROM orders WHERE campaign_id = ? AND status = 'refunded'", campaignId)!.n;
    if (outstanding === 0) {
      const changed = run(
        "UPDATE campaigns SET sales_status = 'cancelled', cancelled_at = ?, updated_at = ? WHERE id = ? AND sales_status = 'cancelling'",
        nowIso(), nowIso(), campaignId,
      ).changes;
      if (changed) audit(null, "campaign.cancelled", "campaign", campaignId, { refunded });
    }
    const status = get<{ sales_status: string }>("SELECT sales_status FROM campaigns WHERE id = ?", campaignId)!.sales_status;
    return { refunded, stillPending: outstanding, unpaidCancelled, status };
  });
}
