import { route, json } from "@/lib/api";
import { requireApiUser } from "@/lib/auth";
import { publishKitVersion } from "@/lib/domain/kits";

type Ctx = { params: Promise<{ id: string }> };

export const POST = route(async (req, { params }: Ctx) => {
  const user = await requireApiUser("owner");
  const { id } = await params;
  const body = await json<{ rules: unknown; assetIds: string[]; notes: string }>(req);
  const kv = publishKitVersion({ kitId: id, rules: body.rules, assetIds: body.assetIds ?? [], notes: body.notes ?? "", actor: user });
  return { kitVersion: { id: kv.id, versionNo: kv.versionNo } };
});
