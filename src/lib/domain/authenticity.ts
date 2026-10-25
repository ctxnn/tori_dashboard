// Authenticity tags. Each unit gets a code when it ships, bound to the exact
// approved version (and its content hash) it was made from. Anyone can look a
// code up; every lookup is logged, so a code checked suspiciously often — or a
// code that never existed — is visible as a sign of copies in circulation.
import crypto from "node:crypto";
import { all, get, run } from "../db";
import { nowIso } from "../util";
import { getVersion, isApproved } from "./campaigns";
import { getKit } from "./kits";
import { getUser } from "./core";
import type { Order } from "./orders";
import { productName } from "../catalog";

const ALPHABET = "23456789ABCDEFGHJKMNPQRSTUVWXYZ";

/** Scans after which the verify page suggests caution when buying "new". */
export const SCAN_CAUTION = 5;

function prefixFor(property: string): string {
  return property.split(/\s+/).map((w) => w[0]).join("").toUpperCase().slice(0, 3) || "TR";
}

function randomCode(prefix: string): string {
  const bytes = crypto.randomBytes(8);
  let s = "";
  for (const b of bytes) s += ALPHABET[b % ALPHABET.length];
  return `${prefix}-${s.slice(0, 4)}-${s.slice(4)}`;
}

export const normaliseCode = (raw: string) => raw.toUpperCase().replace(/[^0-9A-Z]/g, "");

/** Issue one code per unit. Idempotent per order: re-running issues nothing new. */
export function issueCodesForOrder(o: Order): void {
  const v = getVersion(o.campaign_version_id)!;
  const c = get<{ kit_id: string }>("SELECT kit_id FROM campaigns WHERE id = ?", o.campaign_id)!;
  const prefix = prefixFor(getKit(c.kit_id)?.property_name ?? "");
  for (let unit = 1; unit <= o.quantity; unit++) {
    if (get("SELECT 1 FROM authenticity_codes WHERE order_id = ? AND unit_no = ?", o.id, unit)) continue;
    const serial = get<{ n: number }>("SELECT COALESCE(MAX(serial_no), 0) + 1 AS n FROM authenticity_codes WHERE campaign_id = ?", o.campaign_id)!.n;
    run(
      `INSERT INTO authenticity_codes (code, order_id, unit_no, serial_no, campaign_id, campaign_version_id, content_hash, issued_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      randomCode(prefix), o.id, unit, serial, o.campaign_id, o.campaign_version_id, v.contentHash, nowIso(),
    );
  }
}

export function codesForOrder(orderId: string): { code: string; serialNo: number }[] {
  return all<{ code: string; serial_no: number }>("SELECT code, serial_no FROM authenticity_codes WHERE order_id = ? ORDER BY unit_no", orderId).map((r) => ({
    code: r.code,
    serialNo: r.serial_no,
  }));
}

export function sampleCode(): string | undefined {
  return get<{ code: string }>(
    "SELECT a.code FROM authenticity_codes a JOIN orders o ON o.id = a.order_id WHERE o.status = 'delivered' ORDER BY a.issued_at, a.serial_no LIMIT 1",
  )?.code;
}

export type Verification =
  | { found: false; code: string }
  | {
      found: true;
      code: string;
      serialNo: number;
      runSize: number;
      issuedAt: string;
      orderStatus: string;
      title: string;
      product: string;
      property: string;
      owner: string;
      credit: string;
      creator: string;
      creatorOrg: string;
      versionNo: number;
      contentHash: string;
      hashMatches: boolean;
      approved: boolean;
      approvedBy: string | null;
      approvedAt: string | null;
      previewSvg: string;
      slug: string;
      priorScans: number;
      firstScanAt: string | null;
    };

export function verifyCode(raw: string): Verification {
  const compact = normaliseCode(raw);
  const row = compact
    ? get<{ code: string; order_id: string; serial_no: number; campaign_id: string; campaign_version_id: string; content_hash: string; issued_at: string }>(
        "SELECT * FROM authenticity_codes WHERE REPLACE(code, '-', '') = ?",
        compact,
      )
    : undefined;
  if (!row) return { found: false, code: raw.trim().toUpperCase() };
  const v = getVersion(row.campaign_version_id)!;
  const c = get<{ kit_id: string; creator_id: string; slug: string }>("SELECT kit_id, creator_id, slug FROM campaigns WHERE id = ?", row.campaign_id)!;
  const kit = getKit(c.kit_id)!;
  const creator = getUser(c.creator_id)!;
  const review = get<{ name: string; created_at: string }>(
    `SELECT u.name, r.created_at FROM reviews r JOIN users u ON u.id = r.reviewer_id
     WHERE r.campaign_version_id = ? AND r.decision = 'approved' AND r.content_hash = ? ORDER BY r.created_at DESC LIMIT 1`,
    v.id,
    row.content_hash,
  );
  const scans = get<{ n: number; first: string | null }>("SELECT COUNT(*) AS n, MIN(scanned_at) AS first FROM authenticity_scans WHERE code = ?", row.code)!;
  return {
    found: true,
    code: row.code,
    serialNo: row.serial_no,
    runSize: get<{ n: number }>("SELECT COUNT(*) AS n FROM authenticity_codes WHERE campaign_id = ?", row.campaign_id)!.n,
    issuedAt: row.issued_at,
    orderStatus: get<{ status: string }>("SELECT status FROM orders WHERE id = ?", row.order_id)!.status,
    title: v.content.copy.title,
    product: productName(v.content.productId),
    property: kit.property_name,
    owner: kit.owner_org,
    credit: kit.credit_line,
    creator: creator.name,
    creatorOrg: creator.org,
    versionNo: v.versionNo,
    contentHash: row.content_hash,
    hashMatches: row.content_hash === v.contentHash,
    approved: isApproved(v),
    approvedBy: review?.name ?? null,
    approvedAt: review?.created_at ?? null,
    previewSvg: v.previewSvg,
    slug: c.slug,
    priorScans: scans.n,
    firstScanAt: scans.first,
  };
}

/** Log a lookup. Unknown codes are logged too. */
export function recordScan(raw: string): { found: boolean; scans: number } {
  const compact = normaliseCode(raw);
  if (!compact || compact.length > 24) return { found: false, scans: 0 };
  const row = get<{ code: string }>("SELECT code FROM authenticity_codes WHERE REPLACE(code, '-', '') = ?", compact);
  const code = row?.code ?? compact;
  run("INSERT INTO authenticity_scans (code, found, scanned_at) VALUES (?, ?, ?)", code, row ? 1 : 0, nowIso());
  return { found: !!row, scans: get<{ n: number }>("SELECT COUNT(*) AS n FROM authenticity_scans WHERE code = ?", code)!.n };
}
