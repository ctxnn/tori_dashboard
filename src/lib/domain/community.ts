// Community retention: follows, backer status, backers' day and the fan passport.
//
// A "backer" of a property is a fan with at least one paid preorder on any of its
// campaigns that wasn't refunded. Backers get one day of early access before a
// campaign opens to everyone — a reason to come back that costs the owner nothing.
import { all, get, run } from "../db";
import { badRequest, forbidden } from "../errors";
import { nowIso, todayIso } from "../util";
import { audit, getUser, type User } from "./core";
import { getVersion } from "./campaigns";
import { getKit } from "./kits";
import { codesForOrder } from "./authenticity";

export const BACKERS_DAYS = 1;
const BACKED = "('paid','in_production','shipped','delivered')";

export type FollowTarget = "kit" | "creator";

function assertTarget(type: FollowTarget, targetId: string) {
  const ok = type === "kit" ? !!getKit(targetId) : getUser(targetId)?.role === "creator";
  if (!ok) throw badRequest(type === "kit" ? "No such property" : "No such creator");
}

export function follow(user: User, type: FollowTarget, targetId: string): void {
  if (user.role !== "fan") throw forbidden("Only fans can follow properties and creators");
  assertTarget(type, targetId);
  const r = run("INSERT OR IGNORE INTO follows (user_id, target_type, target_id, created_at) VALUES (?, ?, ?, ?)", user.id, type, targetId, nowIso());
  if (r.changes) audit(user.id, "follow.added", type, targetId);
}

export function unfollow(user: User, type: FollowTarget, targetId: string): void {
  if (user.role !== "fan") throw forbidden("Only fans can follow properties and creators");
  const r = run("DELETE FROM follows WHERE user_id = ? AND target_type = ? AND target_id = ?", user.id, type, targetId);
  if (r.changes) audit(user.id, "follow.removed", type, targetId);
}

export function isFollowing(userId: string | undefined, type: FollowTarget, targetId: string): boolean {
  if (!userId) return false;
  return !!get("SELECT 1 FROM follows WHERE user_id = ? AND target_type = ? AND target_id = ?", userId, type, targetId);
}

export interface FollowRow {
  type: FollowTarget;
  id: string;
  label: string;
  sub: string;
  since: string;
}

export function followsFor(userId: string): FollowRow[] {
  return all<{ target_type: FollowTarget; target_id: string; created_at: string }>(
    "SELECT target_type, target_id, created_at FROM follows WHERE user_id = ? ORDER BY created_at",
    userId,
  ).flatMap((f): FollowRow[] => {
    if (f.target_type === "kit") {
      const k = getKit(f.target_id);
      return k ? [{ type: f.target_type, id: k.id, label: k.property_name, sub: k.owner_org, since: f.created_at }] : [];
    }
    const u = getUser(f.target_id);
    return u ? [{ type: f.target_type, id: u.id, label: u.name, sub: u.org, since: f.created_at }] : [];
  });
}

export function backerStatus(userId: string | undefined, kitId: string): { backed: number; since: string | null } {
  if (!userId) return { backed: 0, since: null };
  const r = get<{ n: number; since: string | null }>(
    `SELECT COUNT(DISTINCT o.campaign_id) AS n, MIN(o.paid_at) AS since FROM orders o JOIN campaigns c ON c.id = o.campaign_id
     WHERE o.fan_user_id = ? AND c.kit_id = ? AND o.status IN ${BACKED}`,
    userId,
    kitId,
  )!;
  return { backed: r.n, since: r.since };
}

