// Users, audit trail and platform settings.
import { all, get, run } from "../db";
import { nowIso } from "../util";
import type { Terms } from "../money";

export type Role = "owner" | "creator" | "fan" | "operator";

export interface User {
  id: string;
  name: string;
  email: string;
  role: Role;
  org: string;
  title: string;
  bio: string;
}

export function getUser(id: string): User | undefined {
  return get<User>("SELECT * FROM users WHERE id = ?", id);
}

export function listUsers(): User[] {
  return all<User>(
    "SELECT * FROM users ORDER BY CASE role WHEN 'owner' THEN 1 WHEN 'creator' THEN 2 WHEN 'fan' THEN 3 ELSE 4 END, name",
  );
}

export const SYSTEM_ACTOR = "system";

export function audit(actorId: string | null, action: string, entityType: string, entityId: string, detail: object = {}): void {
  run(
    "INSERT INTO audit_log (at, actor_id, action, entity_type, entity_id, detail_json) VALUES (?, ?, ?, ?, ?, ?)",
    nowIso(),
    actorId,
    action,
    entityType,
    entityId,
    JSON.stringify(detail),
  );
}

export interface AuditEntry {
  id: number;
  at: string;
  actor_id: string | null;
  actor_name: string | null;
  action: string;
  entity_type: string;
  entity_id: string;
  detail: Record<string, unknown>;
}

export function auditFor(entityType: string, entityIds: string[]): AuditEntry[] {
  if (!entityIds.length) return [];
  const rows = all<Omit<AuditEntry, "detail"> & { detail_json: string }>(
    `SELECT a.*, u.name AS actor_name FROM audit_log a LEFT JOIN users u ON u.id = a.actor_id
     WHERE a.entity_type = ? AND a.entity_id IN (${entityIds.map(() => "?").join(",")}) ORDER BY a.id DESC`,
    entityType,
    ...entityIds,
  );
  return rows.map(({ detail_json, ...r }) => ({ ...r, detail: JSON.parse(detail_json) }));
}

// ---------------------------------------------------------------------------
// Settings: illustrative commercial terms and cost assumptions.
// ---------------------------------------------------------------------------

export interface PlatformTerms {
  creatorBps: number;
  platformBps: number;
}

export interface CostAssumptions {
  /** Blank product + printing, per unit. */
  productionMinor: Record<string, number>;
  packagingMinor: number;
  /** Courier cost per order. */
  shippingCostMinor: number;
  /** Payment processing, as a share of money collected. */
  paymentFeeBps: number;
}

export const DEFAULT_PLATFORM_TERMS: PlatformTerms = { creatorBps: 800, platformBps: 1200 };

export const DEFAULT_COSTS: CostAssumptions = {
  productionMinor: { tshirt: 26000, poster: 9500, glassware: 18000 },
  packagingMinor: 2500,
  shippingCostMinor: 7000,
  paymentFeeBps: 200,
};

function getSetting<T>(key: string, fallback: T): T {
  const row = get<{ value_json: string }>("SELECT value_json FROM settings WHERE key = ?", key);
  return row ? (JSON.parse(row.value_json) as T) : fallback;
}

function setSetting(key: string, value: unknown): void {
  run(
    "INSERT INTO settings (key, value_json, updated_at) VALUES (?, ?, ?) ON CONFLICT(key) DO UPDATE SET value_json = excluded.value_json, updated_at = excluded.updated_at",
    key,
    JSON.stringify(value),
    nowIso(),
  );
}

export const getPlatformTerms = () => getSetting("platform_terms", DEFAULT_PLATFORM_TERMS);
export const setPlatformTerms = (t: PlatformTerms) => setSetting("platform_terms", t);
export const getCostAssumptions = () => getSetting("cost_assumptions", DEFAULT_COSTS);
export const setCostAssumptions = (c: CostAssumptions) => setSetting("cost_assumptions", c);

export function termsFor(royaltyBps: number): Terms {
  const p = getPlatformTerms();
  return { royaltyBps, creatorBps: p.creatorBps, platformBps: p.platformBps };
}

/** The seller of record who produces, ships and invoices. Demonstration data. */
export const SELLER = {
  name: "Indigo Thread Co.",
  location: "Tiruppur, Tamil Nadu",
  note: "Demonstration seller — not a real business partner.",
};
