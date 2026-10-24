// Trusted backend processing of provider events. This is the only code that marks
// orders paid or refunded, and it is idempotent: the payment_events UNIQUE
// constraint and ledger idempotency keys mean a redelivered event changes nothing.
import { get, run, tx } from "../../db";
import { nowIso } from "../../util";
import { audit } from "../core";
import { getProvider, type ProviderEvent } from "./provider";

export type ProcessOutcome = "processed" | "duplicate" | "rejected" | "ignored";

export interface ProcessResult {
  outcome: ProcessOutcome;
  detail: string;
  eventId?: string;
  orderId?: string;
}

interface IntentRow {
  id: string;
  order_id: string;
  amount_minor: number;
  status: string;
  livemode: number;
}

interface OrderRow {
  id: string;
  campaign_id: string;
  campaign_version_id: string;
  status: string;
  total_minor: number;
}

function logDelivery(provider: string, ev: Partial<ProviderEvent> | null, outcome: ProcessOutcome, detail: string, orderId?: string) {
  run(
    "INSERT INTO payment_event_deliveries (provider, provider_event_id, type, order_id, outcome, detail, received_at) VALUES (?, ?, ?, ?, ?, ?, ?)",
    provider, ev?.id ?? null, ev?.type ?? null, orderId ?? null, outcome, detail, nowIso(),
  );
}

function applyPaymentSucceeded(ev: ProviderEvent, intent: IntentRow, order: OrderRow): { detail: string; needsRefund: boolean } {
  if (ev.amountMinor !== intent.amount_minor) {
    return { detail: `Amount mismatch: event ${ev.amountMinor} vs expected ${intent.amount_minor}. Not applied.`, needsRefund: false };
  }
  const ts = nowIso();
  run("UPDATE payment_intents SET status = 'succeeded', updated_at = ? WHERE id = ?", ts, intent.id);
  const changed = run(
    "UPDATE orders SET status = 'paid', paid_at = ? WHERE id = ? AND status IN ('pending_payment','payment_failed','cancelled')",
    ts, order.id,
  ).changes;
  run(
    `INSERT OR IGNORE INTO ledger_entries (campaign_id, order_id, campaign_version_id, entry_type, amount_minor, livemode, idempotency_key, memo, created_at)
     VALUES (?, ?, ?, 'payment_captured', ?, ?, ?, ?, ?)`,
    order.campaign_id, order.id, order.campaign_version_id, intent.amount_minor, intent.livemode, `capture:${intent.id}`, `Payment ${ev.paymentRef}`, ts,
  );
  const campaign = get<{ sales_status: string }>("SELECT sales_status FROM campaigns WHERE id = ?", order.campaign_id)!;
  // Money that arrives for a campaign that's been cancelled, or for an order voided
  // when preorders closed, goes straight back to the fan.
  const needsRefund = ["cancelling", "cancelled"].includes(campaign.sales_status) || order.status === "cancelled";
  return { detail: changed ? "Order marked paid" : `Order already ${order.status}; payment recorded`, needsRefund };
}

function applyRefundSucceeded(ev: ProviderEvent): { detail: string; orderId?: string } {
  const refund = get<{ id: string; order_id: string; amount_minor: number; status: string; livemode: number }>(
    "SELECT * FROM refunds WHERE id = ?",
    ev.refundKey ?? "",
  );
  if (!refund) return { detail: "No matching refund request" };
  const order = get<OrderRow>("SELECT * FROM orders WHERE id = ?", refund.order_id)!;
  const ts = nowIso();
  run("UPDATE refunds SET status = 'succeeded', provider_ref = ?, completed_at = ? WHERE id = ? AND status != 'succeeded'", ev.refundRef ?? null, ts, refund.id);
  run("UPDATE orders SET status = 'refunded', refunded_at = ? WHERE id = ? AND status = 'refund_pending'", ts, order.id);
  run(
    `INSERT OR IGNORE INTO ledger_entries (campaign_id, order_id, campaign_version_id, entry_type, amount_minor, livemode, idempotency_key, memo, created_at)
     VALUES (?, ?, ?, 'refund_paid', ?, ?, ?, ?, ?)`,
    order.campaign_id, order.id, order.campaign_version_id, -refund.amount_minor, refund.livemode, `refund:${refund.id}`, `Refund ${ev.refundRef ?? ""}`, ts,
  );
  return { detail: "Refund completed", orderId: order.id };
}

/**
 * Entry point for webhooks (HTTP route) and the in-process simulator alike.
 * Accepts the raw body so the signature is checked over exactly what was sent.
 */
export async function receiveProviderEvent(providerName: string, rawBody: string, signature: string | null): Promise<ProcessResult> {
  const provider = getProvider(providerName);
  const ev = provider.verifyEvent(rawBody, signature);
  if (!ev) {
    logDelivery(providerName, null, "rejected", "Signature check failed");
    return { outcome: "rejected", detail: "Signature check failed" };
  }

  let refundOrderId: string | undefined;
  const result = tx((): ProcessResult => {
    const inserted = run(
      "INSERT OR IGNORE INTO payment_events (id, provider, provider_event_id, type, payload_json, livemode, received_at) VALUES (?, ?, ?, ?, ?, ?, ?)",
      `${providerName}:${ev.id}`, providerName, ev.id, ev.type, rawBody, ev.livemode ? 1 : 0, nowIso(),
    ).changes;
    if (!inserted) {
      logDelivery(providerName, ev, "duplicate", "Already processed — no changes made");
      return { outcome: "duplicate", detail: "Already processed — no changes made", eventId: ev.id };
    }

    const intent = get<IntentRow>("SELECT * FROM payment_intents WHERE provider = ? AND provider_ref = ?", providerName, ev.paymentRef);
    if (!intent) {
      logDelivery(providerName, ev, "ignored", "No matching payment");
      return { outcome: "ignored", detail: "No matching payment", eventId: ev.id };
    }
    const order = get<OrderRow>("SELECT * FROM orders WHERE id = ?", intent.order_id)!;
    run("UPDATE payment_events SET order_id = ? WHERE provider = ? AND provider_event_id = ?", order.id, providerName, ev.id);

    let detail: string;
    switch (ev.type) {
      case "payment.succeeded": {
        const r = applyPaymentSucceeded(ev, intent, order);
        detail = r.detail;
        if (r.needsRefund) refundOrderId = order.id;
        break;
      }
      case "payment.failed":
        run("UPDATE payment_intents SET status = 'failed', updated_at = ? WHERE id = ? AND status = 'requires_payment'", nowIso(), intent.id);
        run("UPDATE orders SET status = 'payment_failed' WHERE id = ? AND status = 'pending_payment'", order.id);
        detail = "Payment declined";
        break;
      case "refund.succeeded":
        detail = applyRefundSucceeded(ev).detail;
        break;
      case "refund.failed":
        run("UPDATE refunds SET status = 'failed' WHERE id = ? AND status = 'pending'", ev.refundKey ?? "");
        detail = "Refund failed at provider; can be retried";
        break;
      default:
        detail = "Unhandled event type";
    }
    audit(null, `payment_event.${ev.type}`, "order", order.id, { eventId: ev.id, detail });
    logDelivery(providerName, ev, "processed", detail, order.id);
    return { outcome: "processed", detail, eventId: ev.id, orderId: order.id };
  });

  // A payment that lands after its campaign was cancelled is refunded straight away.
  if (refundOrderId) {
    const { requestRefund } = await import("../refunds");
    await requestRefund({ orderId: refundOrderId, actor: null, reason: "Preorders had closed before this payment completed" });
  }
  return result;
}
