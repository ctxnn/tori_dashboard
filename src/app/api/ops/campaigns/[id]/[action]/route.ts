import { route, json } from "@/lib/api";
import { requireApiUser } from "@/lib/auth";
import { requireCampaign } from "@/lib/domain/campaigns";
import { markDelivered, markShipped, releaseProduction } from "@/lib/domain/fulfilment";
import { cancelCampaign } from "@/lib/domain/refunds";
import { paymentRefsForCampaign } from "@/lib/domain/orders";
import { simulatorReplayAll } from "@/lib/domain/payments/simulator";
import { get } from "@/lib/db";
import { badRequest } from "@/lib/errors";

type Ctx = { params: Promise<{ id: string; action: string }> };

function ledgerTotals(campaignId: string) {
  return get<{ n: number; total: number | null }>("SELECT COUNT(*) AS n, SUM(amount_minor) AS total FROM ledger_entries WHERE campaign_id = ?", campaignId)!;
}

export const POST = route(async (req, { params }: Ctx) => {
  const user = await requireApiUser("operator");
  const { id, action } = await params;
  requireCampaign(id);
  const body = await json<{ reason?: string; orderIds?: string[] }>(req).catch(() => ({}) as { reason?: string; orderIds?: string[] });
  switch (action) {
    case "release":
      return releaseProduction({ campaignId: id, actor: user });
    case "cancel":
      return cancelCampaign({ campaignId: id, actor: user, reason: body.reason ?? "" });
    case "ship":
      return markShipped({ campaignId: id, actor: user, orderIds: body.orderIds });
    case "deliver":
      return markDelivered({ campaignId: id, actor: user, orderIds: body.orderIds });
    case "replay-events": {
      // Redeliver every provider event for this campaign to prove nothing changes.
      const before = ledgerTotals(id);
      const results = await simulatorReplayAll(paymentRefsForCampaign(id));
      const after = ledgerTotals(id);
      return {
        delivered: results.length,
        duplicates: results.filter((r) => r.outcome === "duplicate").length,
        ledgerBefore: before,
        ledgerAfter: after,
        unchanged: before.n === after.n && before.total === after.total,
      };
    }
    default:
      throw badRequest("Unknown action");
  }
});
