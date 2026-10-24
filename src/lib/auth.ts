// Demo role access. A signed, HTTP-only cookie identifies the current demo user.
// There are no passwords: anyone running the demo can switch roles, but every
// permission is still enforced on the server against that user's role and org.
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { HttpError } from "./errors";
import { getUser, type Role, type User } from "./domain/core";
import { hmac, safeEqual } from "./util";

const COOKIE = "torii_session";

function secret(): string {
  return process.env.SESSION_SECRET || "dev_only_session_secret_change_me";
}

export function signSession(userId: string): string {
  return `${userId}.${hmac(secret(), userId)}`;
}

export function readSession(value: string | undefined): string | null {
  if (!value) return null;
  const i = value.lastIndexOf(".");
  if (i < 1) return null;
  const userId = value.slice(0, i);
  return safeEqual(hmac(secret(), userId), value.slice(i + 1)) ? userId : null;
}

export async function currentUser(): Promise<User | undefined> {
  const jar = await cookies();
  const userId = readSession(jar.get(COOKIE)?.value);
  return userId ? getUser(userId) : undefined;
}

export async function setSessionCookie(userId: string) {
  const jar = await cookies();
  jar.set(COOKIE, signSession(userId), { httpOnly: true, sameSite: "lax", path: "/", secure: process.env.NODE_ENV === "production" && process.env.INSECURE_COOKIES !== "1" });
}

export async function clearSessionCookie() {
  (await cookies()).delete(COOKIE);
}

/** For pages: send people to the role switcher if they're not the right role. */
export async function requirePageRole(...roles: Role[]): Promise<User> {
  const user = await currentUser();
  if (!user || (roles.length && !roles.includes(user.role))) {
    redirect(`/switch?need=${roles.join(",")}`);
  }
  return user;
}

/** For API routes. */
export async function requireApiUser(...roles: Role[]): Promise<User> {
  const user = await currentUser();
  if (!user) throw new HttpError(401, "Choose a demo role first");
  if (roles.length && !roles.includes(user.role)) throw new HttpError(403, `This action needs the ${roles.join(" or ")} role`);
  return user;
}
