import { route, json } from "@/lib/api";
import { requireApiUser } from "@/lib/auth";
import { badRequest } from "@/lib/errors";
import { follow, unfollow } from "@/lib/domain/community";

export const POST = route(async (req) => {
  const user = await requireApiUser("fan");
  const body = await json<{ targetType?: string; targetId?: string; on?: boolean }>(req);
  if (body.targetType !== "kit" && body.targetType !== "creator") throw badRequest("Choose a property or a creator to follow");
  if (!body.targetId) throw badRequest("Missing what to follow");
  if (body.on === false) unfollow(user, body.targetType, body.targetId);
  else follow(user, body.targetType, body.targetId);
  return { following: body.on !== false };
});
