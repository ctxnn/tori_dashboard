import { beforeEach, describe, expect, test } from "vitest";
import { freshDemo } from "./helpers";
import { all, closeDatabase, get, run } from "../src/lib/db";
import { getUser } from "../src/lib/domain/core";
import {
  getCampaignBySlug,
  getVersion,
  isApproved,
  latestVersion,
  publishVersion,
  saveDraft,
  submitVersion,
  type Campaign,
} from "../src/lib/domain/campaigns";
import { reviewVersion } from "../src/lib/domain/reviews";
import { campaignProgress, createOrder, getOrder, listOrders } from "../src/lib/domain/orders";
import { simulatorComplete, simulatorReplayAll, simulatorResend } from "../src/lib/domain/payments/simulator";
import { receiveProviderEvent } from "../src/lib/domain/payments/processor";
import { cancelCampaign, requestRefund } from "../src/lib/domain/refunds";
import { markDelivered, markShipped, releaseProduction } from "../src/lib/domain/fulfilment";
import { buildStatement } from "../src/lib/domain/statements";
import { allocate } from "../src/lib/money";
import { HttpError, RuleViolationError } from "../src/lib/errors";
import type { ContentInput } from "../src/lib/content";

const U = () => ({
  haruka: getUser("usr_haruka")!,
  daichi: getUser("usr_daichi")!,
  riya: getUser("usr_riya")!,
  kabir: getUser("usr_kabir")!,
  meera: getUser("usr_meera")!,
  aarav: getUser("usr_aarav")!,
});

const campaign = (slug: string) => getCampaignBySlug(slug)!;

function editable(c: Campaign): ContentInput {
  const v = latestVersion(c.id).content;
  return structuredClone({ productId: v.productId, layoutId: v.layoutId, design: v.design, copy: v.copy, distribution: v.distribution, offer: v.offer });
}

let n = 0;
async function buy(slug: string, quantity = 1, outcome: "succeeded" | "failed" = "succeeded") {
  const { order, checkoutUrl } = await createOrder({
    slug,
    size: getVersion(campaign(slug).published_version_id!)!.content.offer.sizes[0],
    quantity,
    buyerName: "Test Fan",
    buyerEmail: "test@fan.example",
    checkoutKey: `test-key-${++n}-${Date.now()}`,
  });
  const ref = checkoutUrl.split("/").pop()!;
  await simulatorComplete(ref, outcome);
  return { order: getOrder(order.id)!, ref };
}

const ledgerCount = (campaignId: string) => get<{ n: number; t: number | null }>("SELECT COUNT(*) n, SUM(amount_minor) t FROM ledger_entries WHERE campaign_id = ?", campaignId)!;

beforeEach(async () => {
  await freshDemo();
});

describe("Money", () => {
  test("illustrative terms at ₹699 × 100 delivered units", () => {
    const a = allocate(69900 * 100, { royaltyBps: 1000, creatorBps: 800, platformBps: 1200 });
    expect(a.licensorRoyalty).toBe(699000); // ₹6,990
    expect(a.creatorEarnings).toBe(559200); // ₹5,592
    expect(a.toriiCommission).toBe(838800); // ₹8,388
    expect(a.licensorRoyalty + a.creatorEarnings + a.toriiCommission + a.sellerShare).toBe(6990000);
  });

  test("rounding is deterministic and never loses a paisa", () => {
    const a = allocate(64933, { royaltyBps: 1250, creatorBps: 775, platformBps: 1199 });
    expect(a.licensorRoyalty + a.creatorEarnings + a.toriiCommission + a.sellerShare).toBe(64933);
    expect(Number.isInteger(a.sellerShare)).toBe(true);
  });
});

