import { route, json } from "@/lib/api";
import { clearSessionCookie, setSessionCookie } from "@/lib/auth";
import { getUser } from "@/lib/domain/core";
import { badRequest } from "@/lib/errors";

const HOME: Record<string, string> = { owner: "/owner", creator: "/creator", fan: "/campaigns", operator: "/ops" };

export const POST = route(async (req) => {
  const { userId } = await json<{ userId: string }>(req);
  const user = getUser(userId);
  if (!user) throw badRequest("Unknown demo user");
  await setSessionCookie(user.id);
  return { user: { id: user.id, name: user.name, role: user.role }, home: HOME[user.role] };
});

export const DELETE = route(async () => {
  await clearSessionCookie();
  return { ok: true };
});
