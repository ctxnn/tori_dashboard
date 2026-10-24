// Campaigns and their immutable versions.
//
// Lifecycle of a version:  draft → submitted → approved | changes_requested | rejected
// A draft may be edited in place. Anything else is frozen: editing creates a new
// draft version. Approval is recorded against the version's content hash, and the
// hash is recomputed from stored content before publishing, so an approval can never
// silently carry over to changed material.
import { all, get, run, tx } from "../db";
import { HttpError, RuleViolationError, badRequest, conflict, forbidden, notFound } from "../errors";
import { ContentInputSchema, FIELD_LABELS, getPath, type Content, type ContentInput } from "../content";
import { renderPreviewSvg } from "../preview";
import { canonicalJson, id, nowIso, sha256, slugify, todayIso } from "../util";
import { audit, getUser, termsFor, type User } from "./core";
import {
  assetDataUri,
  assetsForVersion,
  getAsset,
  getKit,
  getKitVersion,
  latestKitVersion,
  requireKit,
  type Kit,
  type KitVersion,
} from "./kits";
import { hasBlockingFailure, runRuleChecks, summariseFailures, type CheckResult } from "./rules";

export type SalesStatus = "not_published" | "live" | "production_released" | "cancelling" | "cancelled" | "completed";
export type ReviewStatus = "draft" | "submitted" | "changes_requested" | "rejected" | "approved" | "superseded";

export interface Campaign {
  id: string;
  slug: string;
  kit_id: string;
  creator_id: string;
  sales_status: SalesStatus;
  published_version_id: string | null;
  cancel_reason: string | null;
  created_at: string;
  updated_at: string;
  published_at: string | null;
  released_at: string | null;
  cancelled_at: string | null;
  completed_at: string | null;
}

export interface CampaignVersion {
  id: string;
  campaignId: string;
  versionNo: number;
  kitVersionId: string;
  content: Content;
  contentHash: string;
  previewSvg: string;
  checks: CheckResult[];
  checksPassed: boolean;
  reviewStatus: ReviewStatus;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
  submittedAt: string | null;
}

interface VersionRow {
  id: string;
  campaign_id: string;
  version_no: number;
  kit_version_id: string;
  content_json: string;
  content_hash: string;
  preview_svg: string;
  check_results_json: string;
  checks_passed: number;
  review_status: ReviewStatus;
  created_by: string;
  created_at: string;
  updated_at: string;
  submitted_at: string | null;
}

const mapVersion = (r: VersionRow): CampaignVersion => ({
  id: r.id,
  campaignId: r.campaign_id,
  versionNo: r.version_no,
  kitVersionId: r.kit_version_id,
  content: JSON.parse(r.content_json),
  contentHash: r.content_hash,
  previewSvg: r.preview_svg,
  checks: JSON.parse(r.check_results_json),
  checksPassed: !!r.checks_passed,
  reviewStatus: r.review_status,
  createdBy: r.created_by,
  createdAt: r.created_at,
  updatedAt: r.updated_at,
  submittedAt: r.submitted_at,
});

// ---------------------------------------------------------------------------
// Reads
// ---------------------------------------------------------------------------

export const getCampaign = (campaignId: string) => get<Campaign>("SELECT * FROM campaigns WHERE id = ?", campaignId);
export const getCampaignBySlug = (slug: string) => get<Campaign>("SELECT * FROM campaigns WHERE slug = ?", slug);

export function requireCampaign(campaignId: string): Campaign {
  const c = getCampaign(campaignId);
  if (!c) throw notFound("Campaign");
  return c;
}

export function getVersion(versionId: string): CampaignVersion | undefined {
  const r = get<VersionRow>("SELECT * FROM campaign_versions WHERE id = ?", versionId);
  return r && mapVersion(r);
}

export function requireVersion(versionId: string): CampaignVersion {
  const v = getVersion(versionId);
  if (!v) throw notFound("Campaign version");
  return v;
}

