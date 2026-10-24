import { route } from "@/lib/api";
import { requireApiUser } from "@/lib/auth";
import { requireCampaign, requireCampaignView } from "@/lib/domain/campaigns";
import { buildStatement, statementCsv } from "@/lib/domain/statements";

type Ctx = { params: Promise<{ id: string }> };

export const GET = route(async (_req, { params }: Ctx) => {
  const user = await requireApiUser("owner", "creator", "operator");
  const { id } = await params;
  const c = requireCampaign(id);
  requireCampaignView(user, c);
  const s = buildStatement(c.id);
  return new Response(statementCsv(s), {
    headers: {
      "content-type": "text/csv; charset=utf-8",
      "content-disposition": `attachment; filename="torii-statement-${c.slug}.csv"`,
    },
  });
});
