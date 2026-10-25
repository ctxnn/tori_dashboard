import { requirePartner } from "@/store/lib/partner-auth";
import { buildInsights } from "@/store/lib/insights";
import { PageHead } from "@/store/components/partner/ui";
import Dashboard from "@/store/components/Dashboard";
import Locked from "@/store/components/partner/Locked";
import { getT } from "@/lib/i18n";

export const dynamic = "force-dynamic";
export const metadata = { title: "India insights" };

export default async function Insights() {
  const { org, db } = await requirePartner("/partner/insights");
  const t = await getT("partner");
  const head = <PageHead en="India insights" ja="インド市場データ" sub={t("Who reads and buys your titles in India, by series, language, state and city, over the last 90 days.", "直近90日間に、インドのどこで、どなたが貴社の作品を読み、購入しているかを、作品・言語・州・都市別にお示しします。")} />;
  if (!org.verified) return <div>{head}<Locked name={org.name} /></div>;
  const ids = new Set(db.series.filter((s) => s.publisherId === org.publisherId).map((s) => s.id));
  const data = buildInsights(db, ids);
  return (
    <div>
      {head}
      {ids.size ? (
        <div className="max-w-4xl"><Dashboard {...data} scope={org.name} /></div>
      ) : <p className="card p-8 text-center text-muted">{t("Insights appear when your first title is live.", "最初の作品の配信開始後に、データが表示されます。")}</p>}
    </div>
  );
}
