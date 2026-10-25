import "server-only";
import crypto from "node:crypto";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { currentUser as studioUser, clearSessionCookie } from "@/lib/auth";
import { mutate, read, id, now } from "./db";
import type { User } from "./types";

/**
 * Fan app sign-in. Two ways in:
 *  - phone + OTP (any Indian mobile number; the OTP is simulated), which sets this cookie, or
 *  - the Torii demo identity chosen at /switch. Each demo person gets one store account, linked
 *    by `studioId`, so Aarav's shelf, cart and wallet follow him between the workspace and the app,
 *    and Torii operations staff are store admins.
 */
const COOKIE = "torii_store";
const secret = () => process.env.AUTH_SECRET || process.env.SESSION_SECRET || "dev-auth-secret-change-me";
const sig = (v: string) => crypto.createHmac("sha256", secret()).update(`store:${v}`).digest("base64url");

export function sessionValue(userId: string) {
  return `${userId}.${sig(userId)}`;
}
export async function setSession(userId: string) {
  (await cookies()).set(COOKIE, sessionValue(userId), { httpOnly: true, sameSite: "lax", path: "/", maxAge: 60 * 60 * 24 * 30 });
}
/** Signs out of the fan app and the demo identity together, so the next visit really is signed out. */
export async function clearSession() {
  (await cookies()).delete(COOKIE);
  await clearSessionCookie();
}
export async function clearStoreCookie() {
  (await cookies()).delete(COOKIE);
}

export async function currentUser(): Promise<User | null> {
  const raw = (await cookies()).get(COOKIE)?.value;
  if (raw) {
    const [uid, s] = raw.split(".");
    if (uid && s && sig(uid) === s) {
      const u = (await read()).users.find((x) => x.id === uid);
      if (u) return u;
    }
  }
  const studio = await studioUser();
  if (!studio) return null;
  const linked = (await read()).users.find((u) => u.studioId === studio.id);
  if (linked) return linked;
  // First visit to the fan app as this demo person: open their store account.
  return mutate((db) => {
    let u = db.users.find((x) => x.studioId === studio.id);
    if (!u) {
      u = { id: id("u_"), phone: "", name: studio.name, wallet: 0, isAdmin: studio.role === "operator", createdAt: now(), studioId: studio.id };
      db.users.push(u);
    }
    return u;
  });
}
export async function requireUser(next = "/"): Promise<User> {
  const u = await currentUser();
  if (!u) redirect(`/login?next=${encodeURIComponent(next)}`);
  return u;
}
export async function requireAdmin(): Promise<User> {
  const u = await requireUser("/publisher");
  if (!u.isAdmin) redirect("/account?denied=1");
  return u;
}
