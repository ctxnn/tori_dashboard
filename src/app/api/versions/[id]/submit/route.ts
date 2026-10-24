import { route } from "@/lib/api";
import { requireApiUser } from "@/lib/auth";
import { submitVersion } from "@/lib/domain/campaigns";

type Ctx = { params: Promise<{ id: string }> };

export const POST = route(async (_req, { params }: Ctx) => {
  const user = await requireApiUser("creator");
  const { id } = await params;
  const v = submitVersion({ versionId: id, actor: user });
  return { version: { id: v.id, versionNo: v.versionNo, reviewStatus: v.reviewStatus, checks: v.checks } };
});
