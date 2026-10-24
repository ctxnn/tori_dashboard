import Link from "next/link";
import { requirePageRole } from "@/lib/auth";
import { all } from "@/lib/db";
import { listCampaigns, summarise } from "@/lib/domain/campaigns";
import { campaignProgress } from "@/lib/domain/orders";
import { REVIEW_STATUS, SALES_STATUS, formatDate } from "@/lib/labels";
import { formatINR } from "@/lib/money";
import { Badge, Card, CardHeader, PageHeader, ProgressBar, SimBadge, Stat } from "@/components/ui";

export const metadata = { title: "Operations" };

function nextAction(salesStatus: string, p: ReturnType<typeof campaignProgress>, openToShip: number, toDeliver: number): { label: string; tone: "vermilion" | "warn" | "ok" | "info" | "neutral" } | null {
  if (salesStatus === "live" && p.thresholdMet) return { label: "Eligible for production release", tone: "ok" };
  if (salesStatus === "live" && p.deadlinePassed) return { label: "Deadline missed — cancel and refund", tone: "warn" };
  if (salesStatus === "cancelling") return { label: "Refunds still processing", tone: "warn" };
  if (salesStatus === "production_released" && openToShip > 0) return { label: `${openToShip} order${openToShip === 1 ? "" : "s"} to ship`, tone: "info" };
  if (salesStatus === "production_released" && toDeliver > 0) return { label: `${toDeliver} awaiting delivery`, tone: "info" };
  return null;
}

export default async function OpsHome() {
  await requirePageRole("operator");
  const campaigns = listCampaigns().map(summarise);
  const counts = all<{ campaign_id: string; status: string; n: number }>("SELECT campaign_id, status, COUNT(*) AS n FROM orders GROUP BY 1, 2");
  const count = (cid: string, ...st: string[]) => counts.filter((r) => r.campaign_id === cid && st.includes(r.status)).reduce((s, r) => s + r.n, 0);
  const totals = all<{ entry_type: string; total: number; livemode: number }>("SELECT entry_type, livemode, SUM(amount_minor) AS total FROM ledger_entries GROUP BY 1, 2");
  const sum = (t: string) => totals.filter((r) => r.entry_type === t).reduce((s, r) => s + r.total, 0);
  const liveMoney = totals.some((r) => r.livemode === 1);

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Torii operations"
        stage={5}
        title="Production, fulfilment and refunds"
        description="Decide which runs go to production, cancel the ones that missed, and keep the ledger honest."
        actions={<SimBadge />}
      />
      <Card className="grid gap-6 p-5 sm:grid-cols-4 sm:p-6">
        <Stat label="Payments captured" value={formatINR(sum("payment_captured"))} hint={liveMoney ? "Includes live data" : "All simulated"} />
        <Stat label="Refunds paid" value={formatINR(-sum("refund_paid"))} />
        <Stat label="Net item sales delivered" value={formatINR(sum("item_sale_recognised"))} />
        <Stat label="Torii commission earned" value={formatINR(sum("torii_commission"))} hint="Revenue before expenses, not profit" />
      </Card>

      <Card>
        <CardHeader title="Campaigns" subtitle="Anything needing a decision is flagged." />
        <div className="overflow-x-auto">
          <table className="w-full min-w-[820px] text-left text-sm">
            <thead className="border-b border-sand text-xs uppercase tracking-wider text-moss">
              <tr>
                <th className="px-5 py-3 font-medium sm:px-6">Campaign</th>
                <th className="px-3 py-3 font-medium">Status</th>
                <th className="px-3 py-3 font-medium">Paid units</th>
                <th className="px-3 py-3 font-medium">Deadline</th>
                <th className="px-3 py-3 font-medium">Needs</th>
                <th className="px-5 py-3 sm:px-6"><span className="sr-only">Open</span></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-sand">
              {campaigns.map((s) => {
                const p = s.published ? campaignProgress(s.campaign) : null;
                const st = SALES_STATUS[s.campaign.sales_status];
                const act = p ? nextAction(s.campaign.sales_status, p, count(s.campaign.id, "paid", "in_production"), count(s.campaign.id, "shipped")) : null;
                return (
                  <tr key={s.campaign.id}>
                    <td className="px-5 py-3 sm:px-6">
                      <div className="font-medium">{(s.published ?? s.latest).content.copy.title}</div>
                      <div className="text-xs text-moss">{s.creator.name} · {s.kit.property_name}</div>
                    </td>
                    <td className="px-3 py-3">
                      {s.published ? <Badge tone={st.tone}>{st.label}</Badge> : <Badge tone={REVIEW_STATUS[s.latest.reviewStatus].tone}>{REVIEW_STATUS[s.latest.reviewStatus].label}</Badge>}
                    </td>
                    <td className="px-3 py-3">
                      {p ? (
                        <div className="w-36">
                          <ProgressBar value={p.paidUnits} max={p.threshold} />
                          <div className="mt-1 text-xs text-moss">{p.paidUnits} / {p.threshold}</div>
                        </div>
                      ) : (
                        <span className="text-moss">Not published</span>
                      )}
                    </td>
                    <td className="px-3 py-3 text-moss">{p ? (p.deadlinePassed ? `Passed ${formatDate(p.deadline)}` : `${formatDate(p.deadline)} (${p.daysLeft}d)`) : "—"}</td>
                    <td className="px-3 py-3">{act ? <Badge tone={act.tone}>{act.label}</Badge> : <span className="text-moss">—</span>}</td>
                    <td className="px-5 py-3 text-right sm:px-6">
                      {s.published && <Link href={`/ops/campaigns/${s.campaign.id}`} className="font-medium text-pine hover:underline">Manage →</Link>}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
