import { listLiveCampaigns, summarise } from "@/lib/domain/campaigns";
import { EmptyState, PageHeader } from "@/components/ui";
import { CampaignTile } from "@/components/campaign-tile";

export const metadata = { title: "Campaigns" };

export default async function CampaignsPage() {
  const all = listLiveCampaigns().map(summarise);
  const order = ["live", "production_released", "cancelling", "completed", "cancelled"];
  all.sort((a, b) => order.indexOf(a.campaign.sales_status) - order.indexOf(b.campaign.sales_status));
  return (
    <div>
      <PageHeader
        eyebrow="Official collaborations"
        stage={4}
        title={<>Back a run <span className="font-serif font-normal italic">before</span> it’s made.</>}
        description="Every campaign is approved by the IP owner. Your preorder counts toward a production gate; if it isn’t reached, everyone is refunded in full."
      />
      {all.length === 0 ? (
        <EmptyState title="No campaigns are live">Check back soon.</EmptyState>
      ) : (
        <ul className="grid gap-x-6 gap-y-12 sm:grid-cols-2 lg:grid-cols-3">
          {all.map((s, i) => (
            <li key={s.campaign.id}><CampaignTile s={s} index={i} /></li>
          ))}
        </ul>
      )}
    </div>
  );
}
