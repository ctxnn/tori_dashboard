// Commercial statement for one campaign. Recorded figures come from the ledger;
// they are cross-checked against a fresh recalculation from orders. Cost figures
// are labelled assumptions and never mixed into recorded totals.
import { all } from "../db";
import { allocate, applyBps, type Terms } from "../money";
import { nowIso } from "../util";
import { getCostAssumptions, getUser, type CostAssumptions, type User } from "./core";
import { getVersion, listVersions, requireCampaign, type Campaign } from "./campaigns";
import { getKit, type Kit } from "./kits";
import { listOrders, type Order, type OrderStatus } from "./orders";

export const BUCKETS: { key: OrderStatus; label: string; ja: string; holdsCash: boolean }[] = [
  { key: "pending_payment", label: "Awaiting payment", ja: "支払い待ち", holdsCash: false },
  { key: "payment_failed", label: "Payment declined", ja: "決済失敗", holdsCash: false },
  { key: "paid", label: "Paid", ja: "支払い済み", holdsCash: true },
  { key: "in_production", label: "In production", ja: "生産中", holdsCash: true },
  { key: "shipped", label: "Fulfilled (shipped)", ja: "発送済み", holdsCash: true },
  { key: "delivered", label: "Delivered", ja: "お届け済み", holdsCash: true },
  { key: "refund_pending", label: "Refund in progress", ja: "返金手続き中", holdsCash: true },
  { key: "refunded", label: "Refunded", ja: "返金済み", holdsCash: false },
  { key: "cancelled", label: "Cancelled before payment", ja: "お支払い前にキャンセル", holdsCash: false },
];

export interface Bucket {
  key: OrderStatus;
  label: string;
  ja: string;
  orders: number;
  units: number;
  totalMinor: number;
}

export interface AllocationTotals {
  units: number;
  orders: number;
  itemSales: number;
  shipping: number;
  licensorRoyalty: number;
  creatorEarnings: number;
  toriiCommission: number;
  sellerShare: number;
}

export interface Statement {
  campaign: Campaign;
  kit: Kit;
  creator: User;
  title: string;
  generatedAt: string;
  dataMode: "simulated" | "live" | "mixed" | "none";
  buckets: Bucket[];
  cash: { capturedMinor: number; capturedCount: number; refundedMinor: number; refundedCount: number; netMinor: number };
  recognised: AllocationTotals;
  recalculated: AllocationTotals;
  pipeline: AllocationTotals;
  byVersion: { versionNo: number; priceMinor: number; terms: Terms; delivered: number; itemSales: number; orders: number }[];
  checks: { label: string; ok: boolean; detail: string; ja: { label: string; detail: string } }[];
  assumptions: {
    costs: CostAssumptions;
    productId: string;
    productionCost: number;
    packagingCost: number;
    shippingCost: number;
    paymentFees: number;
    sellerContribution: number;
  };
  orders: (Order & { versionNo: number })[];
}

function emptyTotals(): AllocationTotals {
  return { units: 0, orders: 0, itemSales: 0, shipping: 0, licensorRoyalty: 0, creatorEarnings: 0, toriiCommission: 0, sellerShare: 0 };
}

function addOrder(t: AllocationTotals, o: Order, terms: Terms) {
  const item = o.unit_price_minor * o.quantity;
  const a = allocate(item, terms);
  t.units += o.quantity;
  t.orders += 1;
  t.itemSales += item;
  t.shipping += o.shipping_minor;
  t.licensorRoyalty += a.licensorRoyalty;
  t.creatorEarnings += a.creatorEarnings;
  t.toriiCommission += a.toriiCommission;
  t.sellerShare += a.sellerShare;
}

