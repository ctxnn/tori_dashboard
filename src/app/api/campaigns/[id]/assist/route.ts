import { route, json } from "@/lib/api";
import { requireApiUser } from "@/lib/auth";
import { suggestDirections } from "@/lib/assist";

type Ctx = { params: Promise<{ id: string }> };

export const POST = route(async (req, { params }: Ctx) => {
  const user = await requireApiUser("creator");
  const { id } = await params;
  const body = await json<{ brief?: string; current?: unknown }>(req);
  return suggestDirections({ campaignId: id, brief: body.brief ?? "", actor: user, current: body.current });
});
