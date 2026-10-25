import { mutate, now, read } from "@/store/lib/db";
import { body, fail, ok } from "@/store/lib/api";
import { normEmail, setPartnerSession } from "@/store/lib/partner-auth";
import { verifyPassword } from "@/store/lib/password";

// Slows down password guessing: 8 failed attempts per email per 10 minutes (per server instance).
const tries = new Map<string, { n: number; until: number }>();

export async function POST(req: Request) {
  const { email, password } = await body<{ email: string; password: string }>(req);
  const e = normEmail(email);
  const t = tries.get(e);
  if (t && t.n >= 8 && t.until > Date.now()) return fail("Too many attempts. Try again in a few minutes.", 429);
  const db = await read();
  const user = db.partnerUsers.find((u) => u.email === e);
  if (!user || !verifyPassword(String(password ?? ""), user.passwordHash)) {
    const cur = t && t.until > Date.now() ? t : { n: 0, until: Date.now() + 10 * 60e3 };
    tries.set(e, { n: cur.n + 1, until: cur.until });
    return fail("That email and password don't match a partner account.", 401);
  }
  tries.delete(e);
  await mutate((d) => { const u = d.partnerUsers.find((x) => x.id === user.id); if (u) u.lastLoginAt = now(); });
  await setPartnerSession(user.id);
  return ok({ ok: true });
}
