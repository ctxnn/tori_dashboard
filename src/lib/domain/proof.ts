// Evidence for the hypothesis: "reusable assets, approvals and reporting make
// smaller creator collaborations easier to operate." Every figure is computed from
// recorded events (reviews, audit trail, orders, ledger) — nothing is typed in.
import { all, get } from "../db";
import { listLiveCampaigns, isApproved, getVersion } from "./campaigns";
import { buildStatement } from "./statements";
import { listKitVersions, listKits, listAssets } from "./kits";
import { nowIso } from "../util";

/** Pilot targets. These are our hypothesis, not industry benchmarks. */
export const TARGETS = {
  decisionHours: 48,
  roundsToApproval: 2,
  campaignsPerKit: 3,
  gateHitRate: 0.5,
  /** Pulse answers collected before the first campaign launches. */
  signalsBeforeLaunch: 200,
  /** Share of backers who back a second run during the pilot. */
  repeatBackerRate: 0.1,
  /** Share of shipped units that carry an authenticity tag. */
  taggedShare: 1,
};

export interface Decision {
  campaignId: string;
  title: string;
  versionNo: number;
  decision: "approved" | "changes_requested" | "rejected";
  reviewer: string;
  hours: number;
}

export interface GateSeries {
  campaignId: string;
  slug: string;
  title: string;
  threshold: number;
  launch: string;
  deadline: string;
  status: string;
  /** Cumulative paid units by day since launch (refunds subtract on the day they happen). */
  points: { day: number; date: string; units: number }[];
  daysToGate: number | null;
  durationDays: number;
  reached: boolean;
  closed: boolean;
}

export interface Proof {
  generatedAt: string;
  operate: {
    decisions: Decision[];
    medianDecisionHours: number | null;
    pending: { title: string; versionNo: number; hours: number }[];
    rounds: { title: string; rounds: number }[];
    medianRounds: number | null;
    blockedByRules: { title: string; reason: string }[];
    reviewedWithFailingRules: number;
  };
  reuse: {
    kits: number;
    kitVersions: { versionNo: number; proposals: number; campaigns: number }[];
    campaignsPerKit: number;
    creators: number;
    assets: { code: string; name: string; campaigns: number }[];
  };
  demand: {
    gates: GateSeries[];
    hitRate: number | null;
    closedCount: number;
    funnel: { started: number; declinedAttempts: number; paid: number; refunded: number; delivered: number };
  };
  money: {
    statements: { title: string; units: number; itemSales: number; licensor: number; creator: number; torii: number; seller: number; reconciled: boolean }[];
    totals: { licensor: number; creator: number; torii: number };
    allReconciled: boolean;
  };
  integrity: { duplicatesIgnored: number; chargedTwice: number; refundedTwice: number; ordersOnUnapprovedVersions: number; rejectedSignatures: number };
  discover: { signals: number; beforeFirstLaunch: number; converted: number; conversionRate: number; cities: number };
  retain: { backers: number; repeatBackers: number; repeatRate: number | null; followers: number; backersDayOrders: number };
  authentic: { shippedUnits: number; tagged: number; taggedShare: number | null; scans: number; unknownCodeScans: number };
}

const hoursBetween = (a: string, b: string) => (new Date(b).getTime() - new Date(a).getTime()) / 3_600_000;

function median(xs: number[]): number | null {
  if (!xs.length) return null;
  const s = [...xs].sort((a, b) => a - b);
  const m = Math.floor(s.length / 2);
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
}

const dayIndex = (from: string, at: string) => Math.max(0, Math.floor((new Date(at).getTime() - new Date(`${from}T00:00:00Z`).getTime()) / 86_400_000));

