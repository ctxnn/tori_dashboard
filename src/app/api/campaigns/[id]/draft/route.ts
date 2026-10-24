import { route, json } from "@/lib/api";
import { requireApiUser } from "@/lib/auth";
import { saveDraft } from "@/lib/domain/campaigns";

type Ctx = { params: Promise<{ id: string }> };

export const PUT = route(async (req, { params }: Ctx) => {
  const user = await requireApiUser("creator");
  const { id } = await params;
  const { content } = await json<{ content: unknown }>(req);
  const v = saveDraft({ campaignId: id, actor: user, content });
  return { version: { id: v.id, versionNo: v.versionNo, reviewStatus: v.reviewStatus, checks: v.checks, contentHash: v.contentHash } };
});