describe("Rule checks", () => {
  test("forbidden product is rejected by the backend with a plain reason", () => {
    const { kabir } = U();
    const glass = campaign("courier-chai-glass");
    const v = latestVersion(glass.id);
    expect(v.content.productId).toBe("glassware");
    let err: unknown;
    try {
      submitVersion({ versionId: v.id, actor: kabir });
    } catch (e) {
      err = e;
    }
    expect(err).toBeInstanceOf(RuleViolationError);
    const rv = err as RuleViolationError;
    expect(rv.status).toBe(422);
    const product = rv.checks.find((c) => c.id === "product")!;
    expect(product.status).toBe("fail");
    expect(product.message).toMatch(/Glassware isn't covered by this licence/);
    expect(product.message).toMatch(/T-shirt and Poster only/);
    expect(latestVersion(glass.id).reviewStatus).toBe("draft");
  });

  test("territory, price band, dates and wording are enforced", () => {
    const { riya } = U();
    const c = campaign("midnight-delivery-tee");
    const content = editable(c);
    content.offer.territory = "US";
    content.offer.priceMinor = 9900;
    content.offer.deadline = "2099-01-01";
    content.copy.tagline = "Totally unofficial merch";
    const v = saveDraft({ campaignId: c.id, actor: riya, content });
    const failed = v.checks.filter((x) => x.status === "fail").map((x) => x.id).sort();
    expect(failed).toEqual(["dates", "price", "terms", "territory"]);
    expect(() => submitVersion({ versionId: v.id, actor: riya })).toThrow(RuleViolationError);
  });

  test("artwork outside the kit is refused", () => {
    const { riya } = U();
    const c = campaign("midnight-delivery-tee");
    const content = editable(c);
    content.design.artworkAssetId = "ast_not_in_kit";
    const v = saveDraft({ campaignId: c.id, actor: riya, content });
    expect(v.checks.find((x) => x.id === "artwork")!.status).toBe("fail");
  });

  test("creators can't edit someone else's campaign", () => {
    const { kabir } = U();
    const c = campaign("midnight-delivery-tee");
    expect(() => saveDraft({ campaignId: c.id, actor: kabir, content: editable(c) })).toThrow(/Only the campaign's creator/);
  });
});

describe("Approval integrity", () => {
  test("only the named approver can approve", () => {
    const { daichi } = U();
    const pending = latestVersion(campaign("courier-club-pocket-tee").id);
    expect(pending.reviewStatus).toBe("submitted");
    expect(() => reviewVersion({ versionId: pending.id, actor: daichi, decision: "approved", comment: "" })).toThrow(/requires approval from Haruka Sato/);
  });

  test("approval does not carry over to a changed proposal", () => {
    const { haruka, riya } = U();
    const c = campaign("courier-club-pocket-tee");
    const v1 = latestVersion(c.id);
    reviewVersion({ versionId: v1.id, actor: haruka, decision: "approved", comment: "" });
    expect(isApproved(getVersion(v1.id)!)).toBe(true);

    // The creator changes the price after approval.
    const content = editable(c);
    content.offer.priceMinor = 59900;
    const v2 = saveDraft({ campaignId: c.id, actor: riya.id === c.creator_id ? riya : getUser(c.creator_id)!, content });
    expect(v2.id).not.toBe(v1.id);
    expect(v2.versionNo).toBe(v1.versionNo + 1);
    expect(v2.reviewStatus).toBe("draft");
    expect(isApproved(v2)).toBe(false);
    expect(() => publishVersion({ versionId: v2.id, actor: getUser(c.creator_id)! })).toThrow(/approved by the required approver/);
    // v1 stays approved and frozen.
    expect(getVersion(v1.id)!.content.offer.priceMinor).toBe(64900);
  });

  test("tampering with approved content invalidates the approval", () => {
    const c = campaign("midnight-delivery-tee");
    const live = getVersion(c.published_version_id!)!;
    expect(isApproved(live)).toBe(true);
    const tampered = { ...live.content, offer: { ...live.content.offer, priceMinor: 99900 } };
    run("UPDATE campaign_versions SET content_json = ? WHERE id = ?", JSON.stringify(tampered), live.id);
    expect(isApproved(getVersion(live.id)!)).toBe(false);
    expect(() => publishVersion({ versionId: live.id, actor: U().riya })).toThrow(/no longer matches/);
  });

  test("orders keep the version they were bought against", async () => {
    const { haruka, riya } = U();
    const c = campaign("midnight-delivery-tee");
    const v2 = c.published_version_id!;
    const first = await buy(c.slug);
    expect(first.order.campaign_version_id).toBe(v2);

    const v3 = latestVersion(c.id);
    expect(v3.reviewStatus).toBe("submitted");
    reviewVersion({ versionId: v3.id, actor: haruka, decision: "approved", comment: "" });
    publishVersion({ versionId: v3.id, actor: riya });
    const second = await buy(c.slug);
    expect(second.order.campaign_version_id).toBe(v3.id);
    expect(getOrder(first.order.id)!.campaign_version_id).toBe(v2);
  });
});

describe("Payments", () => {
  test("duplicate payment events never double-count an order", async () => {
    const c = campaign("midnight-delivery-tee");
    const before = campaignProgress(c).paidUnits;
    const { order, ref } = await buy(c.slug, 2);
    expect(order.status).toBe("paid");
    const ledgerAfterFirst = ledgerCount(c.id);
    for (let i = 0; i < 3; i++) {
      const r = await simulatorResend(ref);
      expect(r.outcome).toBe("duplicate");
    }
    await simulatorComplete(ref, "succeeded"); // a second "pay" click is also just a resend
    expect(campaignProgress(c).paidUnits).toBe(before + 2);
    expect(ledgerCount(c.id)).toEqual(ledgerAfterFirst);
    expect(all("SELECT * FROM payment_events WHERE order_id = ?", order.id)).toHaveLength(1);
  });

  test("events with a bad signature are rejected", async () => {
    const c = campaign("midnight-delivery-tee");
    const { order } = await createOrder({ slug: c.slug, size: "M", quantity: 1, buyerName: "Mallory", buyerEmail: "m@x.example", checkoutKey: "forged-1234" });
    const intent = get<{ provider_ref: string; amount_minor: number }>("SELECT * FROM payment_intents WHERE order_id = ?", order.id)!;
    const body = JSON.stringify({ id: "evt_forged", type: "payment.succeeded", paymentRef: intent.provider_ref, amountMinor: intent.amount_minor, currency: "INR", livemode: false, createdAt: "" });
    const r = await receiveProviderEvent("simulator", body, "deadbeef");
    expect(r.outcome).toBe("rejected");
    expect(getOrder(order.id)!.status).toBe("pending_payment");
  });

  test("resubmitting checkout returns the same order", async () => {
    const c = campaign("midnight-delivery-tee");
    const input = { slug: c.slug, size: "L", quantity: 1, buyerName: "Double Click", buyerEmail: "d@fan.example", checkoutKey: "same-key-123" };
    const a = await createOrder(input);
    const b = await createOrder(input);
    expect(b.order.id).toBe(a.order.id);
    expect(listOrders(c.id).filter((o) => o.checkout_key === "same-key-123")).toHaveLength(1);
  });

  test("server sets the price; clients can't", async () => {
    const c = campaign("midnight-delivery-tee");
    const { order } = await createOrder({ slug: c.slug, size: "M", quantity: 1, buyerName: "Cheap", buyerEmail: "c@x.example", checkoutKey: "price-hack-1", priceMinor: 100, totalMinor: 100 } as never);
    expect(order.unit_price_minor).toBe(69900);
    expect(order.total_minor).toBe(69900 + 7900);
  });

  test("declined payments can be retried", async () => {
    const c = campaign("midnight-delivery-tee");
    const { order } = await buy(c.slug, 1, "failed");
    expect(order.status).toBe("payment_failed");
    const { startPayment } = await import("../src/lib/domain/orders");
    const url = await startPayment(order);
    await simulatorComplete(url.split("/").pop()!, "succeeded");
    expect(getOrder(order.id)!.status).toBe("paid");
  });
});

describe("Threshold, production and fulfilment", () => {
  test("crossing the threshold enables release; delivery posts earnings once", async () => {
    const { meera } = U();
    const c = campaign("midnight-delivery-tee");
    expect(campaignProgress(c).paidUnits).toBe(45);
    expect(() => releaseProduction({ campaignId: c.id, actor: meera })).toThrow(/Not eligible yet: 45 of 50/);
    await buy(c.slug, 5);
    expect(campaignProgress(c).thresholdMet).toBe(true);
    releaseProduction({ campaignId: c.id, actor: meera });
    expect(listOrders(c.id, ["paid"])).toHaveLength(0);
    markShipped({ campaignId: c.id, actor: meera });
    markDelivered({ campaignId: c.id, actor: meera });
    const once = ledgerCount(c.id);
    markDelivered({ campaignId: c.id, actor: meera });
    expect(ledgerCount(c.id)).toEqual(once);
    const s = buildStatement(c.id);
    expect(s.recognised.units).toBe(50);
    expect(s.checks.every((x) => x.ok)).toBe(true);
    expect(getCampaignBySlug(c.slug)!.sales_status).toBe("completed");
  });

  test("releasing closes unpaid checkouts; a late payment is refunded", async () => {
    const { meera } = U();
    const c = campaign("midnight-delivery-tee");
    const pending = listOrders(c.id, ["pending_payment"])[0];
    const ref = get<{ provider_ref: string }>("SELECT provider_ref FROM payment_intents WHERE order_id = ?", pending.id)!.provider_ref;
    await buy(c.slug, 5);
    releaseProduction({ campaignId: c.id, actor: meera });
    expect(getOrder(pending.id)!.status).toBe("cancelled");
    await simulatorComplete(ref, "succeeded");
    expect(getOrder(pending.id)!.status).toBe("refunded");
    expect(buildStatement(c.id).checks.every((x) => x.ok)).toBe(true);
  });

  test("only operators can release or cancel", async () => {
    const { riya } = U();
    const c = campaign("monsoon-route-poster");
    expect(() => releaseProduction({ campaignId: c.id, actor: riya })).toThrow(HttpError);
    await expect(cancelCampaign({ campaignId: c.id, actor: riya, reason: "x" })).rejects.toThrow(/Only a Torii operator/);
  });
});

describe("Cancellation and refunds", () => {
  test("cancelling refunds each paid order exactly once, even when repeated", async () => {
    const { meera } = U();
    const c = campaign("monsoon-route-poster");
    const paid = listOrders(c.id, ["paid"]);
    expect(paid.length).toBe(13);
    const r1 = await cancelCampaign({ campaignId: c.id, actor: meera, reason: "Threshold not reached" });
    expect(r1.refunded).toBe(13);
    expect(r1.unpaidCancelled).toBe(2);
    expect(r1.status).toBe("cancelled");
    const after1 = ledgerCount(c.id);

    const r2 = await cancelCampaign({ campaignId: c.id, actor: meera, reason: "again" });
    expect(r2.refunded).toBe(13);
    for (const o of paid) await requestRefund({ orderId: o.id, actor: meera, reason: "again" });
    await simulatorReplayAll(all<{ provider_ref: string }>("SELECT provider_ref FROM payment_intents p JOIN orders o ON o.id = p.order_id WHERE o.campaign_id = ?", c.id).map((x) => x.provider_ref));
    expect(ledgerCount(c.id)).toEqual(after1);
    expect(all("SELECT * FROM refunds r JOIN orders o ON o.id = r.order_id WHERE o.campaign_id = ?", c.id)).toHaveLength(13);

    const s = buildStatement(c.id);
    expect(s.cash.netMinor).toBe(0);
    expect(s.cash.refundedCount).toBe(13);
    expect(s.checks.every((x) => x.ok)).toBe(true);
  });

  test("a payment that lands after cancellation is refunded automatically", async () => {
    const { meera } = U();
    const c = campaign("monsoon-route-poster");
    const pending = listOrders(c.id, ["pending_payment"])[0];
    const ref = get<{ provider_ref: string }>("SELECT provider_ref FROM payment_intents WHERE order_id = ?", pending.id)!.provider_ref;
    await cancelCampaign({ campaignId: c.id, actor: meera, reason: "Threshold not reached" });
    expect(getOrder(pending.id)!.status).toBe("cancelled");
    await simulatorComplete(ref, "succeeded");
    expect(getOrder(pending.id)!.status).toBe("refunded");
    expect(buildStatement(c.id).checks.every((x) => x.ok)).toBe(true);
  });
});

describe("Statements", () => {
  test("seeded completed campaign reproduces the brief's example, including refunds", () => {
    const s = buildStatement(campaign("first-flight-tee").id);
    expect(s.recognised.units).toBe(100);
    expect(s.recognised.itemSales).toBe(6990000);
    expect(s.recognised.licensorRoyalty).toBe(699000);
    expect(s.recognised.creatorEarnings).toBe(559200);
    expect(s.recognised.toriiCommission).toBe(838800);
    expect(s.cash.refundedCount).toBe(3);
    expect(s.cash.netMinor).toBe(s.buckets.find((b) => b.key === "delivered")!.totalMinor);
    expect(s.checks.every((x) => x.ok)).toBe(true);
    expect(s.dataMode).toBe("simulated");
  });

  test("a corrupted ledger is caught by reconciliation", () => {
    const c = campaign("first-flight-tee");
    run("UPDATE ledger_entries SET amount_minor = amount_minor + 1 WHERE id = (SELECT id FROM ledger_entries WHERE campaign_id = ? AND entry_type = 'creator_earnings' LIMIT 1)", c.id);
    const s = buildStatement(c.id);
    expect(s.checks.find((x) => x.label.startsWith("Recorded earnings"))!.ok).toBe(false);
  });
});

describe("Persistence", () => {
  test("the whole workflow survives a restart", async () => {
    const c = campaign("midnight-delivery-tee");
    const { order } = await buy(c.slug, 3);
    const before = buildStatement(c.id);
    closeDatabase(); // like restarting the server; the data dir stays
    const reopened = getOrder(order.id)!;
    expect(reopened.status).toBe("paid");
    expect(campaignProgress(getCampaignBySlug(c.slug)!).paidUnits).toBe(48);
    expect(buildStatement(c.id).cash).toEqual(before.cash);
  });
});

describe("Brief assistant", () => {
  test("offline suggestions only use approved kit assets and pass the rules", async () => {
    delete process.env.ANTHROPIC_API_KEY;
    const { suggestDirections } = await import("../src/lib/assist");
    const { assetsForVersion, latestKitVersion } = await import("../src/lib/domain/kits");
    const c = campaign("midnight-delivery-tee");
    const r = await suggestDirections({ campaignId: c.id, brief: "Two streetwear directions for my college audience", actor: U().riya, current: undefined });
    expect(r.source).toBe("offline");
    expect(r.directions).toHaveLength(2);
    const approved = new Set(assetsForVersion(latestKitVersion(c.kit_id)!).map((a) => a.id));
    for (const d of r.directions) {
      expect(approved.has(d.content.design.artworkAssetId)).toBe(true);
      expect(d.valid).toBe(true);
    }
    // Nothing is saved by asking for suggestions.
    expect(latestVersion(c.id).versionNo).toBe(3);
  });

  test("only the campaign's creator can use it", async () => {
    const { suggestDirections } = await import("../src/lib/assist");
    const c = campaign("midnight-delivery-tee");
    await expect(suggestDirections({ campaignId: c.id, brief: "something for my readers", actor: U().kabir, current: undefined })).rejects.toThrow(/Only the campaign's creator/);
  });
});

describe("Proof metrics", () => {
  test("are computed from recorded events and match the seeded history", async () => {
    const { buildProof } = await import("../src/lib/domain/proof");
    const p = buildProof();
    // Seeded decisions: First Flight, Monsoon, Midnight v1 (changes), Midnight v2.
    expect(p.operate.decisions).toHaveLength(4);
    expect(p.operate.decisions.find((d) => d.decision === "changes_requested")!.hours).toBeCloseTo(48, 0);
    expect(p.operate.medianDecisionHours).toBeCloseTo(24, 0);
    expect(p.operate.rounds.find((r) => r.title === "Midnight Delivery Tee")!.rounds).toBe(2);
    expect(p.operate.blockedByRules.length).toBeGreaterThanOrEqual(1);
    expect(p.operate.reviewedWithFailingRules).toBe(0);
    expect(p.reuse.campaignsPerKit).toBe(5);
    const first = p.demand.gates.find((g) => g.title === "First Flight Tee")!;
    expect(first.reached).toBe(true);
    const monsoon = p.demand.gates.find((g) => g.title === "Monsoon Route Poster")!;
    expect(monsoon.reached).toBe(false);
    expect(p.integrity).toMatchObject({ chargedTwice: 0, refundedTwice: 0, ordersOnUnapprovedVersions: 0 });
    expect(p.money.allReconciled).toBe(true);
    expect(p.money.totals.licensor).toBe(699000);
  });
});
