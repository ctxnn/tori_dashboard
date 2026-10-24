// Owner review decisions, bound to an exact version and content hash.
import { all, run, tx } from "../db";
import { RuleViolationError, badRequest, conflict, forbidden } from "../errors";
import { id, nowIso } from "../util";
import { audit, getUser, type User } from "./core";
import { evaluate, hashContent, requireCampaign, requireVersion, type CampaignVersion } from "./campaigns";
import { getKit, getKitVersion } from "./kits";
import { hasBlockingFailure, summariseFailures } from "./rules";

export type Decision = "approved" | "rejected" | "changes_requested";

export interface Review {
  id: string;
  campaign_version_id: string;
  reviewer_id: string;
  reviewer_name: string;
  decision: Decision;
  comment: string;
  content_hash: string;
  created_at: string;
  version_no: number;
}

export function reviewsForCampaign(campaignId: string): Review[] {
  return all<Review>(
    `SELECT r.*, u.name AS reviewer_name, v.version_no FROM reviews r
     JOIN users u ON u.id = r.reviewer_id JOIN campaign_versions v ON v.id = r.campaign_version_id
     WHERE v.campaign_id = ? ORDER BY r.created_at DESC`,
    campaignId,
  );
}

export function reviewVersion(input: { versionId: string; actor: User; decision: Decision; comment: string; expectedHash?: string }): CampaignVersion {
  const v = requireVersion(input.versionId);
  const c = requireCampaign(v.campaignId);
  const kit = getKit(c.kit_id)!;
  const kv = getKitVersion(v.kitVersionId)!;
  const actor = input.actor;
  if (actor.role !== "owner" || actor.org !== kit.owner_org) throw forbidden("Only the kit owner's team can review proposals");
  if (v.reviewStatus !== "submitted") throw conflict(`Version ${v.versionNo} isn't awaiting review (it is ${v.reviewStatus.replace("_", " ")}).`);
  // The reviewer's screen sends the hash it displayed; if the content moved underneath, refuse.
  if (input.expectedHash && input.expectedHash !== v.contentHash) throw conflict("This proposal changed while you were reviewing it. Reload to see the latest.");
  if (hashContent(v.content, v.kitVersionId) !== v.contentHash) throw conflict("Stored content doesn't match its fingerprint; it can't be approved.");

  const comment = input.comment.trim();
  if (input.decision !== "approved" && comment.length < 3) {
    throw badRequest(input.decision === "rejected" ? "Explain why the proposal is rejected" : "Describe the changes you need");
  }
  if (input.decision === "approved") {
    if (actor.id !== kv.rules.requiredApproverId) {
      const required = getUser(kv.rules.requiredApproverId);
      throw forbidden(`Kit v${kv.versionNo} requires approval from ${required?.name ?? "the named approver"}. You can request changes or reject.`);
    }
    const checks = evaluate(v.content, kv, { approved: false, forSubmission: true });
    if (hasBlockingFailure(checks)) throw new RuleViolationError(`Can't approve: ${summariseFailures(checks)}`, checks);
  }

  return tx(() => {
    const ts = nowIso();
    run(
      "INSERT INTO reviews (id, campaign_version_id, reviewer_id, decision, comment, content_hash, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)",
      id("rev"), v.id, actor.id, input.decision, comment, v.contentHash, ts,
    );
    const checks = evaluate(v.content, kv, { approved: input.decision === "approved", forSubmission: false });
    run(
      "UPDATE campaign_versions SET review_status = ?, check_results_json = ?, updated_at = ? WHERE id = ? AND review_status = 'submitted'",
      input.decision, JSON.stringify(checks), ts, v.id,
    );
    run("UPDATE campaigns SET updated_at = ? WHERE id = ?", ts, c.id);
    audit(actor.id, `review.${input.decision}`, "campaign", c.id, { versionId: v.id, versionNo: v.versionNo, contentHash: v.contentHash, comment });
    return requireVersion(v.id);
  });
}
