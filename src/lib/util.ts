import crypto from "node:crypto";

const ALPHABET = "0123456789abcdefghjkmnpqrstvwxyz";

export function id(prefix: string, length = 12): string {
  const bytes = crypto.randomBytes(length);
  let out = "";
  for (const b of bytes) out += ALPHABET[b % ALPHABET.length];
  return `${prefix}_${out}`;
}

export function publicRef(): string {
  const bytes = crypto.randomBytes(6);
  let out = "";
  for (const b of bytes) out += "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"[b % 32];
  return `TOR-${out}`;
}

export function token(): string {
  return crypto.randomBytes(18).toString("base64url");
}

const clock = globalThis as unknown as { __toriiClock?: Date | null };

/** Current time. TORII_NOW (or a seed-time override) pins the clock. */
export function now(): Date {
  if (clock.__toriiClock) return new Date(clock.__toriiClock);
  return process.env.TORII_NOW ? new Date(process.env.TORII_NOW) : new Date();
}

/** Used by the seed to replay history at past timestamps. */
export function setClock(d: Date | null): void {
  clock.__toriiClock = d;
}

export function nowIso(): string {
  return now().toISOString();
}

export function todayIso(): string {
  return nowIso().slice(0, 10);
}

/** JSON with sorted keys, so equal content always hashes the same. */
export function canonicalJson(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(canonicalJson).join(",")}]`;
  if (value && typeof value === "object") {
    const entries = Object.entries(value as Record<string, unknown>)
      .filter(([, v]) => v !== undefined)
      .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0));
    return `{${entries.map(([k, v]) => `${JSON.stringify(k)}:${canonicalJson(v)}`).join(",")}}`;
  }
  return JSON.stringify(value);
}

export function sha256(input: string | Buffer): string {
  return crypto.createHash("sha256").update(input).digest("hex");
}

export function hmac(secret: string, input: string): string {
  return crypto.createHmac("sha256", secret).update(input).digest("hex");
}

export function safeEqual(a: string, b: string): boolean {
  const ab = Buffer.from(a);
  const bb = Buffer.from(b);
  return ab.length === bb.length && crypto.timingSafeEqual(ab, bb);
}

export function slugify(input: string): string {
  return input
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^\w\s-]/g, "")
    .trim()
    .replace(/[\s_]+/g, "-")
    .replace(/-+/g, "-")
    .slice(0, 48);
}
