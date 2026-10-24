// Plain-language labels and tones for statuses. Client-safe.

type Tone = "neutral" | "ok" | "warn" | "fail" | "info" | "pine" | "vermilion" | "gold";

export const REVIEW_STATUS: Record<string, { label: string; tone: Tone }> = {
  draft: { label: "Draft", tone: "neutral" },
  submitted: { label: "Awaiting review", tone: "info" },
  changes_requested: { label: "Changes requested", tone: "warn" },
  rejected: { label: "Rejected", tone: "fail" },
  approved: { label: "Approved", tone: "ok" },
  superseded: { label: "Superseded", tone: "neutral" },
};

export const SALES_STATUS: Record<string, { label: string; tone: Tone }> = {
  not_published: { label: "Not published", tone: "neutral" },
  live: { label: "Taking preorders", tone: "vermilion" },
  production_released: { label: "In production", tone: "pine" },
  cancelling: { label: "Refunding", tone: "warn" },
  cancelled: { label: "Cancelled · refunded", tone: "fail" },
  completed: { label: "Completed", tone: "ok" },
};

export const ORDER_STATUS: Record<string, { label: string; tone: Tone }> = {
  pending_payment: { label: "Awaiting payment", tone: "neutral" },
  payment_failed: { label: "Payment declined", tone: "fail" },
  paid: { label: "Paid", tone: "info" },
  in_production: { label: "In production", tone: "pine" },
  shipped: { label: "Shipped", tone: "gold" },
  delivered: { label: "Delivered", tone: "ok" },
  refund_pending: { label: "Refund in progress", tone: "warn" },
  refunded: { label: "Refunded", tone: "fail" },
  cancelled: { label: "Cancelled", tone: "neutral" },
};

export const CHECK_STATUS: Record<string, { label: string; tone: Tone; icon: string }> = {
  pass: { label: "Pass", tone: "ok", icon: "✓" },
  fail: { label: "Fails", tone: "fail", icon: "✕" },
  warn: { label: "Advisory", tone: "warn", icon: "!" },
  pending: { label: "Pending", tone: "info", icon: "…" },
  skipped: { label: "Not checked", tone: "neutral", icon: "–" },
};

export const ROLE_LABEL: Record<string, string> = {
  owner: "IP owner",
  creator: "Creator",
  fan: "Fan",
  operator: "Torii operator",
};

export function formatDate(iso: string | null | undefined, opts: Intl.DateTimeFormatOptions = { day: "numeric", month: "short", year: "numeric" }) {
  if (!iso) return "—";
  const d = iso.length === 10 ? new Date(`${iso}T00:00:00Z`) : new Date(iso);
  return d.toLocaleDateString("en-IN", { timeZone: "UTC", ...opts });
}

export function formatDateTime(iso: string | null | undefined) {
  if (!iso) return "—";
  return new Date(iso).toLocaleString("en-IN", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit", timeZone: "Asia/Kolkata" });
}
