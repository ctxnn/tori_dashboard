// Production release and fulfilment. Earnings are recognised only on delivery, and
// each delivery posts its allocation entries exactly once (keyed by order).
import { all, get, run, tx } from "../db";
import { conflict, forbidden } from "../errors";
import { allocate } from "../money";
import { nowIso } from "../util";
import { audit, type User } from "./core";
import { getVersion, requireCampaign } from "./campaigns";
import { campaignProgress, type Order } from "./orders";
import { issueCodesForOrder } from "./authenticity";

function assertOperator(actor: User) {
  if (actor.role !== "operator") throw forbidden("Only a Torii operator can manage production and fulfilment");
}

export function releaseProduction(input: { campaignId: string; actor: User }) {
  assertOperator(input.actor);
  const c = requireCampaign(input.campaignId);
  if (c.sales_status !== "live") throw conflict("Only a live campaign can be released to production");
  const progress = campaignProgress(c);
  if (!progress.thresholdMet) {
    throw conflict(`Not eligible yet: ${progress.paidUnits} of ${progress.threshold} paid units.`);
  }
  return tx(() => {
    const ts = nowIso();
    run("UPDATE campaigns SET sales_status = 'production_released', released_at = ?, updated_at = ? WHERE id = ? AND sales_status = 'live'", ts, ts, c.id);
    const moved = run("UPDATE orders SET status = 'in_production' WHERE campaign_id = ? AND status = 'paid'", c.id).changes;
    // Preorders are now closed: unpaid checkouts are voided (a late payment is refunded automatically).
    const voided = run(
      "UPDATE orders SET status = 'cancelled', cancelled_at = ? WHERE campaign_id = ? AND status IN ('pending_payment','payment_failed')",
      ts, c.id,
    ).changes;
    audit(input.actor.id, "campaign.production_released", "campaign", c.id, { paidUnits: progress.paidUnits, ordersMoved: moved, unpaidVoided: voided });
    return { ordersMoved: moved, unpaidVoided: voided };
  });
}

function selectOrders(campaignId: string, statuses: string[], orderIds?: string[]): Order[] {
  const params: string[] = [campaignId, ...statuses];
  let sql = `SELECT * FROM orders WHERE campaign_id = ? AND status IN (${statuses.map(() => "?").join(",")})`;
  if (orderIds?.length) {
    sql += ` AND id IN (${orderIds.map(() => "?").join(",")})`;
    params.push(...orderIds);
  }
  return all<Order>(sql, ...params);
}

export function markShipped(input: { campaignId: string; actor: User; orderIds?: string[] }) {
  assertOperator(input.actor);
  const c = requireCampaign(input.campaignId);
  if (c.sales_status !== "production_released") throw conflict("Release the campaign to production before shipping");
  return tx(() => {
    const ts = nowIso();
    const orders = selectOrders(c.id, ["paid", "in_production"], input.orderIds);
    for (const o of orders) {
      run("UPDATE orders SET status = 'shipped', shipped_at = ? WHERE id = ? AND status IN ('paid','in_production')", ts, o.id);
      // Each unit leaves with its own authenticity tag.
      issueCodesForOrder(o);
    }
    if (orders.length) audit(input.actor.id, "orders.shipped", "campaign", c.id, { count: orders.length, tagsIssued: orders.reduce((s, o) => s + o.quantity, 0) });
    return { shipped: orders.length };
  });
}

const ALLOCATION_ENTRIES = [
  ["licensor_royalty", "licensorRoyalty"],
  ["creator_earnings", "creatorEarnings"],
  ["torii_commission", "toriiCommission"],
  ["seller_share", "sellerShare"],
] as const;

/** Post recognition + allocation entries for one delivered order. Idempotent per order. */
export function postDeliveryEntries(o: Order): void {
  const v = getVersion(o.campaign_version_id)!;
  const itemSales = o.unit_price_minor * o.quantity;
  const alloc = allocate(itemSales, v.content.terms);
  const ts = nowIso();
  const insert = (type: string, amount: number, key: string, memo: string) =>
    run(
      `INSERT OR IGNORE INTO ledger_entries (campaign_id, order_id, campaign_version_id, entry_type, amount_minor, livemode, idempotency_key, memo, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      o.campaign_id, o.id, o.campaign_version_id, type, amount, o.livemode, key, memo, ts,
    );
  insert("item_sale_recognised", itemSales, `deliver:${o.id}:item`, `${o.quantity} × item`);
  insert("shipping_recognised", o.shipping_minor, `deliver:${o.id}:shipping`, "Shipping charged");
  for (const [type, field] of ALLOCATION_ENTRIES) insert(type, alloc[field], `deliver:${o.id}:${type}`, `v${v.versionNo} terms`);
}

export function markDelivered(input: { campaignId: string; actor: User; orderIds?: string[] }) {
  assertOperator(input.actor);
  const c = requireCampaign(input.campaignId);
  return tx(() => {
    const ts = nowIso();
    const orders = selectOrders(c.id, ["shipped"], input.orderIds);
    for (const o of orders) {
      const changed = run("UPDATE orders SET status = 'delivered', delivered_at = ? WHERE id = ? AND status = 'shipped'", ts, o.id).changes;
      if (changed) postDeliveryEntries({ ...o, status: "delivered" });
    }
    if (orders.length) audit(input.actor.id, "orders.delivered", "campaign", c.id, { count: orders.length });
    const open = get<{ n: number }>(
      "SELECT COUNT(*) AS n FROM orders WHERE campaign_id = ? AND status IN ('paid','in_production','shipped','refund_pending')",
      c.id,
    )!.n;
    if (open === 0 && c.sales_status === "production_released") {
      run("UPDATE campaigns SET sales_status = 'completed', completed_at = ?, updated_at = ? WHERE id = ?", ts, ts, c.id);
      audit(input.actor.id, "campaign.completed", "campaign", c.id, {});
    }
    return { delivered: orders.length };
  });
}
