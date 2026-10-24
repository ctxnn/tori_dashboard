import { route, json } from "@/lib/api";
import { requireApiUser } from "@/lib/auth";
import { createCampaign } from "@/lib/domain/campaigns";

export const POST = route(async (req) => {
  const user = await requireApiUser("creator");
  const body = await json<{ kitId: string; title: string }>(req);
  const c = createCampaign({ kitId: body.kitId, title: body.title ?? "", actor: user });
  return { campaign: { id: c.id, slug: c.slug } };
});
