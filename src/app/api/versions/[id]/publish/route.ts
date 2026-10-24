import { route } from "@/lib/api";
import { requireApiUser } from "@/lib/auth";
import { publishVersion } from "@/lib/domain/campaigns";

type Ctx = { params: Promise<{ id: string }> };

export const POST = route(async (_req, { params }: Ctx) => {
  const user = await requireApiUser("creator", "operator");
  const { id } = await params;
  const c = publishVersion({ versionId: id, actor: user });
  return { campaign: { id: c.id, slug: c.slug, publishedVersionId: c.published_version_id } };
});
