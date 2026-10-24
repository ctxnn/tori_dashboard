// A stateful, clearly-labelled payment simulator that behaves like an external
// provider: it keeps its own records (sim_* tables), signs events with a shared
// secret, and delivers them to Torii's webhook processor. It never moves money.
import { all, get, run } from "../../db";
import { hmac, id, nowIso, safeEqual } from "../../util";
import type { PaymentProvider, ProviderEvent, ProviderEventType } from "./provider";
import { receiveProviderEvent } from "./processor";

function secret(): string {
  return process.env.SIMULATOR_WEBHOOK_SECRET || "sim_dev_webhook_secret_change_me";
}

export interface SimPayment {
  ref: string;
  amount_minor: number;
  currency: string;
  description: string;
  status: "open" | "succeeded" | "failed";
  return_url: string;
  created_at: string;
}

interface SimEvent {
  id: string;
  payment_ref: string;
  type: ProviderEventType;
  body: string;
  signature: string;
  created_at: string;
}

export const getSimPayment = (ref: string) => get<SimPayment>("SELECT * FROM sim_payments WHERE ref = ?", ref);

function emit(paymentRef: string, type: ProviderEventType, extra: Partial<ProviderEvent> = {}): SimEvent {
  const p = getSimPayment(paymentRef)!;
  const event: ProviderEvent = {
    id: id("simevt"),
    type,
    paymentRef,
    amountMinor: p.amount_minor,
    currency: p.currency,
    livemode: false,
    createdAt: nowIso(),
    ...extra,
  };
  const body = JSON.stringify(event);
  const signature = hmac(secret(), body);
  run(
    "INSERT INTO sim_events (id, payment_ref, refund_ref, type, body, signature, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)",
    event.id, paymentRef, event.refundRef ?? null, type, body, signature, event.createdAt,
  );
  return { id: event.id, payment_ref: paymentRef, type, body, signature, created_at: event.createdAt };
}

/** Deliver an event to Torii exactly as a webhook would arrive: raw body + signature header. */
async function deliver(e: SimEvent) {
  return receiveProviderEvent("simulator", e.body, e.signature);
}

export const simulatorProvider: PaymentProvider = {
  name: "simulator",
  label: "Torii payment simulator (test mode)",
  livemode: false,

  async createPayment({ amountMinor, currency, description, returnUrl }) {
    const ref = id("simpay");
    run(
      "INSERT INTO sim_payments (ref, amount_minor, currency, description, status, return_url, created_at) VALUES (?, ?, ?, ?, 'open', ?, ?)",
      ref, amountMinor, currency, description, returnUrl, nowIso(),
    );
    return { providerRef: ref, checkoutUrl: `/pay/simulator/${ref}` };
  },

  async refund({ paymentRef, amountMinor, idempotencyKey }) {
    const existing = get<{ ref: string }>("SELECT ref FROM sim_refunds WHERE idempotency_key = ?", idempotencyKey);
    if (existing) {
      // Same key → same refund. Redeliver its original event; Torii will see a duplicate.
      const ev = get<SimEvent>("SELECT * FROM sim_events WHERE refund_ref = ? ORDER BY created_at LIMIT 1", existing.ref);
      if (ev) await deliver(ev);
      return { refundRef: existing.ref };
    }
    const p = getSimPayment(paymentRef);
    if (!p || p.status !== "succeeded") throw new Error("Simulator: payment can't be refunded");
    const ref = id("simref");
    run(
      "INSERT INTO sim_refunds (ref, payment_ref, idempotency_key, amount_minor, status, created_at) VALUES (?, ?, ?, ?, 'succeeded', ?)",
      ref, paymentRef, idempotencyKey, amountMinor, nowIso(),
    );
    const ev = emit(paymentRef, "refund.succeeded", { refundRef: ref, refundKey: idempotencyKey, amountMinor });
    await deliver(ev);
    return { refundRef: ref };
  },

  verifyEvent(rawBody, signature) {
    if (!signature || !safeEqual(hmac(secret(), rawBody), signature)) return null;
    try {
      return JSON.parse(rawBody) as ProviderEvent;
    } catch {
      return null;
    }
  },
};

// ---------------------------------------------------------------------------
// Actions available on the simulator's own "hosted checkout" page.
// ---------------------------------------------------------------------------

export async function simulatorComplete(ref: string, outcome: "succeeded" | "failed") {
  const p = getSimPayment(ref);
  if (!p) throw new Error("Unknown simulated payment");
  if (p.status !== "open") {
    // Already settled: behave like a provider retrying its webhook.
    return simulatorResend(ref);
  }
  run("UPDATE sim_payments SET status = ? WHERE ref = ? AND status = 'open'", outcome, ref);
  const ev = emit(ref, outcome === "succeeded" ? "payment.succeeded" : "payment.failed");
  return deliver(ev);
}

/** Redeliver the most recent payment event: demonstrates duplicate handling. */
export async function simulatorResend(ref: string) {
  const ev = get<SimEvent>(
    "SELECT * FROM sim_events WHERE payment_ref = ? AND type LIKE 'payment.%' ORDER BY created_at DESC LIMIT 1",
    ref,
  );
  if (!ev) throw new Error("Nothing to resend yet");
  return deliver(ev);
}

/** Redeliver every event the simulator has ever sent for these payments. */
export async function simulatorReplayAll(refs: string[]) {
  const results = [];
  for (const ref of refs) {
    for (const ev of all<SimEvent>("SELECT * FROM sim_events WHERE payment_ref = ? ORDER BY created_at", ref)) {
      results.push(await deliver(ev));
    }
  }
  return results;
}
