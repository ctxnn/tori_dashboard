import "server-only";
import crypto from "node:crypto";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { currentUser as studioUser } from "@/lib/auth";
import { read } from "./db";
import type { DB, PartnerOrg, PartnerUser } from "./types";

/**
 * Partner Portal sessions. Separate from fan sign-in (phone + OTP): publishers sign in with a work
 * email and password, and get their own cookie, so a fan session can never open the portal.
 */
const COOKIE = "torii_partner";
const secret = () => process.env.AUTH_SECRET || process.env.SESSION_SECRET || "dev-auth-secret-change-me";
const sig = (v: string) => crypto.createHmac("sha256", secret()).update(`partner:${v}`).digest("base64url");

export async function setPartnerSession(userId: string) {
  (await cookies()).set(COOKIE, `${userId}.${sig(userId)}`, { httpOnly: true, sameSite: "lax", path: "/", maxAge: 60 * 60 * 24 * 14 });
}
export async function clearPartnerSession() {
  (await cookies()).delete(COOKIE);
}

export type PartnerSession = { user: PartnerUser; org: PartnerOrg; db: DB };

/** The partner user from the portal cookie, or (no cookie) the one linked to the IP owner chosen at /switch. */
async function partnerUserId(db: DB): Promise<string | null> {
  const raw = (await cookies()).get(COOKIE)?.value;
  if (raw) {
    const [uid, s] = raw.split(".");
    if (!uid || !s) return null;
    const a = Buffer.from(sig(uid)), b = Buffer.from(s);
    return a.length === b.length && crypto.timingSafeEqual(a, b) ? uid : null;
  }
  const studio = await studioUser();
  return studio?.role === "owner" ? db.partnerUsers.find((u) => u.studioIds?.includes(studio.id))?.id ?? null : null;
}

export async function currentPartner(): Promise<PartnerSession | null> {
  const db = await read();
  const uid = await partnerUserId(db);
  if (!uid) return null;
  const user = db.partnerUsers.find((u) => u.id === uid);
  const org = user && db.partners.find((o) => o.id === user.orgId);
  return user && org ? { user, org, db } : null;
}

export async function requirePartner(next = "/partner/dashboard"): Promise<PartnerSession> {
  const p = await currentPartner();
  if (!p) redirect(`/partner/login?next=${encodeURIComponent(next)}`);
  return p;
}

export const normEmail = (e: unknown) => String(e ?? "").trim().toLowerCase();
export const validEmail = (e: string) => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(e) && e.length <= 120;
