import { route, json } from "@/lib/api";
import { requireApiUser } from "@/lib/auth";
import { summariseAudience } from "@/lib/insight-ai";

export const POST = route(async (req) => {
  const user = await requireApiUser("owner", "creator", "operator");
  const body = await json<{ kitId?: string }>(req);
  return summariseAudience({ kitId: body.kitId ?? "", actor: user });
});
