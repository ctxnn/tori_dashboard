import { route, json } from "@/lib/api";
import { requireApiUser } from "@/lib/auth";
import { evaluate, requireCampaign, requireCampaignView } from "@/lib/domain/campaigns";
import { latestKitVersion } from "@/lib/domain/kits";
import { termsFor } from "@/lib/domain/core";
import { ContentInputSchema } from "@/lib/content";

type Ctx = { params: Promise<{ id: string }> };

// Dry-run the backend rule checks on unsaved editor content. Nothing is stored.
export const POST = route(async (req, { params }: Ctx) => {
  const user = await requireApiUser();
  const { id } = await params;
  const c = requireCampaign(id);
  requireCampaignView(user, c);
  const { content } = await json<{ content: unknown }>(req);
  const parsed = ContentInputSchema.safeParse(content);
  if (!parsed.success) {
    return { checks: [], issues: parsed.error.issues.map((i) => ({ path: i.path.join("."), message: i.message })) };
  }
  const kv = latestKitVersion(c.kit_id)!;
  const checks = evaluate({ ...parsed.data, terms: termsFor(kv.rules.royaltyBps) }, kv, { approved: false, forSubmission: true });
  return { checks, issues: [], kitVersionNo: kv.versionNo };
});
