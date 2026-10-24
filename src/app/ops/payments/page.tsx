import Link from "next/link";
import { requirePageRole } from "@/lib/auth";
import { all } from "@/lib/db";
import { formatDateTime } from "@/lib/labels";
import { Badge, Card, CardHeader, PageHeader, SimBadge, Stat } from "@/components/ui";

export const metadata = { title: "Payment events" };

interface Row {
  id: number;
  provider: string;
  provider_event_id: string | null;
  type: string | null;
  outcome: string;
  detail: string;
  received_at: string;
  public_ref: string | null;
  campaign_id: string | null;
}

export default async function PaymentsLog() {
  await requirePageRole("operator");
  const rows = all<Row>(
    `SELECT d.*, o.public_ref, o.campaign_id FROM payment_event_deliveries d LEFT JOIN orders o ON o.id = d.order_id ORDER BY d.id DESC LIMIT 200`,
  );
  const counts = all<{ outcome: string; n: number }>("SELECT outcome, COUNT(*) AS n FROM payment_event_deliveries GROUP BY 1");
  const c = (o: string) => counts.find((x) => x.outcome === o)?.n ?? 0;
  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Trusted backend processing"
        stage={4}
        title="Payment events"
        description="Every delivery from the payment provider, including retries. Orders change only when a correctly signed event is seen for the first time."
        actions={<SimBadge />}
      />
      <Card className="grid gap-6 p-5 sm:grid-cols-4 sm:p-6">
        <Stat label="Processed" value={c("processed")} />
        <Stat label="Duplicates ignored" value={c("duplicate")} />
        <Stat label="Rejected signatures" value={c("rejected")} />
        <Stat label="Unmatched" value={c("ignored")} />
      </Card>
      <Card>
        <CardHeader title="Latest 200 deliveries" />
        <div className="overflow-x-auto">
          <table className="w-full min-w-[760px] text-left text-sm">
            <thead className="border-b border-sand text-xs uppercase tracking-wider text-moss">
              <tr>
                <th className="px-5 py-2.5 font-medium sm:px-6">Received</th>
                <th className="px-3 py-2.5 font-medium">Event</th>
                <th className="px-3 py-2.5 font-medium">Order</th>
                <th className="px-3 py-2.5 font-medium">Result</th>
                <th className="px-5 py-2.5 font-medium sm:px-6">Detail</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-sand">
              {rows.map((r) => (
                <tr key={r.id}>
                  <td className="whitespace-nowrap px-5 py-2 text-moss sm:px-6">{formatDateTime(r.received_at)}</td>
                  <td className="px-3 py-2"><span className="font-mono text-xs">{r.type ?? "—"}</span><div className="font-mono text-[10px] text-moss">{r.provider_event_id}</div></td>
                  <td className="px-3 py-2">{r.public_ref ? <Link href={`/ops/campaigns/${r.campaign_id}`} className="font-mono text-xs text-pine hover:underline">{r.public_ref}</Link> : "—"}</td>
                  <td className="px-3 py-2"><Badge tone={r.outcome === "processed" ? "ok" : r.outcome === "duplicate" ? "gold" : r.outcome === "rejected" ? "fail" : "neutral"}>{r.outcome}</Badge></td>
                  <td className="px-5 py-2 text-ink-2 sm:px-6">{r.detail}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