export function buildStatement(campaignId: string): Statement {
  const campaign = requireCampaign(campaignId);
  const kit = getKit(campaign.kit_id)!;
  const versions = new Map(listVersions(campaign.id).map((v) => [v.id, v]));
  const orders = listOrders(campaign.id).map((o) => ({ ...o, versionNo: versions.get(o.campaign_version_id)?.versionNo ?? 0 }));
  const display = (campaign.published_version_id && getVersion(campaign.published_version_id)) || [...versions.values()][0];

  const buckets: Bucket[] = BUCKETS.map((b) => {
    const os = orders.filter((o) => o.status === b.key);
    return { key: b.key, label: b.label, ja: b.ja, orders: os.length, units: os.reduce((s, o) => s + o.quantity, 0), totalMinor: os.reduce((s, o) => s + o.total_minor, 0) };
  });

  // Recorded, from the ledger.
  const ledger = all<{ entry_type: string; total: number; n: number; units: number | null }>(
    `SELECT l.entry_type, SUM(l.amount_minor) AS total, COUNT(*) AS n,
       SUM(CASE WHEN l.entry_type = 'item_sale_recognised' THEN o.quantity END) AS units
     FROM ledger_entries l LEFT JOIN orders o ON o.id = l.order_id WHERE l.campaign_id = ? GROUP BY l.entry_type`,
    campaign.id,
  );
  const L = (t: string) => ledger.find((r) => r.entry_type === t);
  const cash = {
    capturedMinor: L("payment_captured")?.total ?? 0,
    capturedCount: L("payment_captured")?.n ?? 0,
    refundedMinor: -(L("refund_paid")?.total ?? 0),
    refundedCount: L("refund_paid")?.n ?? 0,
    netMinor: 0,
  };
  cash.netMinor = cash.capturedMinor - cash.refundedMinor;
  const recognised: AllocationTotals = {
    units: L("item_sale_recognised")?.units ?? 0,
    orders: L("item_sale_recognised")?.n ?? 0,
    itemSales: L("item_sale_recognised")?.total ?? 0,
    shipping: L("shipping_recognised")?.total ?? 0,
    licensorRoyalty: L("licensor_royalty")?.total ?? 0,
    creatorEarnings: L("creator_earnings")?.total ?? 0,
    toriiCommission: L("torii_commission")?.total ?? 0,
    sellerShare: L("seller_share")?.total ?? 0,
  };

  // Recalculated, from orders and each order's own version terms.
  const recalculated = emptyTotals();
  const pipeline = emptyTotals();
  const byVersion = new Map<string, Statement["byVersion"][number]>();
  for (const o of orders) {
    const v = versions.get(o.campaign_version_id)!;
    const row = byVersion.get(v.id) ?? { versionNo: v.versionNo, priceMinor: v.content.offer.priceMinor, terms: v.content.terms, delivered: 0, itemSales: 0, orders: 0 };
    if (["paid", "in_production", "shipped", "delivered", "refund_pending", "refunded"].includes(o.status)) row.orders += 1;
    if (o.status === "delivered") {
      addOrder(recalculated, o, v.content.terms);
      row.delivered += o.quantity;
      row.itemSales += o.unit_price_minor * o.quantity;
    } else if (["paid", "in_production", "shipped"].includes(o.status)) {
      addOrder(pipeline, o, v.content.terms);
    }
    byVersion.set(v.id, row);
  }

  const holding = buckets.filter((b) => BUCKETS.find((x) => x.key === b.key)!.holdsCash);
  const heldMinor = holding.reduce((s, b) => s + b.totalMinor, 0);
  const heldOrders = holding.reduce((s, b) => s + b.orders, 0);
  const refundedOrders = buckets.find((b) => b.key === "refunded")!.orders;
  const same = (a: AllocationTotals, b: AllocationTotals) =>
    (["itemSales", "shipping", "licensorRoyalty", "creatorEarnings", "toriiCommission", "sellerShare", "units"] as const).every((k) => a[k] === b[k]);

  const checks = [
    {
      label: "Net cash matches orders still holding payment",
      ok: cash.netMinor === heldMinor,
      detail: `Ledger net ${cash.netMinor} vs ${heldOrders} orders holding ${heldMinor} (paise).`,
      ja: { label: "入金の純額が、決済を保持している注文と一致", detail: `台帳の純額 ${cash.netMinor} と、決済保持中の注文${heldOrders}件の合計 ${heldMinor}（パイサ）を比較。` },
    },
    {
      label: "Every captured payment is either held or refunded",
      ok: cash.capturedCount === heldOrders + refundedOrders && cash.refundedCount === refundedOrders,
      detail: `${cash.capturedCount} captures = ${heldOrders} held + ${refundedOrders} refunded; ${cash.refundedCount} refund entries.`,
      ja: { label: "すべての決済が、保持または返金のいずれかに該当", detail: `決済${cash.capturedCount}件 ＝ 保持${heldOrders}件 ＋ 返金${refundedOrders}件（返金記録${cash.refundedCount}件）。` },
    },
    {
      label: "Recorded earnings match a fresh recalculation from delivered orders",
      ok: same(recognised, recalculated),
      detail: `${recognised.units} delivered units recorded, ${recalculated.units} recalculated.`,
      ja: { label: "計上済みの収益が、お届け済み注文からの再計算と一致", detail: `お届け済み${recognised.units}点を計上、再計算でも${recalculated.units}点。` },
    },
    {
      label: "Shares add up to net item sales",
      ok: recognised.licensorRoyalty + recognised.creatorEarnings + recognised.toriiCommission + recognised.sellerShare === recognised.itemSales,
      detail: "Royalty + creator + Torii + seller share = net item sales.",
      ja: { label: "各取り分の合計が商品の純売上と一致", detail: "ロイヤリティ ＋ クリエイター ＋ Torii ＋ 販売者の取り分 ＝ 商品の純売上。" },
    },
  ];

  const costs = getCostAssumptions();
  const productId = display?.content.productId ?? "tshirt";
  const productionCost = recognised.units * (costs.productionMinor[productId] ?? 0);
  const packagingCost = recognised.orders * costs.packagingMinor;
  const shippingCost = recognised.orders * costs.shippingCostMinor;
  const paymentFees = applyBps(cash.capturedMinor, costs.paymentFeeBps);

  const modes = new Set(orders.filter((o) => o.status !== "pending_payment").map((o) => o.livemode));
  const dataMode = modes.size === 0 ? "none" : modes.size > 1 ? "mixed" : modes.has(1) ? "live" : "simulated";

  return {
    campaign,
    kit,
    creator: getUser(campaign.creator_id)!,
    title: display?.content.copy.title ?? campaign.slug,
    generatedAt: nowIso(),
    dataMode,
    buckets,
    cash,
    recognised,
    recalculated,
    pipeline,
    byVersion: [...byVersion.values()].sort((a, b) => a.versionNo - b.versionNo),
    checks,
    assumptions: {
      costs,
      productId,
      productionCost,
      packagingCost,
      shippingCost,
      paymentFees,
      sellerContribution: recognised.sellerShare + recognised.shipping - productionCost - packagingCost - shippingCost - paymentFees,
    },
    orders,
  };
}

