// Fan preorders. Prices always come from the published campaign version on the
// server; the client only chooses size and quantity. Each order keeps the exact
// version it was bought against.
import { z } from "zod";
import { all, get, run, tx } from "../db";
import { HttpError, badRequest, conflict, notFound } from "../errors";
import { id, nowIso, publicRef, todayIso, token } from "../util";
import { audit, type User } from "./core";
import { getCampaignBySlug, getVersion, isApproved, type Campaign, type CampaignVersion } from "./campaigns";
import { getProvider } from "./payments/provider";

export type OrderStatus =
  | "pending_payment"
  | "payment_failed"
  | "paid"
  | "in_production"
  | "shipped"
  | "delivered"
  | "refund_pending"
  | "refunded"
  | "cancelled";

export interface Order {
  id: string;
  public_ref: string;
  access_token: string;
  campaign_id: string;
  campaign_version_id: string;
  fan_user_id: string | null;
  buyer_name: string;
  buyer_email: string;
  buyer_city: string;
  size: string;
  quantity: number;
  unit_price_minor: number;
  shipping_minor: number;
  total_minor: number;
  currency: string;
  status: OrderStatus;
  livemode: number;
  checkout_key: string;
  created_at: string;
  paid_at: string | null;
  shipped_at: string | null;
  delivered_at: string | null;
  refunded_at: string | null;
  cancelled_at: string | null;
}

/** Orders that count towards the production threshold. */
export const QUALIFYING: OrderStatus[] = ["paid", "in_production", "shipped", "delivered"];

export const getOrder = (orderId: string) => get<Order>("SELECT * FROM orders WHERE id = ?", orderId);
export const getOrderByRef = (ref: string) => get<Order>("SELECT * FROM orders WHERE public_ref = ?", ref);

export function listOrders(campaignId: string, statuses?: OrderStatus[]): Order[] {
  if (statuses?.length) {
    return all<Order>(
      `SELECT * FROM orders WHERE campaign_id = ? AND status IN (${statuses.map(() => "?").join(",")}) ORDER BY created_at DESC`,
      campaignId,
      ...statuses,
    );
  }
  return all<Order>("SELECT * FROM orders WHERE campaign_id = ? ORDER BY created_at DESC", campaignId);
}

export function listOrdersForFan(userId: string): Order[] {
  return all<Order>("SELECT * FROM orders WHERE fan_user_id = ? ORDER BY created_at DESC", userId);
}

export interface Progress {
  paidUnits: number;
  paidOrders: number;
  threshold: number;
  thresholdMet: boolean;
  deadline: string;
  deadlinePassed: boolean;
  daysLeft: number;
  pendingOrders: number;
}

export function campaignProgress(c: Campaign, v?: CampaignVersion): Progress {
  const version = v ?? (c.published_version_id ? getVersion(c.published_version_id) : undefined);
  const r = get<{ units: number | null; n: number }>(
    `SELECT SUM(quantity) AS units, COUNT(*) AS n FROM orders WHERE campaign_id = ? AND status IN (${QUALIFYING.map(() => "?").join(",")})`,
    c.id,
    ...QUALIFYING,
  )!;
  const pending = get<{ n: number }>("SELECT COUNT(*) AS n FROM orders WHERE campaign_id = ? AND status = 'pending_payment'", c.id)!.n;
  const threshold = version?.content.offer.thresholdUnits ?? 0;
  const deadline = version?.content.offer.deadline ?? "";
  const today = todayIso();
  const ms = new Date(`${deadline}T23:59:59Z`).getTime() - new Date(`${today}T00:00:00Z`).getTime();
  const paidUnits = r.units ?? 0;
  return {
    paidUnits,
    paidOrders: r.n,
    threshold,
    thresholdMet: threshold > 0 && paidUnits >= threshold,
    deadline,
    deadlinePassed: !!deadline && today > deadline,
    daysLeft: Math.max(0, Math.floor(ms / 86_400_000)),
    pendingOrders: pending,
  };
}

export const CheckoutSchema = z.object({
  slug: z.string().min(1),
  size: z.string().min(1, "Choose a size"),
  quantity: z.number().int().min(1).max(5, "Up to 5 per order"),
  buyerName: z.string().trim().min(2, "Enter your name").max(80),
  buyerEmail: z.email("Enter a valid email").max(120),
  buyerCity: z.string().trim().max(60).default(""),
  checkoutKey: z.string().min(8).max(64),
});

export function canOrder(c: Campaign | undefined): { ok: true; version: CampaignVersion } | { ok: false; reason: string } {
  if (!c || !c.published_version_id) return { ok: false, reason: "This campaign isn't published." };
  if (c.sales_status !== "live") {
    const reasons: Record<string, string> = {
      production_released: "Preorders have closed — this campaign is in production.",
      cancelling: "This campaign has been cancelled and refunds are being processed.",
      cancelled: "This campaign was cancelled and all payments were refunded.",
      completed: "This campaign has finished.",
    };
    return { ok: false, reason: reasons[c.sales_status] ?? "Preorders are closed." };
  }
  const v = getVersion(c.published_version_id)!;
  if (todayIso() > v.content.offer.deadline) return { ok: false, reason: "The preorder deadline has passed." };
  if (todayIso() < v.content.offer.launchDate) return { ok: false, reason: `Preorders open on ${v.content.offer.launchDate}.` };
  if (!isApproved(v)) return { ok: false, reason: "This version is awaiting fresh approval." };
  return { ok: true, version: v };
}

