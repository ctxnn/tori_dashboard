// Live figures and events for the landing page, read from the demo database.
import { all, get } from "./db";
import { formatINR } from "./money";
import { getCampaignBySlug, getVersion, isApproved, listLiveCampaigns } from "./domain/campaigns";
import { assetDataUri, assetsForVersion, getKitVersion, latestKitVersion, listKits } from "./domain/kits";
import { campaignProgress } from "./domain/orders";
import { buildStatement } from "./domain/statements";
import { getUser } from "./domain/core";
import { productName } from "./catalog";
import type { Content } from "./content";
import type { CheckResult } from "./domain/rules";

export interface LandingStats {
  orders: number;
  capturedMinor: number;
  duplicates: number;
  paidTwice: number;
  refunds: number;
}

export function landingStats(): LandingStats {
  const n = (sql: string) => get<{ n: number | null }>(sql)?.n ?? 0;
  return {
    orders: n("SELECT COUNT(*) AS n FROM orders WHERE paid_at IS NOT NULL"),
    capturedMinor: n("SELECT SUM(amount_minor) AS n FROM ledger_entries WHERE entry_type = 'payment_captured'"),
    duplicates: n("SELECT COUNT(*) AS n FROM payment_event_deliveries WHERE outcome = 'duplicate'"),
    // A real check, not a slogan: orders with more than one recorded capture.
    paidTwice: n(
      "SELECT COUNT(*) AS n FROM (SELECT order_id FROM ledger_entries WHERE entry_type = 'payment_captured' GROUP BY order_id HAVING COUNT(*) > 1)",
    ),
    refunds: n("SELECT COUNT(*) AS n FROM refunds WHERE status = 'succeeded'"),
  };
}

/** Recent things that actually happened, phrased for a ticker. */
export function landingTicker(): string[] {
  const rows = all<{ action: string; actor: string | null; detail_json: string; entity_id: string; title: string | null; ref: string | null; total: number | null }>(
    `SELECT a.action, u.name AS actor, a.detail_json, a.entity_id,
       COALESCE((SELECT json_extract(v.content_json, '$.copy.title') FROM campaign_versions v WHERE v.campaign_id = a.entity_id ORDER BY v.version_no DESC LIMIT 1),
                (SELECT json_extract(v.content_json, '$.copy.title') FROM orders o JOIN campaign_versions v ON v.id = o.campaign_version_id WHERE o.id = a.entity_id)) AS title,
       (SELECT public_ref FROM orders WHERE id = a.entity_id) AS ref,
       (SELECT total_minor FROM orders WHERE id = a.entity_id) AS total
     FROM audit_log a LEFT JOIN users u ON u.id = a.actor_id
     WHERE a.action IN ('review.approved','review.changes_requested','campaign.submission_blocked','campaign.published','campaign.production_released',
                        'campaign.cancelled','kit.version_published','payment_event.payment.succeeded','payment_event.refund.succeeded','orders.delivered','campaign.completed')
     ORDER BY a.id DESC LIMIT 400`,
  );
  const out: string[] = [];
  const seen = new Set<string>();
  const perKind = new Map<string, number>();
  for (const r of rows) {
    // Keep the ticker varied: at most three lines of any one kind.
    const kind = r.action;
    if ((perKind.get(kind) ?? 0) >= 3) continue;
    const d = JSON.parse(r.detail_json) as Record<string, unknown>;
    let line: string | null = null;
    switch (r.action) {
      case "review.approved": line = `${r.actor} approved ${r.title} v${d.versionNo}`; break;
      case "review.changes_requested": line = `${r.actor} asked for changes to ${r.title}`; break;
      case "campaign.submission_blocked": line = `${r.title} refused by kit rules`; break;
      case "campaign.published": line = `${r.title} v${d.versionNo} went live`; break;
      case "campaign.production_released": line = `${r.title} released to production`; break;
      case "campaign.cancelled": line = `${r.title} cancelled · everyone refunded`; break;
      case "kit.version_published": line = `Sky Courier kit v${d.versionNo} published`; break;
      case "payment_event.payment.succeeded": line = r.ref ? `${r.ref} paid ${formatINR(r.total ?? 0)} · ${r.title}` : null; break;
      case "payment_event.refund.succeeded": line = r.ref ? `${r.ref} refunded ${formatINR(r.total ?? 0)}` : null; break;
      case "orders.delivered": line = `${d.count} orders delivered · ${r.title}`; break;
      case "campaign.completed": line = `${r.title} completed`; break;
    }
    if (line && !seen.has(line)) {
      seen.add(line);
      out.push(line);
      perKind.set(kind, (perKind.get(kind) ?? 0) + 1);
    }
    if (out.length >= 14) break;
  }
  return out;
}