export function buildProof(): Proof {
  // ---- Easier to operate -------------------------------------------------
  const decisionRows = all<{ campaign_id: string; title: string; version_no: number; decision: Decision["decision"]; reviewer: string; submitted_at: string; created_at: string; checks: string }>(
    `SELECT v.campaign_id, json_extract(v.content_json, '$.copy.title') AS title, v.version_no, r.decision, u.name AS reviewer,
            v.submitted_at, r.created_at, v.check_results_json AS checks
     FROM reviews r JOIN campaign_versions v ON v.id = r.campaign_version_id JOIN users u ON u.id = r.reviewer_id
     WHERE v.submitted_at IS NOT NULL ORDER BY r.created_at`,
  );
  const decisions: Decision[] = decisionRows.map((r) => ({
    campaignId: r.campaign_id,
    title: r.title,
    versionNo: r.version_no,
    decision: r.decision,
    reviewer: r.reviewer,
    hours: Math.max(0, hoursBetween(r.submitted_at, r.created_at)),
  }));
  const now = nowIso();
  const pending = all<{ title: string; version_no: number; submitted_at: string }>(
    "SELECT json_extract(content_json, '$.copy.title') AS title, version_no, submitted_at FROM campaign_versions WHERE review_status = 'submitted' ORDER BY submitted_at",
  ).map((p) => ({ title: p.title, versionNo: p.version_no, hours: hoursBetween(p.submitted_at, now) }));

  // Review rounds a campaign needed before its first approval.
  const rounds: Proof["operate"]["rounds"] = [];
  const byCampaign = new Map<string, Decision[]>();
  for (const d of decisions) byCampaign.set(d.campaignId, [...(byCampaign.get(d.campaignId) ?? []), d]);
  for (const ds of byCampaign.values()) {
    const firstApproval = ds.findIndex((d) => d.decision === "approved");
    if (firstApproval >= 0) rounds.push({ title: ds[0].title, rounds: firstApproval + 1 });
  }

  const blockedByRules = all<{ detail_json: string; title: string }>(
    `SELECT a.detail_json, (SELECT json_extract(v.content_json, '$.copy.title') FROM campaign_versions v WHERE v.campaign_id = a.entity_id ORDER BY v.version_no DESC LIMIT 1) AS title
     FROM audit_log a WHERE a.action = 'campaign.submission_blocked' ORDER BY a.id DESC`,
  ).map((r) => {
    const failed = (JSON.parse(r.detail_json).failed as string[]) ?? [];
    return { title: r.title, reason: failed.join(", ") || "rule check" };
  });
  // Did any version reach a human reviewer while failing a declared rule? (Should be zero.)
  const reviewedWithFailingRules = decisionRows.filter((r) => (JSON.parse(r.checks) as { status: string }[]).some((c) => c.status === "fail")).length;

  // ---- Reuse --------------------------------------------------------------
  const kits = listKits();
  const kitVersions = kits.flatMap((k) =>
    listKitVersions(k.id)
      .reverse()
      .map((kv) => {
        const r = get<{ proposals: number; campaigns: number }>(
          "SELECT COUNT(*) AS proposals, COUNT(DISTINCT campaign_id) AS campaigns FROM campaign_versions WHERE kit_version_id = ?",
          kv.id,
        )!;
        return { versionNo: kv.versionNo, proposals: r.proposals, campaigns: r.campaigns };
      }),
  );
  const campaignCount = get<{ n: number }>("SELECT COUNT(*) AS n FROM campaigns")!.n;
  const creators = get<{ n: number }>("SELECT COUNT(DISTINCT creator_id) AS n FROM campaigns")!.n;
  const assetUse = new Map(
    all<{ asset: string; n: number }>(
      "SELECT json_extract(content_json, '$.design.artworkAssetId') AS asset, COUNT(DISTINCT campaign_id) AS n FROM campaign_versions GROUP BY 1",
    ).map((r) => [r.asset, r.n]),
  );
  const assets = kits.flatMap((k) => listAssets(k.id)).map((a) => ({ code: a.code, name: a.name, campaigns: assetUse.get(a.id) ?? 0 }));

  // ---- Demand ---------------------------------------------------------------
  const gates: GateSeries[] = listLiveCampaigns().map((c) => {
    const v = getVersion(c.published_version_id!)!;
    const o = v.content.offer;
    const events = all<{ quantity: number; paid_at: string; refunded_at: string | null }>(
      "SELECT quantity, paid_at, refunded_at FROM orders WHERE campaign_id = ? AND paid_at IS NOT NULL",
      c.id,
    );
    const firstVersion = all<{ offer: string }>(
      "SELECT json_extract(content_json, '$.offer.launchDate') AS offer FROM campaign_versions WHERE id IN (SELECT campaign_version_id FROM orders WHERE campaign_id = ?) ORDER BY version_no LIMIT 1",
      c.id,
    )[0];
    const launch = firstVersion?.offer ?? o.launchDate;
    const durationDays = Math.max(1, dayIndex(launch, `${o.deadline}T23:59:59Z`) + 1);
    const delta = new Array(durationDays + 1).fill(0);
    for (const e of events) {
      delta[Math.min(durationDays, dayIndex(launch, e.paid_at))] += e.quantity;
      if (e.refunded_at) delta[Math.min(durationDays, dayIndex(launch, e.refunded_at))] -= e.quantity;
    }
    const today = Math.min(durationDays, dayIndex(launch, now));
    let units = 0;
    let daysToGate: number | null = null;
    const points: GateSeries["points"] = [];
    for (let d = 0; d <= today; d++) {
      units += delta[d];
      if (daysToGate === null && units >= o.thresholdUnits) daysToGate = d;
      const date = new Date(new Date(`${launch}T00:00:00Z`).getTime() + d * 86_400_000).toISOString().slice(0, 10);
      points.push({ day: d, date, units });
    }
    const closed = ["production_released", "completed", "cancelled", "cancelling"].includes(c.sales_status) || now.slice(0, 10) > o.deadline;
    return {
      campaignId: c.id,
      slug: c.slug,
      title: v.content.copy.title,
      threshold: o.thresholdUnits,
      launch,
      deadline: o.deadline,
      status: c.sales_status,
      points,
      daysToGate,
      durationDays,
      reached: daysToGate !== null,
      closed,
    };
  });
  const closedGates = gates.filter((g) => g.closed);
  const f = get<{ started: number; paid: number; refunded: number; delivered: number }>(
    `SELECT COUNT(*) AS started, SUM(paid_at IS NOT NULL) AS paid, SUM(status = 'refunded') AS refunded, SUM(status = 'delivered') AS delivered FROM orders`,
  )!;
  const declinedAttempts = get<{ n: number }>("SELECT COUNT(*) AS n FROM payment_events WHERE type = 'payment.failed'")!.n;

  // ---- Money ----------------------------------------------------------------
  const statements = listLiveCampaigns()
    .map((c) => buildStatement(c.id))
    .filter((s) => s.recognised.itemSales > 0 || s.cash.capturedCount > 0)
    .map((s) => ({
      title: s.title,
      units: s.recognised.units,
      itemSales: s.recognised.itemSales,
      licensor: s.recognised.licensorRoyalty,
      creator: s.recognised.creatorEarnings,
      torii: s.recognised.toriiCommission,
      seller: s.recognised.sellerShare,
      reconciled: s.checks.every((x) => x.ok),
    }));

  // ---- Integrity ------------------------------------------------------------
  const n = (sql: string) => get<{ n: number }>(sql)?.n ?? 0;
  const orderVersions = all<{ v: string }>("SELECT DISTINCT campaign_version_id AS v FROM orders");

  // ---- Discovery, retention, authenticity ---------------------------------
  const firstLaunch = get<{ t: string | null }>("SELECT MIN(published_at) AS t FROM campaigns")?.t ?? null;
  const signals = n("SELECT COUNT(*) AS n FROM interest_signals");
  const converted = n(
    "SELECT COUNT(*) AS n FROM interest_signals s WHERE EXISTS (SELECT 1 FROM orders o JOIN campaigns c ON c.id = o.campaign_id WHERE c.kit_id = s.kit_id AND o.buyer_email = s.email AND o.paid_at IS NOT NULL)",
  );
  const backerCounts = all<{ n: number }>("SELECT COUNT(DISTINCT campaign_id) AS n FROM orders WHERE paid_at IS NOT NULL GROUP BY buyer_email");
  const repeatBackers = backerCounts.filter((r) => r.n > 1).length;
  const shippedUnits = n("SELECT COALESCE(SUM(quantity), 0) AS n FROM orders WHERE shipped_at IS NOT NULL");
  const tagged = n("SELECT COUNT(*) AS n FROM authenticity_codes");

  return {
    generatedAt: now,
    discover: {
      signals,
      beforeFirstLaunch: firstLaunch ? get<{ n: number }>("SELECT COUNT(*) AS n FROM interest_signals WHERE created_at < ?", firstLaunch)!.n : signals,
      converted,
      conversionRate: signals ? converted / signals : 0,
      cities: n("SELECT COUNT(DISTINCT city) AS n FROM interest_signals"),
    },
    retain: {
      backers: backerCounts.length,
      repeatBackers,
      repeatRate: backerCounts.length ? repeatBackers / backerCounts.length : null,
      followers: n("SELECT COUNT(DISTINCT user_id) AS n FROM follows"),
      backersDayOrders: n(
        "SELECT COUNT(*) AS n FROM orders o JOIN campaign_versions v ON v.id = o.campaign_version_id WHERE o.paid_at IS NOT NULL AND substr(o.created_at, 1, 10) < json_extract(v.content_json, '$.offer.launchDate')",
      ),
    },
    authentic: {
      shippedUnits,
      tagged,
      taggedShare: shippedUnits ? tagged / shippedUnits : null,
      scans: n("SELECT COUNT(*) AS n FROM authenticity_scans"),
      unknownCodeScans: n("SELECT COUNT(*) AS n FROM authenticity_scans WHERE found = 0"),
    },
    operate: {
      decisions,
      medianDecisionHours: median(decisions.map((d) => d.hours)),
      pending,
      rounds,
      medianRounds: median(rounds.map((r) => r.rounds)),
      blockedByRules,
      reviewedWithFailingRules,
    },
    reuse: {
      kits: kits.length,
      kitVersions,
      campaignsPerKit: kits.length ? campaignCount / kits.length : 0,
      creators,
      assets,
    },
    demand: {
      gates,
      hitRate: closedGates.length ? closedGates.filter((g) => g.reached).length / closedGates.length : null,
      closedCount: closedGates.length,
      funnel: { started: f.started, declinedAttempts, paid: f.paid ?? 0, refunded: f.refunded ?? 0, delivered: f.delivered ?? 0 },
    },
    money: {
      statements,
      totals: statements.reduce((t, s) => ({ licensor: t.licensor + s.licensor, creator: t.creator + s.creator, torii: t.torii + s.torii }), { licensor: 0, creator: 0, torii: 0 }),
      allReconciled: statements.every((s) => s.reconciled),
    },
    integrity: {
      duplicatesIgnored: n("SELECT COUNT(*) AS n FROM payment_event_deliveries WHERE outcome = 'duplicate'"),
      chargedTwice: n("SELECT COUNT(*) AS n FROM (SELECT order_id FROM ledger_entries WHERE entry_type = 'payment_captured' GROUP BY order_id HAVING COUNT(*) > 1)"),
      refundedTwice: n("SELECT COUNT(*) AS n FROM (SELECT order_id FROM ledger_entries WHERE entry_type = 'refund_paid' GROUP BY order_id HAVING COUNT(*) > 1)"),
      ordersOnUnapprovedVersions: orderVersions.filter((r) => {
        const v = getVersion(r.v);
        return !v || !isApproved(v);
      }).length,
      rejectedSignatures: n("SELECT COUNT(*) AS n FROM payment_event_deliveries WHERE outcome = 'rejected'"),
    },
  };
}