export function listVersions(campaignId: string): CampaignVersion[] {
  return all<VersionRow>("SELECT * FROM campaign_versions WHERE campaign_id = ? ORDER BY version_no DESC", campaignId).map(mapVersion);
}

export function latestVersion(campaignId: string): CampaignVersion {
  const r = get<VersionRow>("SELECT * FROM campaign_versions WHERE campaign_id = ? ORDER BY version_no DESC LIMIT 1", campaignId);
  if (!r) throw notFound("Campaign version");
  return mapVersion(r);
}

export function listCampaigns(filter: { creatorId?: string; kitIds?: string[] } = {}): Campaign[] {
  if (filter.creatorId) return all<Campaign>("SELECT * FROM campaigns WHERE creator_id = ? ORDER BY updated_at DESC", filter.creatorId);
  if (filter.kitIds) {
    if (!filter.kitIds.length) return [];
    return all<Campaign>(
      `SELECT * FROM campaigns WHERE kit_id IN (${filter.kitIds.map(() => "?").join(",")}) ORDER BY updated_at DESC`,
      ...filter.kitIds,
    );
  }
  return all<Campaign>("SELECT * FROM campaigns ORDER BY updated_at DESC");
}

export function listLiveCampaigns(): Campaign[] {
  return all<Campaign>("SELECT * FROM campaigns WHERE published_version_id IS NOT NULL ORDER BY published_at DESC");
}

/** Versions awaiting a decision from a given owner org. */
export function reviewQueue(org: string): CampaignVersion[] {
  return all<VersionRow>(
    `SELECT v.* FROM campaign_versions v JOIN campaigns c ON c.id = v.campaign_id JOIN kits k ON k.id = c.kit_id
     WHERE k.owner_org = ? AND v.review_status = 'submitted' ORDER BY v.submitted_at`,
    org,
  ).map(mapVersion);
}

// ---------------------------------------------------------------------------
// Permissions
// ---------------------------------------------------------------------------

export function canViewCampaign(user: User | undefined, c: Campaign): boolean {
  if (!user) return false;
  if (user.role === "operator") return true;
  if (user.role === "creator") return c.creator_id === user.id;
  if (user.role === "owner") return getKit(c.kit_id)?.owner_org === user.org;
  return false;
}

export function requireCampaignView(user: User | undefined, c: Campaign): void {
  if (!user) throw new HttpError(401, "Sign in to continue");
  if (!canViewCampaign(user, c)) throw forbidden();
}

// ---------------------------------------------------------------------------
// Hashing, previews and checks
// ---------------------------------------------------------------------------

export function hashContent(content: Content, kitVersionId: string): string {
  return sha256(canonicalJson({ content, kitVersionId }));
}

export function renderVersionPreview(content: Content, kit: Kit, uid: string): string {
  const asset = getAsset(content.design.artworkAssetId);
  return renderPreviewSvg({
    productId: content.productId,
    layoutId: content.layoutId,
    design: content.design,
    artworkHref: asset && asset.kit_id === kit.id ? assetDataUri(asset) : null,
    creditLine: kit.credit_line,
    uid,
  });
}

export function evaluate(content: Content, kv: KitVersion, opts: { approved: boolean; forSubmission: boolean }): CheckResult[] {
  const approver = getUser(kv.rules.requiredApproverId);
  return runRuleChecks(content, {
    kitVersionNo: kv.versionNo,
    rules: kv.rules,
    approvedAssets: assetsForVersion(kv).map((a) => ({ id: a.id, code: a.code, name: a.name })),
    approverName: approver ? `${approver.name} (${approver.title})` : "the required approver",
    today: todayIso(),
    approved: opts.approved,
    forSubmission: opts.forSubmission,
  });
}

/**
 * True only if the version holds an approval from the kit's required approver for
 * exactly this content. Recomputes the hash from stored content as a tamper check.
 */