export interface StoryData {
  kit: {
    name: string;
    owner: string;
    versionNo: number;
    assets: { code: string; name: string; uri: string }[];
    products: string[];
    blocked: string;
    territory: string;
    priceBand: string;
    approver: string;
  };
  offer: { content: Content; artworkUri: string | null; title: string; creator: string } | null;
  approval: { checks: CheckResult[]; hash: string; versionNo: number; approver: string } | null;
  gate: { paid: number; threshold: number; title: string } | null;
  money: { itemSales: number; units: number; royalty: number; creator: number; torii: number; seller: number; refunds: number; title: string } | null;
}

export function storyData(): StoryData | null {
  const kit = listKits()[0];
  if (!kit) return null;
  const kv = latestKitVersion(kit.id)!;
  const assets = assetsForVersion(kv);
  const approver = getUser(kv.rules.requiredApproverId);
  const tee = kv.rules.products.find((p) => p.productId === "tshirt") ?? kv.rules.products[0];

  // Prefer the live, still-open campaign for the offer / approval / gate scenes.
  const live = listLiveCampaigns().find((c) => c.sales_status === "live" && !campaignProgress(c).deadlinePassed) ?? listLiveCampaigns()[0];
  const v = live?.published_version_id ? getVersion(live.published_version_id) : undefined;
  const vkv = v ? getKitVersion(v.kitVersionId) : undefined;
  const art = v ? assets.find((a) => a.id === v.content.design.artworkAssetId) : undefined;
  const p = live ? campaignProgress(live) : null;

  const done = getCampaignBySlug("first-flight-tee") ?? listLiveCampaigns().find((c) => c.sales_status === "completed");
  const s = done ? buildStatement(done.id) : null;

  return {
    kit: {
      name: kit.property_name,
      owner: kit.owner_org,
      versionNo: kv.versionNo,
      assets: assets.map((a) => ({ code: a.code, name: a.name, uri: assetDataUri(a) })),
      products: kv.rules.products.map((x) => productName(x.productId)),
      blocked: "Glassware",
      territory: kv.rules.territories.join(", ") === "IN" ? "India only" : kv.rules.territories.join(", "),
      priceBand: tee ? `${formatINR(tee.minPriceMinor)}–${formatINR(tee.maxPriceMinor)}` : "",
      approver: approver?.name ?? "",
    },
    offer: v && live ? { content: v.content, artworkUri: art ? assetDataUri(art) : null, title: v.content.copy.title, creator: getUser(live.creator_id)?.name ?? "" } : null,
    approval:
      v && vkv && isApproved(v)
        ? { checks: v.checks.filter((c) => c.status === "pass"), hash: v.contentHash.slice(0, 12), versionNo: v.versionNo, approver: getUser(vkv.rules.requiredApproverId)?.name ?? "" }
        : null,
    gate: p && v ? { paid: p.paidUnits, threshold: p.threshold, title: v.content.copy.title } : null,
    money:
      s && s.recognised.itemSales > 0
        ? {
            itemSales: s.recognised.itemSales,
            units: s.recognised.units,
            royalty: s.recognised.licensorRoyalty,
            creator: s.recognised.creatorEarnings,
            torii: s.recognised.toriiCommission,
            seller: s.recognised.sellerShare,
            refunds: s.cash.refundedCount,
            title: s.title,
          }
        : null,
  };
}
