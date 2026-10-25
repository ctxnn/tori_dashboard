import "server-only";
import { campaignProgress, listOrdersForFan } from "@/lib/domain/orders";
import { codesForOrder } from "@/lib/domain/authenticity";
import { getCampaign, listLiveCampaigns, reviewQueue, summarise } from "@/lib/domain/campaigns";
import { all, get } from "@/lib/db";
import { productName } from "@/lib/catalog";
import { SALES_STATUS, ORDER_STATUS } from "@/lib/labels";
import { formatINR } from "@/lib/money";

/**
 * The bridge from the fan app into the collaboration workspace. Official collabs are made by
 * Indian creators from a Japanese owner's approved kit and sold as preorders behind a production
 * gate; the fan app shows them next to the manga and figures they belong with.
 *
 * Money in the workspace is integer paise; these view models carry it pre-formatted.
 */
export interface CollabCard {
  slug: string;
  href: string;
  title: string;
  property: string;
  owner: string;
  creator: string;
  creatorOrg: string;
  product: string;
  price: string;
  previewSvg: string;
  paidUnits: number;
  threshold: number;
  thresholdMet: boolean;
  daysLeft: number;
  open: boolean;
  status: string;
}

export function listCollabs(filter: { property?: string } = {}): CollabCard[] {
  const cards = listLiveCampaigns()
    .map(summarise)
    .filter((s) => s.published && (!filter.property || s.kit.property_name === filter.property))
    .map((s): CollabCard => {
      const v = s.published!;
      const p = campaignProgress(s.campaign);
      const open = s.campaign.sales_status === "live" && !p.deadlinePassed;
      return {
        slug: s.campaign.slug,
        href: `/c/${s.campaign.slug}`,
        title: v.content.copy.title,
        property: s.kit.property_name,
        owner: s.kit.owner_org,
        creator: s.creator.name,
        creatorOrg: s.creator.org,
        product: productName(v.content.productId),
        price: formatINR(v.content.offer.priceMinor),
        previewSvg: v.previewSvg,
        paidUnits: p.paidUnits,
        threshold: p.threshold,
        thresholdMet: p.thresholdMet,
        daysLeft: p.daysLeft,
        open,
        status: open
          ? p.thresholdMet ? "Gate reached · still open" : "Taking preorders"
          : s.campaign.sales_status === "live" ? (p.thresholdMet ? "Gate reached" : "Missed its gate")
          : SALES_STATUS[s.campaign.sales_status]?.label ?? "",
      };
    });
  // Open campaigns first, then the ones that are being made or have shipped.
  return cards.sort((a, b) => Number(b.open) - Number(a.open));
}

export interface CollabOrder {
  ref: string;
  href: string;
  title: string;
  property: string;
  size: string;
  quantity: number;
  total: string;
  status: string;
  previewSvg: string;
  codes: string[];
}

/** Collab preorders placed by a workspace fan, for their Shelf. */
export function collabOrdersFor(studioUserId: string | undefined): CollabOrder[] {
  if (!studioUserId) return [];
  return listOrdersForFan(studioUserId)
    .filter((o) => o.status !== "pending_payment" && o.status !== "payment_failed")
    .map((o) => {
      const c = getCampaign(o.campaign_id);
      const s = c ? summarise(c) : undefined;
      const v = s?.published ?? s?.latest;
      return {
        ref: o.public_ref,
        href: `/orders/${o.public_ref}`,
        title: v?.content.copy.title ?? "Collaboration",
        property: s?.kit.property_name ?? "",
        size: o.size,
        quantity: o.quantity,
        total: formatINR(o.total_minor),
        status: ORDER_STATUS[o.status]?.label ?? o.status,
        previewSvg: v?.previewSvg ?? "",
        codes: codesForOrder(o.id).map((x) => x.code),
      };
    });
}

export interface OwnerMerch {
  kits: { id: string; property: string; summary: string }[];
  collabs: CollabCard[];
  awaitingApproval: number;
  unitsBacked: number;
  /** Royalty recognised on delivered collab units, in paise. */
  royaltyMinor: number;
  royalty: string;
}

/** A Japanese publisher's merch programme in the workspace, matched by organisation name. */
export function merchForOwner(orgName: string): OwnerMerch {
  const kits = all<{ id: string; property_name: string; summary: string }>("SELECT id, property_name, summary FROM kits WHERE owner_org = ? ORDER BY created_at", orgName);
  const properties = new Set(kits.map((k) => k.property_name));
  const collabs = listCollabs().filter((c) => properties.has(c.property));
  const ids = kits.map((k) => k.id);
  const marks = ids.map(() => "?").join(",");
  const royaltyMinor = ids.length
    ? get<{ n: number | null }>(
        `SELECT SUM(l.amount_minor) AS n FROM ledger_entries l JOIN campaigns c ON c.id = l.campaign_id WHERE l.entry_type = 'licensor_royalty' AND c.kit_id IN (${marks})`,
        ...ids,
      )?.n ?? 0
    : 0;
  return {
    kits: kits.map((k) => ({ id: k.id, property: k.property_name, summary: k.summary })),
    collabs,
    awaitingApproval: kits.length ? reviewQueue(orgName).length : 0,
    unitsBacked: collabs.reduce((n, c) => n + c.paidUnits, 0),
    royaltyMinor,
    royalty: formatINR(royaltyMinor),
  };
}