function addDays(iso: string, days: number): string {
  const d = new Date(`${iso}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

export interface LaunchPhase {
  phase: "before" | "backers" | "open";
  launchDate: string;
  backersFrom: string;
}

export function launchPhase(launchDate: string): LaunchPhase {
  const backersFrom = addDays(launchDate, -BACKERS_DAYS);
  const today = todayIso();
  return { launchDate, backersFrom, phase: today >= launchDate ? "open" : today >= backersFrom ? "backers" : "before" };
}

// ---------------------------------------------------------------------------
// Passport
// ---------------------------------------------------------------------------

export interface Stamp {
  campaignId: string;
  slug: string;
  title: string;
  property: string;
  creator: string;
  versionNo: number;
  previewSvg: string;
  status: string;
  units: number;
  orderRef: string;
  orderToken: string;
  paidAt: string;
  codes: { code: string; serialNo: number }[];
  runSize: number;
}

export interface Drop {
  slug: string;
  title: string;
  creator: string;
  priceMinor: number;
  phase: LaunchPhase;
  earlyAccess: boolean;
  alreadyBacked: boolean;
  why: string;
}

export interface Passport {
  stamps: Stamp[];
  refunded: { title: string; orderRef: string; orderToken: string }[];
  since: string | null;
  follows: FollowRow[];
  drops: Drop[];
}

export function passportFor(user: User): Passport {
  const orders = all<{
    id: string; public_ref: string; access_token: string; campaign_id: string; campaign_version_id: string; status: string; quantity: number; paid_at: string | null; slug: string; kit_id: string; creator_id: string;
  }>(
    `SELECT o.id, o.public_ref, o.access_token, o.campaign_id, o.campaign_version_id, o.status, o.quantity, o.paid_at, c.slug, c.kit_id, c.creator_id
     FROM orders o JOIN campaigns c ON c.id = o.campaign_id WHERE o.fan_user_id = ? AND o.paid_at IS NOT NULL ORDER BY o.paid_at`,
    user.id,
  );
  const stamps: Stamp[] = [];
  const refunded: Passport["refunded"] = [];
  for (const o of orders) {
    const v = getVersion(o.campaign_version_id)!;
    if (!["paid", "in_production", "shipped", "delivered"].includes(o.status)) {
      refunded.push({ title: v.content.copy.title, orderRef: o.public_ref, orderToken: o.access_token });
      continue;
    }
    stamps.push({
      campaignId: o.campaign_id,
      slug: o.slug,
      title: v.content.copy.title,
      property: getKit(o.kit_id)?.property_name ?? "",
      creator: getUser(o.creator_id)?.name ?? "",
      versionNo: v.versionNo,
      previewSvg: v.previewSvg,
      status: o.status,
      units: o.quantity,
      orderRef: o.public_ref,
      orderToken: o.access_token,
      paidAt: o.paid_at!,
      codes: codesForOrder(o.id),
      runSize: get<{ n: number }>("SELECT COUNT(*) AS n FROM authenticity_codes WHERE campaign_id = ?", o.campaign_id)!.n,
    });
  }

  const follows = followsFor(user.id);
  const kitIds = follows.filter((f) => f.type === "kit").map((f) => f.id);
  const creatorIds = follows.filter((f) => f.type === "creator").map((f) => f.id);
  const backedCampaigns = new Set(stamps.map((s) => s.campaignId));
  const live = all<{ id: string; slug: string; kit_id: string; creator_id: string; published_version_id: string }>(
    "SELECT id, slug, kit_id, creator_id, published_version_id FROM campaigns WHERE sales_status = 'live' AND published_version_id IS NOT NULL ORDER BY published_at DESC",
  );
  const drops: Drop[] = live.flatMap((c) => {
    const byKit = kitIds.includes(c.kit_id);
    const byCreator = creatorIds.includes(c.creator_id);
    if (!byKit && !byCreator) return [];
    const v = getVersion(c.published_version_id)!;
    if (todayIso() > v.content.offer.deadline) return [];
    const phase = launchPhase(v.content.offer.launchDate);
    const creator = getUser(c.creator_id)?.name ?? "";
    return [{
      slug: c.slug,
      title: v.content.copy.title,
      creator,
      priceMinor: v.content.offer.priceMinor,
      phase,
      earlyAccess: phase.phase === "backers" && backerStatus(user.id, c.kit_id).backed > 0,
      alreadyBacked: backedCampaigns.has(c.id),
      why: byCreator ? `You follow ${creator}` : `You follow ${getKit(c.kit_id)?.property_name}`,
    }];
  });

  return { stamps, refunded, since: stamps[0]?.paidAt ?? null, follows, drops };
}
