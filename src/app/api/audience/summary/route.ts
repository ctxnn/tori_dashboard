import { route, json } from "@/lib/api";
import { requireApiUser } from "@/lib/auth";
import { summariseAudience } from "@/lib/insight-ai";

export const POST = route(async (req) => {
  const user = await requireApiUser("owner", "creator", "operator");
  const body = await json<{ kitId?: string; lang?: string }>(req);
  // Japanese only for the IP owner, matching the language picker's scope.
  const lang = body.lang === "ja" && user.role === "owner" ? "ja" : "en";
  return summariseAudience({ kitId: body.kitId ?? "", actor: user, lang });
});
