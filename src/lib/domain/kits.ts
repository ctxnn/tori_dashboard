// Authorised asset kits: artwork files plus versioned, structured rules.
import fs from "node:fs";
import path from "node:path";
import { all, get, run, tx, uploadsDir } from "../db";
import { badRequest, forbidden, notFound } from "../errors";
import { KitRulesSchema, type KitRules } from "../kit-rules";
import { PRODUCTS } from "../catalog";
import { id, nowIso, sha256 } from "../util";
import { audit, getUser, type User } from "./core";

export interface Kit {
  id: string;
  property_name: string;
  owner_org: string;
  summary: string;
  credit_line: string;
  created_at: string;
}

export interface Asset {
  id: string;
  kit_id: string;
  code: string;
  name: string;
  description: string;
  file_name: string;
  mime: string;
  byte_size: number;
  sha256: string;
  created_at: string;
}

export interface KitVersion {
  id: string;
  kitId: string;
  versionNo: number;
  rules: KitRules;
  assetIds: string[];
  notes: string;
  publishedBy: string;
  publishedAt: string;
}

interface KitVersionRow {
  id: string;
  kit_id: string;
  version_no: number;
  rules_json: string;
  asset_ids_json: string;
  notes: string;
  published_by: string;
  published_at: string;
}

const mapVersion = (r: KitVersionRow): KitVersion => ({
  id: r.id,
  kitId: r.kit_id,
  versionNo: r.version_no,
  rules: JSON.parse(r.rules_json),
  assetIds: JSON.parse(r.asset_ids_json),
  notes: r.notes,
  publishedBy: r.published_by,
  publishedAt: r.published_at,
});

export const listKits = () => all<Kit>("SELECT * FROM kits ORDER BY created_at");
export const getKit = (kitId: string) => get<Kit>("SELECT * FROM kits WHERE id = ?", kitId);

export function requireKit(kitId: string): Kit {
  const k = getKit(kitId);
  if (!k) throw notFound("Kit");
  return k;
}

export function getKitVersion(versionId: string): KitVersion | undefined {
  const r = get<KitVersionRow>("SELECT * FROM kit_versions WHERE id = ?", versionId);
  return r && mapVersion(r);
}

export function latestKitVersion(kitId: string): KitVersion | undefined {
  const r = get<KitVersionRow>("SELECT * FROM kit_versions WHERE kit_id = ? ORDER BY version_no DESC LIMIT 1", kitId);
  return r && mapVersion(r);
}

export function listKitVersions(kitId: string): KitVersion[] {
  return all<KitVersionRow>("SELECT * FROM kit_versions WHERE kit_id = ? ORDER BY version_no DESC", kitId).map(mapVersion);
}

export const listAssets = (kitId: string) => all<Asset>("SELECT * FROM assets WHERE kit_id = ? ORDER BY code", kitId);
export const getAsset = (assetId: string) => get<Asset>("SELECT * FROM assets WHERE id = ?", assetId);

export function assetsForVersion(kv: KitVersion): Asset[] {
  if (!kv.assetIds.length) return [];
  return all<Asset>(
    `SELECT * FROM assets WHERE id IN (${kv.assetIds.map(() => "?").join(",")}) ORDER BY code`,
    ...kv.assetIds,
  );
}

export function assetPath(a: Asset): string {
  return path.join(uploadsDir(), a.file_name);
}

export function assetDataUri(a: Asset): string {
  const buf = fs.readFileSync(assetPath(a));
  return `data:${a.mime};base64,${buf.toString("base64")}`;
}

export function canManageKit(user: User | undefined, kit: Kit): boolean {
  return !!user && user.role === "owner" && user.org === kit.owner_org;
}

// ---------------------------------------------------------------------------
// Uploads
// ---------------------------------------------------------------------------

const MAX_BYTES = 5 * 1024 * 1024;
const MIME_EXT: Record<string, string> = { "image/png": "png", "image/jpeg": "jpg", "image/webp": "webp", "image/svg+xml": "svg" };

function sniff(buf: Buffer): string | null {
  if (buf.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) return "image/png";
  if (buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) return "image/jpeg";
  if (buf.subarray(0, 4).toString() === "RIFF" && buf.subarray(8, 12).toString() === "WEBP") return "image/webp";
  const head = buf.subarray(0, 512).toString("utf8").trimStart();
  if (head.startsWith("<svg") || (head.startsWith("<?xml") && head.includes("<svg"))) return "image/svg+xml";
  return null;
}