export async function createOrder(raw: unknown, fan?: User): Promise<{ order: Order; checkoutUrl: string }> {
  const parsed = CheckoutSchema.safeParse(raw);
  if (!parsed.success) throw badRequest(parsed.error.issues[0]?.message ?? "Check your details", parsed.error.issues);
  const input = parsed.data;
  const provider = getProvider();

  // A resubmitted checkout form (double click, refresh) returns the same order.
  const existing = get<Order>("SELECT * FROM orders WHERE checkout_key = ?", input.checkoutKey);
  if (existing) {
    const intent = get<{ checkout_url: string }>("SELECT checkout_url FROM payment_intents WHERE order_id = ?", existing.id);
    return { order: existing, checkoutUrl: intent?.checkout_url ?? `/orders/${existing.public_ref}?t=${existing.access_token}` };
  }

  const campaign = getCampaignBySlug(input.slug);
  if (!campaign) throw notFound("Campaign");
  const allowed = canOrder(campaign);
  if (!allowed.ok) throw conflict(allowed.reason);
  const v = allowed.version;
  if (!v.content.offer.sizes.includes(input.size)) throw badRequest("That size isn't offered");

  const unit = v.content.offer.priceMinor;
  const shipping = v.content.offer.shippingMinor;
  const total = unit * input.quantity + shipping;

  const order = tx(() => {
    const orderId = id("ord");
    const ts = nowIso();
    run(
      `INSERT INTO orders (id, public_ref, access_token, campaign_id, campaign_version_id, fan_user_id, buyer_name, buyer_email, buyer_city,
        size, quantity, unit_price_minor, shipping_minor, total_minor, status, livemode, checkout_key, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending_payment', ?, ?, ?)`,
      orderId, publicRef(), token(), campaign.id, v.id, fan?.role === "fan" ? fan.id : null, input.buyerName, input.buyerEmail.toLowerCase(),
      input.buyerCity, input.size, input.quantity, unit, shipping, total, provider.livemode ? 1 : 0, input.checkoutKey, ts,
    );
    run(
      "INSERT INTO payment_intents (id, order_id, provider, amount_minor, status, livemode, created_at, updated_at) VALUES (?, ?, ?, ?, 'requires_payment', ?, ?, ?)",
      id("pi"), orderId, provider.name, total, provider.livemode ? 1 : 0, ts, ts,
    );
    audit(fan?.id ?? null, "order.created", "order", orderId, { campaignId: campaign.id, versionId: v.id, total });
    return getOrder(orderId)!;
  });

  return { order, checkoutUrl: await startPayment(order) };
}

/** (Re)start payment for an order: used at checkout and after a declined payment. */
export async function startPayment(order: Order): Promise<string> {
  if (!["pending_payment", "payment_failed"].includes(order.status)) throw conflict("This order doesn't need payment");
  const provider = getProvider();
  const campaign = get<{ title: string }>("SELECT json_extract(content_json, '$.copy.title') AS title FROM campaign_versions WHERE id = ?", order.campaign_version_id);
  const { providerRef, checkoutUrl } = await provider.createPayment({
    reference: order.public_ref,
    amountMinor: order.total_minor,
    currency: order.currency,
    description: `${campaign?.title ?? "Torii preorder"} × ${order.quantity} (${order.size})`,
    returnUrl: `/orders/${order.public_ref}?t=${order.access_token}`,
  });
  tx(() => {
    run(
      "UPDATE payment_intents SET provider_ref = ?, checkout_url = ?, status = 'requires_payment', updated_at = ? WHERE order_id = ?",
      providerRef, checkoutUrl, nowIso(), order.id,
    );
    run("UPDATE orders SET status = 'pending_payment' WHERE id = ? AND status = 'payment_failed'", order.id);
  });
  return checkoutUrl;
}

export function requireOrderAccess(ref: string, accessToken: string | null, user?: User): Order {
  const o = getOrderByRef(ref);
  if (!o) throw notFound("Order");
  const ok = (accessToken && accessToken === o.access_token) || user?.role === "operator" || (user && o.fan_user_id === user.id);
  if (!ok) throw new HttpError(403, "This order link is incomplete. Use the link from your confirmation.");
  return o;
}

export interface PaymentEventRow {
  id: number;
  provider: string;
  provider_event_id: string | null;
  type: string | null;
  order_id: string | null;
  outcome: string;
  detail: string;
  received_at: string;
  public_ref: string | null;
}

export function deliveriesForCampaign(campaignId: string, limit = 60): PaymentEventRow[] {
  return all<PaymentEventRow>(
    `SELECT d.*, o.public_ref FROM payment_event_deliveries d JOIN orders o ON o.id = d.order_id
     WHERE o.campaign_id = ? ORDER BY d.id DESC LIMIT ?`,
    campaignId,
    limit,
  );
}

export function deliveriesForOrder(orderId: string): PaymentEventRow[] {
  return all<PaymentEventRow>(
    "SELECT d.*, NULL AS public_ref FROM payment_event_deliveries d WHERE d.order_id = ? ORDER BY d.id",
    orderId,
  );
}

export function paymentRefsForCampaign(campaignId: string): string[] {
  return all<{ provider_ref: string }>(
    "SELECT p.provider_ref FROM payment_intents p JOIN orders o ON o.id = p.order_id WHERE o.campaign_id = ? AND p.provider_ref IS NOT NULL",
    campaignId,
  ).map((r) => r.provider_ref);
}