export function isApproved(v: CampaignVersion): boolean {
  if (v.reviewStatus !== "approved") return false;
  const recomputed = hashContent(v.content, v.kitVersionId);
  if (recomputed !== v.contentHash) return false;
  const kv = getKitVersion(v.kitVersionId);
  if (!kv) return false;
  const review = get<{ id: string }>(
    "SELECT id FROM reviews WHERE campaign_version_id = ? AND decision = 'approved' AND content_hash = ? AND reviewer_id = ?",
    v.id,
    recomputed,
    kv.rules.requiredApproverId,
  );
  return !!review;
}

// ---------------------------------------------------------------------------
// Writes
// ---------------------------------------------------------------------------

function addDays(iso: string, days: number): string {
  const d = new Date(`${iso}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

export function defaultContent(kv: KitVersion, title: string): ContentInput {
  const firstProduct = kv.rules.products[0];
  const today = todayIso();
  const launch = today < kv.rules.window.start ? kv.rules.window.start : today;
  const deadline = addDays(launch, 28) > kv.rules.window.end ? kv.rules.window.end : addDays(launch, 28);
  return {
    productId: firstProduct?.productId ?? "tshirt",
    layoutId: firstProduct?.layouts[0] ?? "centre",
    design: {
      artworkAssetId: kv.assetIds[0] ?? "",
      artworkScale: 1,
      baseColour: "ivory",
      text: { line1: "", line2: "", font: "display", colour: "ink", position: "below" },
    },
    copy: { title, tagline: "", story: "", audience: "", localAngle: "" },
    distribution: { channels: [], launchMoment: "", creatorCommitment: "" },
    offer: {
      priceMinor: 69900,
      shippingMinor: 7900,
      thresholdUnits: 50,
      launchDate: launch,
      deadline,
      territory: "IN",
      sizes: ["S", "M", "L", "XL"],
      expectedUnits: 60,
    },
  };
}

function writeVersionArtifacts(content: Content, kv: KitVersion, kit: Kit, versionId: string) {
  const checks = evaluate(content, kv, { approved: false, forSubmission: false });
  return {
    contentJson: JSON.stringify(content),
    hash: hashContent(content, kv.id),
    preview: renderVersionPreview(content, kit, versionId),
    checksJson: JSON.stringify(checks),
    passed: hasBlockingFailure(checks) ? 0 : 1,
  };
}

export function createCampaign(input: { kitId: string; title: string; actor: User; content?: ContentInput }): Campaign {
  if (input.actor.role !== "creator") throw forbidden("Only creators can start campaigns");
  const kit = requireKit(input.kitId);
  const kv = latestKitVersion(kit.id);
  if (!kv) throw conflict("This kit has no published version yet");
  const title = input.title.trim() || "Untitled campaign";
  const raw = input.content ?? defaultContent(kv, title);
  const parsed = ContentInputSchema.safeParse(raw);
  if (!parsed.success) throw badRequest("Some campaign details need attention", parsed.error.issues);
  return tx(() => {
    const campaignId = id("cmp");
    let slug = slugify(title) || "campaign";
    if (getCampaignBySlug(slug)) slug = `${slug}-${campaignId.slice(-4)}`;
    const ts = nowIso();
    run(
      "INSERT INTO campaigns (id, slug, kit_id, creator_id, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)",
      campaignId, slug, kit.id, input.actor.id, ts, ts,
    );
    const content: Content = { ...parsed.data, terms: termsFor(kv.rules.royaltyBps) };
    const versionId = id("ver");
    const a = writeVersionArtifacts(content, kv, kit, versionId);
    run(
      `INSERT INTO campaign_versions (id, campaign_id, version_no, kit_version_id, content_json, content_hash, preview_svg,
        check_results_json, checks_passed, review_status, created_by, created_at, updated_at)
       VALUES (?, ?, 1, ?, ?, ?, ?, ?, ?, 'draft', ?, ?, ?)`,
      versionId, campaignId, kv.id, a.contentJson, a.hash, a.preview, a.checksJson, a.passed, input.actor.id, ts, ts,
    );
    audit(input.actor.id, "campaign.created", "campaign", campaignId, { versionId });
    return getCampaign(campaignId)!;
  });
}

function assertCreatorOwns(actor: User, c: Campaign) {
  if (actor.role !== "creator" || actor.id !== c.creator_id) throw forbidden("Only the campaign's creator can edit it");
  if (c.sales_status === "cancelled" || c.sales_status === "cancelling" || c.sales_status === "completed") {
    throw conflict("This campaign is closed and can no longer be edited");
  }
}

/**
 * Save the creator's proposal. Edits the latest version if it's still a draft,
 * otherwise starts a new draft version. Always targets the newest kit version.
 */
export function saveDraft(input: { campaignId: string; actor: User; content: unknown }): CampaignVersion {
  const c = requireCampaign(input.campaignId);
  assertCreatorOwns(input.actor, c);
  const parsed = ContentInputSchema.safeParse(input.content);
  if (!parsed.success) throw badRequest("Some campaign details need attention", parsed.error.issues);
  const kit = requireKit(c.kit_id);
  const kv = latestKitVersion(kit.id)!;
  const content: Content = { ...parsed.data, terms: termsFor(kv.rules.royaltyBps) };

  return tx(() => {
    const latest = latestVersion(c.id);
    const ts = nowIso();
    if (latest.reviewStatus === "draft") {
      const a = writeVersionArtifacts(content, kv, kit, latest.id);
      run(
        `UPDATE campaign_versions SET kit_version_id = ?, content_json = ?, content_hash = ?, preview_svg = ?,
          check_results_json = ?, checks_passed = ?, updated_at = ? WHERE id = ? AND review_status = 'draft'`,
        kv.id, a.contentJson, a.hash, a.preview, a.checksJson, a.passed, ts, latest.id,
      );
      run("UPDATE campaigns SET updated_at = ? WHERE id = ?", ts, c.id);
      return getVersion(latest.id)!;
    }
    const versionId = id("ver");
    const a = writeVersionArtifacts(content, kv, kit, versionId);
    run(
      `INSERT INTO campaign_versions (id, campaign_id, version_no, kit_version_id, content_json, content_hash, preview_svg,
        check_results_json, checks_passed, review_status, created_by, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'draft', ?, ?, ?)`,
      versionId, c.id, latest.versionNo + 1, kv.id, a.contentJson, a.hash, a.preview, a.checksJson, a.passed, input.actor.id, ts, ts,
    );
    run("UPDATE campaigns SET updated_at = ? WHERE id = ?", ts, c.id);
    audit(input.actor.id, "campaign.version_created", "campaign", c.id, { versionId, versionNo: latest.versionNo + 1, basedOn: latest.id });
    return getVersion(versionId)!;
  });
}

/** Submit a draft for owner review. The backend refuses anything that breaks kit rules. */
export function submitVersion(input: { versionId: string; actor: User }): CampaignVersion {
  const v = requireVersion(input.versionId);
  const c = requireCampaign(v.campaignId);
  assertCreatorOwns(input.actor, c);
  if (v.reviewStatus !== "draft") throw conflict("Only drafts can be submitted. Edit the campaign to start a new version.");
  const latest = latestVersion(c.id);
  if (latest.id !== v.id) throw conflict("A newer version exists. Submit the latest version instead.");
  const kv = getKitVersion(v.kitVersionId)!;
  const checks = evaluate(v.content, kv, { approved: false, forSubmission: true });
  if (hasBlockingFailure(checks)) {
    run("UPDATE campaign_versions SET check_results_json = ?, checks_passed = 0 WHERE id = ?", JSON.stringify(checks), v.id);
    audit(input.actor.id, "campaign.submission_blocked", "campaign", c.id, { versionId: v.id, failed: checks.filter((x) => x.status === "fail").map((x) => x.id) });
    throw new RuleViolationError(summariseFailures(checks), checks);
  }
  return tx(() => {
    const ts = nowIso();
    run(
      "UPDATE campaign_versions SET review_status = 'superseded', updated_at = ? WHERE campaign_id = ? AND review_status = 'submitted'",
      ts, c.id,
    );
    run(
      "UPDATE campaign_versions SET review_status = 'submitted', submitted_at = ?, updated_at = ?, check_results_json = ?, checks_passed = 1 WHERE id = ?",
      ts, ts, JSON.stringify(checks), v.id,
    );
    run("UPDATE campaigns SET updated_at = ? WHERE id = ?", ts, c.id);
    audit(input.actor.id, "campaign.submitted", "campaign", c.id, { versionId: v.id, versionNo: v.versionNo, contentHash: v.contentHash });
    return getVersion(v.id)!;
  });
}

/** Make an approved version the one fans see and buy. */
export function publishVersion(input: { versionId: string; actor: User }): Campaign {
  const v = requireVersion(input.versionId);
  const c = requireCampaign(v.campaignId);
  if (!(input.actor.role === "operator" || (input.actor.role === "creator" && input.actor.id === c.creator_id))) {
    throw forbidden("Only the creator or a Torii operator can publish");
  }
  if (!["not_published", "live"].includes(c.sales_status)) throw conflict("This campaign is no longer taking preorders");
  if (!isApproved(v)) {
    throw conflict(
      v.reviewStatus === "approved"
        ? "This version's content no longer matches what was approved. It needs fresh approval."
        : "Only a version approved by the required approver can be published.",
    );
  }
  const kv = getKitVersion(v.kitVersionId)!;
  const checks = evaluate(v.content, kv, { approved: true, forSubmission: true });
  if (hasBlockingFailure(checks)) throw new RuleViolationError(summariseFailures(checks), checks);
  if (c.published_version_id === v.id) return c;
  return tx(() => {
    const ts = nowIso();
    run(
      `UPDATE campaigns SET published_version_id = ?, sales_status = 'live', published_at = COALESCE(published_at, ?), updated_at = ? WHERE id = ?`,
      v.id, ts, ts, c.id,
    );
    audit(input.actor.id, "campaign.published", "campaign", c.id, { versionId: v.id, versionNo: v.versionNo, replaced: c.published_version_id });
    return getCampaign(c.id)!;
  });
}

// ---------------------------------------------------------------------------
// Diffs for reviewers
// ---------------------------------------------------------------------------

export interface FieldChange {
  path: string;
  label: string;
  before: unknown;
  after: unknown;
}

export function diffContent(before: Content, beforeKv: string, after: Content, afterKv: string): FieldChange[] {
  const changes: FieldChange[] = [];
  for (const [path, label] of FIELD_LABELS) {
    const b = path === "kitVersion" ? beforeKv : getPath(before, path);
    const a = path === "kitVersion" ? afterKv : getPath(after, path);
    if (canonicalJson(b) !== canonicalJson(a)) changes.push({ path, label, before: b, after: a });
  }
  return changes;
}

/** The version a reviewer should compare against: the last approved one, else the previous one. */
export function comparisonBase(v: CampaignVersion): CampaignVersion | undefined {
  const versions = listVersions(v.campaignId).filter((x) => x.versionNo < v.versionNo);
  return versions.find((x) => x.reviewStatus === "approved") ?? versions[0];
}

// ---------------------------------------------------------------------------
// Status for display
// ---------------------------------------------------------------------------

export interface CampaignSummary {
  campaign: Campaign;
  latest: CampaignVersion;
  published?: CampaignVersion;
  kit: Kit;
  creator: User;
}

export function summarise(c: Campaign): CampaignSummary {
  const latest = latestVersion(c.id);
  return {
    campaign: c,
    latest,
    published: c.published_version_id ? getVersion(c.published_version_id) : undefined,
    kit: getKit(c.kit_id)!,
    creator: getUser(c.creator_id)!,
  };
}
