// Relational schema for Torii. Money is always stored in integer minor units (paise).
// Every table that holds commercial records carries a `livemode` flag so simulated
// transactions can never be mistaken for live commercial data.

export const SCHEMA_VERSION = 1;

export const SCHEMA = /* sql */ `
CREATE TABLE IF NOT EXISTS meta (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  role TEXT NOT NULL CHECK (role IN ('owner','creator','fan','operator')),
  org TEXT NOT NULL,
  title TEXT NOT NULL DEFAULT '',
  bio TEXT NOT NULL DEFAULT ''
);

CREATE TABLE IF NOT EXISTS kits (
  id TEXT PRIMARY KEY,
  property_name TEXT NOT NULL,
  owner_org TEXT NOT NULL,
  summary TEXT NOT NULL,
  credit_line TEXT NOT NULL,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS assets (
  id TEXT PRIMARY KEY,
  kit_id TEXT NOT NULL REFERENCES kits(id),
  code TEXT NOT NULL,
  name TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  file_name TEXT NOT NULL,
  mime TEXT NOT NULL,
  byte_size INTEGER NOT NULL,
  sha256 TEXT NOT NULL,
  uploaded_by TEXT NOT NULL REFERENCES users(id),
  created_at TEXT NOT NULL,
  UNIQUE (kit_id, code)
);

-- Kit versions are immutable once published. Proposals point at one exact version.
CREATE TABLE IF NOT EXISTS kit_versions (
  id TEXT PRIMARY KEY,
  kit_id TEXT NOT NULL REFERENCES kits(id),
  version_no INTEGER NOT NULL,
  rules_json TEXT NOT NULL,
  asset_ids_json TEXT NOT NULL,
  notes TEXT NOT NULL DEFAULT '',
  published_by TEXT NOT NULL REFERENCES users(id),
  published_at TEXT NOT NULL,
  UNIQUE (kit_id, version_no)
);

CREATE TABLE IF NOT EXISTS campaigns (
  id TEXT PRIMARY KEY,
  slug TEXT NOT NULL UNIQUE,
  kit_id TEXT NOT NULL REFERENCES kits(id),
  creator_id TEXT NOT NULL REFERENCES users(id),
  sales_status TEXT NOT NULL DEFAULT 'not_published'
    CHECK (sales_status IN ('not_published','live','production_released','cancelling','cancelled','completed')),
  published_version_id TEXT,
  cancel_reason TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  published_at TEXT,
  released_at TEXT,
  cancelled_at TEXT,
  completed_at TEXT
);

-- A campaign version is a full proposal snapshot. Drafts are editable; once submitted
-- a version is frozen and any further edit creates a new version.
CREATE TABLE IF NOT EXISTS campaign_versions (
  id TEXT PRIMARY KEY,
  campaign_id TEXT NOT NULL REFERENCES campaigns(id),
  version_no INTEGER NOT NULL,
  kit_version_id TEXT NOT NULL REFERENCES kit_versions(id),
  content_json TEXT NOT NULL,
  content_hash TEXT NOT NULL,
  preview_svg TEXT NOT NULL,
  check_results_json TEXT NOT NULL,
  checks_passed INTEGER NOT NULL,
  review_status TEXT NOT NULL DEFAULT 'draft'
    CHECK (review_status IN ('draft','submitted','changes_requested','rejected','approved','superseded')),
  created_by TEXT NOT NULL REFERENCES users(id),
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  submitted_at TEXT,
  UNIQUE (campaign_id, version_no)
);

-- Approval is bound to the exact content hash that the reviewer saw.
CREATE TABLE IF NOT EXISTS reviews (
  id TEXT PRIMARY KEY,
  campaign_version_id TEXT NOT NULL REFERENCES campaign_versions(id),
  reviewer_id TEXT NOT NULL REFERENCES users(id),
  decision TEXT NOT NULL CHECK (decision IN ('approved','rejected','changes_requested')),
  comment TEXT NOT NULL DEFAULT '',
  content_hash TEXT NOT NULL,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS orders (
  id TEXT PRIMARY KEY,
  public_ref TEXT NOT NULL UNIQUE,
  access_token TEXT NOT NULL,
  campaign_id TEXT NOT NULL REFERENCES campaigns(id),
  campaign_version_id TEXT NOT NULL REFERENCES campaign_versions(id),
  fan_user_id TEXT REFERENCES users(id),
  buyer_name TEXT NOT NULL,
  buyer_email TEXT NOT NULL,
  buyer_city TEXT NOT NULL DEFAULT '',
  size TEXT NOT NULL,
  quantity INTEGER NOT NULL CHECK (quantity > 0),
  unit_price_minor INTEGER NOT NULL,
  shipping_minor INTEGER NOT NULL,
  total_minor INTEGER NOT NULL,
  currency TEXT NOT NULL DEFAULT 'INR',
  status TEXT NOT NULL CHECK (status IN
    ('pending_payment','payment_failed','paid','in_production','shipped','delivered','refund_pending','refunded','cancelled')),
  livemode INTEGER NOT NULL DEFAULT 0,
  checkout_key TEXT NOT NULL UNIQUE,
  created_at TEXT NOT NULL,
  paid_at TEXT,
  shipped_at TEXT,
  delivered_at TEXT,
  refunded_at TEXT,
  cancelled_at TEXT
);
CREATE INDEX IF NOT EXISTS orders_campaign ON orders(campaign_id, status);

CREATE TABLE IF NOT EXISTS payment_intents (
  id TEXT PRIMARY KEY,
  order_id TEXT NOT NULL UNIQUE REFERENCES orders(id),
  provider TEXT NOT NULL,
  provider_ref TEXT UNIQUE,
  checkout_url TEXT,
  amount_minor INTEGER NOT NULL,
  currency TEXT NOT NULL DEFAULT 'INR',
  status TEXT NOT NULL CHECK (status IN ('requires_payment','succeeded','failed','cancelled')),
  livemode INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

-- Every provider event is stored once. The UNIQUE constraint is what makes
-- redelivered webhooks harmless.
CREATE TABLE IF NOT EXISTS payment_events (
  id TEXT PRIMARY KEY,
  provider TEXT NOT NULL,
  provider_event_id TEXT NOT NULL,
  type TEXT NOT NULL,
  order_id TEXT,
  payload_json TEXT NOT NULL,
  livemode INTEGER NOT NULL DEFAULT 0,
  received_at TEXT NOT NULL,
  UNIQUE (provider, provider_event_id)
);

-- Delivery log: every attempt, including duplicates and rejected signatures.
CREATE TABLE IF NOT EXISTS payment_event_deliveries (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  provider TEXT NOT NULL,
  provider_event_id TEXT,
  type TEXT,
  order_id TEXT,
  outcome TEXT NOT NULL CHECK (outcome IN ('processed','duplicate','rejected','ignored')),
  detail TEXT NOT NULL DEFAULT '',
  received_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS refunds (
  id TEXT PRIMARY KEY,
  order_id TEXT NOT NULL UNIQUE REFERENCES orders(id),
  amount_minor INTEGER NOT NULL,
  reason TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('pending','succeeded','failed')),
  provider_ref TEXT,
  requested_by TEXT REFERENCES users(id),
  livemode INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL,
  completed_at TEXT
);

-- Append-only ledger. idempotency_key makes each financial action happen at most once.
CREATE TABLE IF NOT EXISTS ledger_entries (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  campaign_id TEXT NOT NULL REFERENCES campaigns(id),
  order_id TEXT REFERENCES orders(id),
  campaign_version_id TEXT,
  entry_type TEXT NOT NULL CHECK (entry_type IN
    ('payment_captured','refund_paid','item_sale_recognised','shipping_recognised',
     'licensor_royalty','creator_earnings','torii_commission','seller_share')),
  amount_minor INTEGER NOT NULL,
  livemode INTEGER NOT NULL DEFAULT 0,
  idempotency_key TEXT NOT NULL UNIQUE,
  memo TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS ledger_campaign ON ledger_entries(campaign_id, entry_type);

CREATE TABLE IF NOT EXISTS settings (
  key TEXT PRIMARY KEY,
  value_json TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS audit_log (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  at TEXT NOT NULL,
  actor_id TEXT,
  action TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id TEXT NOT NULL,
  detail_json TEXT NOT NULL DEFAULT '{}'
);
CREATE INDEX IF NOT EXISTS audit_entity ON audit_log(entity_type, entity_id);

-- ---------------------------------------------------------------------------
-- Payment simulator state. These tables stand in for an external provider's
-- systems; Torii's own records never read them directly.
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS sim_payments (
  ref TEXT PRIMARY KEY,
  amount_minor INTEGER NOT NULL,
  currency TEXT NOT NULL,
  description TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('open','succeeded','failed')),
  return_url TEXT NOT NULL,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS sim_refunds (
  ref TEXT PRIMARY KEY,
  payment_ref TEXT NOT NULL REFERENCES sim_payments(ref),
  idempotency_key TEXT NOT NULL UNIQUE,
  amount_minor INTEGER NOT NULL,
  status TEXT NOT NULL,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS sim_events (
  id TEXT PRIMARY KEY,
  payment_ref TEXT NOT NULL,
  refund_ref TEXT,
  type TEXT NOT NULL,
  body TEXT NOT NULL,
  signature TEXT NOT NULL,
  created_at TEXT NOT NULL
);
`;
