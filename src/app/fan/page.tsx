import Link from "next/link";
import { requirePageRole } from "@/lib/auth";
import { getVersion } from "@/lib/domain/campaigns";
import { listOrdersForFan } from "@/lib/domain/orders";
import { ORDER_STATUS, formatDate } from "@/lib/labels";
import { formatINR } from "@/lib/money";
import { Badge, Card, EmptyState, LinkButton, PageHeader, SimBadge } from "@/components/ui";
import { Preview } from "@/components/preview";

export const metadata = { title: "My orders" };

export default async function FanOrders() {
  const user = await requirePageRole("fan");
  const orders = listOrdersForFan(user.id);
  return (
    <div>
      <PageHeader eyebrow="Fan"
        stage={4} title="Your preorders" description="Every order keeps the exact design version you paid for." actions={<LinkButton href="/campaigns" variant="secondary">Browse campaigns</LinkButton>} />
      {orders.length === 0 ? (
        <EmptyState title="No preorders yet" action={<LinkButton href="/campaigns">Find a campaign</LinkButton>}>Back a campaign and it’ll show up here.</EmptyState>
      ) : (
        <ul className="grid gap-4 md:grid-cols-2">
          {orders.map((o) => {
            const v = getVersion(o.campaign_version_id)!;
            const st = ORDER_STATUS[o.status];
            return (
              <li key={o.id}>
                <Link href={`/orders/${o.public_ref}?t=${o.access_token}`} className="block">
                  <Card className="flex gap-4 p-4 transition hover:shadow-lg">
                    <Preview svg={v.previewSvg} className="w-24 shrink-0 overflow-hidden rounded-lg" />
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-display font-semibold">{v.content.copy.title}</span>
                        <Badge tone={st.tone}>{st.label}</Badge>
                        {!o.livemode && <SimBadge />}
                      </div>
                      <p className="mt-1 text-sm text-moss">{o.public_ref} · {o.quantity} × {o.size} · {formatINR(o.total_minor)}</p>
                      <p className="text-xs text-moss">Placed {formatDate(o.created_at)} · design v{v.versionNo}</p>
                    </div>
                  </Card>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