function csvCell(v: unknown): string {
  const s = v === null || v === undefined ? "" : String(v);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

const rupees = (minor: number) => (minor / 100).toFixed(2);

export function statementCsv(s: Statement): string {
  const rows: unknown[][] = [
    ["Torii commercial statement"],
    ["Campaign", s.title],
    ["Property", s.kit.property_name],
    ["Creator", s.creator.name],
    ["Generated", s.generatedAt],
    ["Data", s.dataMode === "live" ? "Live" : "SIMULATED TEST DATA — not live commercial results"],
    [],
    ["Recorded (ledger)", "INR"],
    ["Payments captured", rupees(s.cash.capturedMinor)],
    ["Refunds paid", rupees(-s.cash.refundedMinor)],
    ["Net collected", rupees(s.cash.netMinor)],
    ["Delivered units", s.recognised.units],
    ["Net item sales (delivered)", rupees(s.recognised.itemSales)],
    ["Licensor royalty", rupees(s.recognised.licensorRoyalty)],
    ["Creator earnings", rupees(s.recognised.creatorEarnings)],
    ["Torii commission (revenue before expenses)", rupees(s.recognised.toriiCommission)],
    ["Seller share", rupees(s.recognised.sellerShare)],
    ["Shipping charged (delivered)", rupees(s.recognised.shipping)],
    [],
    ["Assumptions (illustrative, not recorded)", "INR"],
    ["Production cost", rupees(s.assumptions.productionCost)],
    ["Packaging", rupees(s.assumptions.packagingCost)],
    ["Courier", rupees(s.assumptions.shippingCost)],
    ["Payment processing", rupees(s.assumptions.paymentFees)],
    ["Estimated seller contribution", rupees(s.assumptions.sellerContribution)],
    [],
    ["Reconciliation"],
    ...s.checks.map((c) => [c.label, c.ok ? "OK" : "MISMATCH", c.detail]),
    [],
    ["Order", "Version", "Status", "Size", "Qty", "Unit price", "Shipping", "Total", "Paid at", "Delivered at", "Refunded at", "Mode"],
    ...s.orders.map((o) => [
      o.public_ref, `v${o.versionNo}`, o.status, o.size, o.quantity, rupees(o.unit_price_minor), rupees(o.shipping_minor), rupees(o.total_minor),
      o.paid_at ?? "", o.delivered_at ?? "", o.refunded_at ?? "", o.livemode ? "live" : "simulated",
    ]),
  ];
  return rows.map((r) => r.map(csvCell).join(",")).join("\n") + "\n";
}
