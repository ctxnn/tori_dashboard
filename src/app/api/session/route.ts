import { route, json } from "@/lib/api";
import { clearSessionCookie, setSessionCookie } from "@/lib/auth";
import { getUser } from "@/lib/domain/core";
import { badRequest } from "@/lib/errors";
import { clearStoreCookie } from "@/store/lib/auth";
import { clearPartnerSession } from "@/store/lib/partner-auth";

const HOME: Record<string, string> = { owner: "/owner", creator: "/creator", fan: "/read", operator: "/ops" };

export const POST = route(async (req) => {
  const { userId } = await json<{ userId: string }>(req);
  const user = getUser(userId);
  if (!user) throw badRequest("Unknown demo user");
  await setSessionCookie(user.id);
  // A phone sign-in to the fan app or a password sign-in to the Partner Portal would otherwise
  // outrank the person just chosen.
  await clearStoreCookie();
  await clearPartnerSession();
  return { user: { id: user.id, name: user.name, role: user.role }, home: HOME[user.role] };
});

export const DELETE = route(async () => {
  await clearSessionCookie();
  await clearStoreCookie();
  await clearPartnerSession();
  return { ok: true };
});
