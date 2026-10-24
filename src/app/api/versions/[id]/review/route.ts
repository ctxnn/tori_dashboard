import { route, json } from "@/lib/api";
import { requireApiUser } from "@/lib/auth";
import { reviewVersion, type Decision } from "@/lib/domain/reviews";
import { badRequest } from "@/lib/errors";

type Ctx = { params: Promise<{ id: string }> };

export const POST = route(async (req, { params }: Ctx) => {
  const user = await requireApiUser("owner");
  const { id } = await params;
  const body = await json<{ decision: Decision; comment?: string; expectedHash?: string }>(req);
  if (!["approved", "rejected", "changes_requested"].includes(body.decision)) throw badRequest("Unknown decision");
  const v = reviewVersion({ versionId: id, actor: user, decision: body.decision, comment: body.comment ?? "", expectedHash: body.expectedHash });
  return { version: { id: v.id, versionNo: v.versionNo, reviewStatus: v.reviewStatus } };
});
