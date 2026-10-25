import { mutate, id, now } from "@/store/lib/db";
import { setSession } from "@/store/lib/auth";
import { body, fail, ok } from "@/store/lib/api";

// Prototype OTP: SMS is mocked and the code is always 123456.
export async function POST(req: Request) {
  const { phone, otp, name } = await body<{ phone: string; otp?: string; name?: string }>(req);
  const p = String(phone || "").replace(/\D/g, "").replace(/^91(?=\d{10}$)/, "");
  if (!/^[6-9]\d{9}$/.test(p)) return fail("Enter a valid 10-digit Indian mobile number");
  if (otp === undefined) return ok({ sent: true });
  if (otp !== "123456") return fail("Incorrect OTP. (Prototype: use 123456)");
  const user = await mutate((db) => {
    let u = db.users.find((x) => x.phone === p);
    if (!u) { u = { id: id("u_"), phone: p, name: name?.trim() || null, wallet: 0, isAdmin: false, createdAt: now() }; db.users.push(u); }
    return u;
  });
  await setSession(user.id);
  return ok({ ok: true, isAdmin: user.isAdmin });
}
