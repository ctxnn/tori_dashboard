// Payment provider adapter. Torii talks to providers only through this interface,
// so the simulator can later be swapped for Razorpay, Stripe or similar without
// touching order, refund or ledger logic.
import { simulatorProvider } from "./simulator";

export type ProviderEventType = "payment.succeeded" | "payment.failed" | "refund.succeeded" | "refund.failed";

export interface ProviderEvent {
  /** Provider's unique event id; redeliveries reuse it. */
  id: string;
  type: ProviderEventType;
  paymentRef: string;
  refundRef?: string;
  /** Torii's refund id, echoed back as the idempotency key. */
  refundKey?: string;
  amountMinor: number;
  currency: string;
  livemode: boolean;
  createdAt: string;
}

export interface PaymentProvider {
  readonly name: string;
  readonly label: string;
  /** False for test mode / simulators. Stored on every record. */
  readonly livemode: boolean;
  createPayment(input: {
    reference: string;
    amountMinor: number;
    currency: string;
    description: string;
    returnUrl: string;
  }): Promise<{ providerRef: string; checkoutUrl: string }>;
  /** Must be idempotent on `idempotencyKey`. */
  refund(input: { paymentRef: string; amountMinor: number; idempotencyKey: string }): Promise<{ refundRef: string }>;
  /** Verify the signature and parse. Returns null if the event can't be trusted. */
  verifyEvent(rawBody: string, signature: string | null): ProviderEvent | null;
}

export function getProvider(name?: string): PaymentProvider {
  const wanted = name ?? process.env.PAYMENT_PROVIDER ?? "simulator";
  if (wanted === "simulator") return simulatorProvider;
  throw new Error(`Payment provider “${wanted}” isn't configured. Only the simulator ships with this prototype.`);
}
