// Plain-language labels and tones for statuses. Client-safe.

type Tone = "neutral" | "ok" | "warn" | "fail" | "info" | "pine" | "vermilion" | "gold";

export const REVIEW_STATUS: Record<string, { label: string; ja: string; tone: Tone }> = {
  draft: { label: "Draft", ja: "下書き", tone: "neutral" },
  submitted: { label: "Awaiting review", ja: "審査待ち", tone: "info" },
  changes_requested: { label: "Changes requested", ja: "修正依頼", tone: "warn" },
  rejected: { label: "Rejected", ja: "却下", tone: "fail" },
  approved: { label: "Approved", ja: "承認済み", tone: "ok" },
  superseded: { label: "Superseded", ja: "旧版", tone: "neutral" },
};

export const SALES_STATUS: Record<string, { label: string; ja: string; tone: Tone }> = {
  not_published: { label: "Not published", ja: "未公開", tone: "neutral" },
  live: { label: "Taking preorders", ja: "予約受付中", tone: "vermilion" },
  production_released: { label: "In production", ja: "生産中", tone: "pine" },
  cancelling: { label: "Refunding", ja: "返金処理中", tone: "warn" },
  cancelled: { label: "Cancelled · refunded", ja: "中止・返金済み", tone: "fail" },
  completed: { label: "Completed", ja: "完了", tone: "ok" },
};

export const ORDER_STATUS: Record<string, { label: string; ja: string; tone: Tone }> = {
  pending_payment: { label: "Awaiting payment", ja: "支払い待ち", tone: "neutral" },
  payment_failed: { label: "Payment declined", ja: "決済失敗", tone: "fail" },
  paid: { label: "Paid", ja: "支払い済み", tone: "info" },
  in_production: { label: "In production", ja: "生産中", tone: "pine" },
  shipped: { label: "Shipped", ja: "発送済み", tone: "gold" },
  delivered: { label: "Delivered", ja: "お届け済み", tone: "ok" },
  refund_pending: { label: "Refund in progress", ja: "返金手続き中", tone: "warn" },
  refunded: { label: "Refunded", ja: "返金済み", tone: "fail" },
  cancelled: { label: "Cancelled", ja: "キャンセル", tone: "neutral" },
};

export const CHECK_STATUS: Record<string, { label: string; ja: string; tone: Tone; icon: string }> = {
  pass: { label: "Pass", ja: "適合", tone: "ok", icon: "✓" },
  fail: { label: "Fails", ja: "不適合", tone: "fail", icon: "✕" },
  warn: { label: "Advisory", ja: "注意", tone: "warn", icon: "!" },
  pending: { label: "Pending", ja: "確認中", tone: "info", icon: "…" },
  skipped: { label: "Not checked", ja: "対象外", tone: "neutral", icon: "–" },
};

export const ROLE_LABEL: Record<string, string> = {
  owner: "IP owner",
  creator: "Creator",
  fan: "Fan",
  operator: "Torii operator",
};

export const ROLE_LABEL_JA: Record<string, string> = {
  owner: "IPホルダー",
  creator: "クリエイター",
  fan: "ファン",
  operator: "Torii運営",
};

export function formatDate(iso: string | null | undefined, opts: Intl.DateTimeFormatOptions = { day: "numeric", month: "short", year: "numeric" }, locale = "en-IN") {
  if (!iso) return "—";
  const d = iso.length === 10 ? new Date(`${iso}T00:00:00Z`) : new Date(iso);
  return d.toLocaleDateString(locale, { timeZone: "UTC", ...opts });
}

export function formatDateTime(iso: string | null | undefined, locale = "en-IN") {
  if (!iso) return "—";
  return new Date(iso).toLocaleString(locale, { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit", timeZone: "Asia/Kolkata" });
}
