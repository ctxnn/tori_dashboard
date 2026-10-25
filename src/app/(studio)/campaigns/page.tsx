import { listLiveCampaigns, summarise } from "@/lib/domain/campaigns";
import { EmptyState, PageHeader } from "@/components/ui";
import { CampaignTile } from "@/components/campaign-tile";
import { getT } from "@/lib/i18n";

export const metadata = { title: "Campaigns" };

export default async function CampaignsPage() {
  const all = listLiveCampaigns().map(summarise);
  const order = ["live", "production_released", "cancelling", "completed", "cancelled"];
  all.sort((a, b) => order.indexOf(a.campaign.sales_status) - order.indexOf(b.campaign.sales_status));
  const t = await getT("owner");
  return (
    <div>
      <PageHeader
        eyebrow={t("Official collaborations", "公式コラボレーション")}
        stage={4}
        t={t}
        title={t(<>Back a run <span className="font-serif font-normal italic">before</span> it’s made.</>, <>つくられる<span className="font-serif font-normal italic">前に</span>、予約で応援する。</>)}
        description={t(
          "Every campaign is approved by the IP owner. Your preorder counts toward a production gate; if it isn’t reached, everyone is refunded in full.",
          "すべてのキャンペーンは権利者さまのご承認を経ています。予約は生産条件の達成に加算され、達成しなかった場合は全額返金されます。",
        )}
      />
      {all.length === 0 ? (
        <EmptyState title={t("No campaigns are live", "実施中のキャンペーンはございません")}>{t("Check back soon.", "またのお越しをお待ちしております。")}</EmptyState>
      ) : (
        <ul className="grid gap-x-6 gap-y-12 sm:grid-cols-2 lg:grid-cols-3">
          {all.map((s, i) => (
            <li key={s.campaign.id}><CampaignTile s={s} index={i} t={t} /></li>
          ))}
        </ul>
      )}
    </div>
  );
}