export function createAsset(input: { kitId: string; name: string; description: string; data: Buffer; actor: User }): Asset {
  const kit = requireKit(input.kitId);
  if (!canManageKit(input.actor, kit)) throw forbidden("Only the kit owner's team can upload artwork");
  if (!input.name.trim()) throw badRequest("Give the artwork a name");
  if (input.data.length === 0) throw badRequest("The file is empty");
  if (input.data.length > MAX_BYTES) throw badRequest("Artwork must be 5 MB or smaller");
  const mime = sniff(input.data);
  if (!mime) throw badRequest("Upload a PNG, JPEG, WebP or SVG image");
  if (mime === "image/svg+xml") {
    const text = input.data.toString("utf8");
    if (/<script|<foreignObject|\son\w+\s*=|javascript:/i.test(text)) throw badRequest("SVG files can't contain scripts or embedded HTML");
  }
  return tx(() => {
    const count = get<{ n: number }>("SELECT COUNT(*) AS n FROM assets WHERE kit_id = ?", kit.id)!.n;
    const prefix = kit.property_name.split(/\s+/).map((w) => w[0]).join("").toUpperCase();
    const code = `${prefix}-ART-${String(count + 1).padStart(3, "0")}`;
    const assetId = id("ast");
    const fileName = `${assetId}.${MIME_EXT[mime]}`;
    fs.writeFileSync(path.join(uploadsDir(), fileName), input.data);
    run(
      `INSERT INTO assets (id, kit_id, code, name, description, file_name, mime, byte_size, sha256, uploaded_by, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      assetId, kit.id, code, input.name.trim(), input.description.trim(), fileName, mime, input.data.length, sha256(input.data), input.actor.id, nowIso(),
    );
    audit(input.actor.id, "asset.uploaded", "kit", kit.id, { assetId, code, name: input.name });
    return getAsset(assetId)!;
  });
}

// ---------------------------------------------------------------------------
// Publishing a kit version
// ---------------------------------------------------------------------------

export function publishKitVersion(input: { kitId: string; rules: unknown; assetIds: string[]; notes: string; actor: User }): KitVersion {
  const kit = requireKit(input.kitId);
  if (!canManageKit(input.actor, kit)) throw forbidden("Only the kit owner's team can publish kit versions");
  const parsed = KitRulesSchema.safeParse(input.rules);
  if (!parsed.success) throw badRequest("Some kit rules need attention", parsed.error.issues);
  const rules = parsed.data;
  for (const p of rules.products) {
    const tpl = PRODUCTS[p.productId];
    if (!tpl) throw badRequest(`Unknown product template “${p.productId}”`);
    const bad = p.layouts.filter((l) => !tpl.layouts.some((t) => t.id === l));
    if (bad.length) throw badRequest(`Unknown layout for ${tpl.name}: ${bad.join(", ")}`);
  }
  const approver = getUser(rules.requiredApproverId);
  if (!approver || approver.role !== "owner" || approver.org !== kit.owner_org) {
    throw badRequest("The required approver must be someone on the owner's team");
  }
  const owned = new Set(listAssets(kit.id).map((a) => a.id));
  const assetIds = [...new Set(input.assetIds)];
  if (!assetIds.length) throw badRequest("Include at least one approved artwork");
  if (assetIds.some((a) => !owned.has(a))) throw badRequest("Every approved asset must belong to this kit");

  return tx(() => {
    const prev = latestKitVersion(kit.id);
    const versionId = id("kv");
    run(
      `INSERT INTO kit_versions (id, kit_id, version_no, rules_json, asset_ids_json, notes, published_by, published_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      versionId, kit.id, (prev?.versionNo ?? 0) + 1, JSON.stringify(rules), JSON.stringify(assetIds), input.notes.trim(), input.actor.id, nowIso(),
    );
    audit(input.actor.id, "kit.version_published", "kit", kit.id, { versionId, versionNo: (prev?.versionNo ?? 0) + 1 });
    return getKitVersion(versionId)!;
  });
}

export function ownerTeam(org: string): User[] {
  return all<User>("SELECT * FROM users WHERE role = 'owner' AND org = ? ORDER BY name", org);
}
