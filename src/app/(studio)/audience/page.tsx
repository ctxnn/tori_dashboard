import Link from "next/link";
import { notFound } from "next/navigation";
import { requirePageRole } from "@/lib/auth";
import { audienceInsights, defaultKitId, requireAudienceView } from "@/lib/domain/audience";
import { getKit } from "@/lib/domain/kits";
import { aiAvailable } from "@/lib/assist";
import { formatINR } from "@/lib/money";
import { formatDate } from "@/lib/labels";
import { Arrow, Card, CardHeader, PageHeader } from "@/components/ui";
import { IndiaMap } from "@/components/india-map";
import { PriceCurve, ShareBars } from "@/components/audience/charts";
import { BrushStroke } from "@/components/japan";
import { SummaryPanel } from "./summary-panel";
import { getT } from "@/lib/i18n";
import { pulseJa } from "@/lib/pulse-ja";

export const metadata = { title: "Audience" };

export default async function AudiencePage() {
  const user = await requirePageRole("owner", "creator", "operator");
  const kitId = defaultKitId();
  const kit = kitId ? getKit(kitId) : undefined;
  if (!kit) notFound();
  requireAudienceView(user, kit);
  const a = audienceInsights(kit.id);
  const pct = (x: number) => `${Math.round(x * 100)}%`;
  const t = await getT("owner");

  return (
    <div className="space-y-10">
      <PageHeader
        eyebrow={t(`Audience discovery · ${kit.property_name}`, `オーディエンス分析 · ${kit.property_name}`)}
        stage={1}
        t={t}
        title={t(
          <>Who wants it, where, <span className="font-serif font-normal italic">and at what price.</span></>,
          <>どこで、どなたが、<span className="font-serif font-normal italic">いくらで求めているか。</span></>,
        )}
        description={t(
          `${a.total} fans answered the ${kit.property_name} pulse — ${a.signalsBeforeFirstLaunch} of them before the first campaign launched. Their answers sit next to what fans actually paid for, so the next campaign can be aimed before it’s proposed.`,
          `『${kit.property_name}』のファンアンケートに${a.total}人がご回答くださいました（うち${a.signalsBeforeFirstLaunch}人は最初のキャンペーン開始前）。回答と実際の購入実績を並べてご覧いただけるため、次のキャンペーンの方向性を企画前に見定めていただけます。`,
        )}
        meta={[
          [t("Fans", "ファン"), a.total],
          [t("Cities", "都市"), a.cities.length],
          [t("Before launch", "開始前の回答"), a.signalsBeforeFirstLaunch],
          [t("Pulse → paid", "回答 → 購入"), pct(a.conversion.rate)],
        ]}
        actions={
          <Link href="/pulse" className="group inline-flex h-10 items-center gap-2 rounded-lg px-4 text-sm font-medium text-ink ring-1 ring-inset ring-sand-2 hover:ring-ink">
            {t("Open the public pulse", "公開アンケートを開く")} <Arrow />
          </Link>
        }
      />

      <section className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.05fr)]" aria-labelledby="where">
        <Card className="relative overflow-hidden p-5 sm:p-6">
          <div className="seigaiha pointer-events-none absolute inset-x-0 bottom-0 h-24 opacity-60 [mask-image:linear-gradient(to_top,black,transparent)]" aria-hidden />
          <div className="relative">
            <h2 id="where" className="text-[17px] font-semibold">{t("Where fans are", "ファンのいる場所")}</h2>
            <p className="mt-1 text-[13px] text-moss">{t("Sun size: fans who said they’d buy. Ink core: fans who have actually paid for a run.", "円の大きさ：購入意向のあるファンの数。中心の点：実際にご購入いただいたファンの数。")}</p>
            <IndiaMap cities={a.cities} showBackers label={t("Interested fans and paid backers by city", "都市別の購入意向ファンと購入者")} className="mx-auto mt-4 max-w-[400px]" />
            <div className="mt-3 flex flex-wrap gap-x-5 gap-y-1 text-[12px] text-ink-2" aria-hidden>
              <span className="flex items-center gap-1.5"><span className="h-3 w-3 rounded-full bg-vermilion/75" /> {t("Said they’d buy", "購入意向あり")}</span>
              <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-ink" /> {t("Paid for a run", "購入済み")}</span>
            </div>
          </div>
        </Card>

        <div className="flex min-w-0 flex-col gap-6">
          <Card className="p-5 sm:p-6">
            <h2 className="text-[17px] font-semibold">{t("What the numbers say", "数値からわかること")}</h2>
            <BrushStroke className="mt-1 h-2.5 w-28" />
            <ol className="mt-4 divide-y divide-sand">
              {a.findings.map((f, i) => (
                <li key={f.title} className="grid grid-cols-[28px_1fr] gap-2 py-3">
                  <span className="pt-0.5 font-mono text-[12px] text-vermilion">{String(i + 1).padStart(2, "0")}</span>
                  <span>
                    <span className="block text-[14.5px] font-medium text-ink">{t(f.title, f.ja.title)}</span>
                    <span className="mt-0.5 block text-[13px] text-ink-2">{t(f.detail, f.ja.detail)}</span>
                  </span>
                </li>
              ))}
            </ol>
          </Card>
          <SummaryPanel kitId={kit.id} aiConfigured={aiAvailable()} />
        </div>
      </section>

      <Card>
        <CardHeader
          eyebrow={t("Purchasing power", "購買力")}
          title={t("How many fans each T-shirt price reaches", "Tシャツの価格ごとに届くファンの割合")}
          subtitle={t(
            `The share of interested fans who said they’d pay at least that much. Dashed lines are this kit’s tees.${a.medianPriceMinor ? ` Half would pay ${formatINR(a.medianPriceMinor)} or more.` : ""}`,
            `その金額以上を支払ってもよいと回答したファンの割合です。破線はこのキットのTシャツです。${a.medianPriceMinor ? `半数の方が${formatINR(a.medianPriceMinor)}以上を支払ってもよいと回答しています。` : ""}`,
          )}
        />
        <div className="px-3 pb-5 sm:px-5">
          <PriceCurve points={a.priceCurve} marks={a.teeCampaigns} />
        </div>
      </Card>

      <section className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Card className="p-5 sm:p-6">
          <h2 className="text-[17px] font-semibold">{t("What they’d buy", "購入したい商品")}</h2>
          <p className="mb-4 mt-1 text-[13px] text-moss">{t("Fans could pick several. Items the current kit doesn’t permit are hatched.", "複数選択式です。現在のキットで許諾されていない商品は斜線で表示しています。")}</p>
          <ShareBars rows={a.wants.map((w) => ({ ...w, muted: !w.inKit }))} tag={t("Not in kit", "キット対象外")} />
        </Card>
        <Card className="p-5 sm:p-6">
          <h2 className="text-[17px] font-semibold">{t("By region", "地域別")}</h2>
          <p className="mb-4 mt-1 text-[13px] text-moss">{t("Share of all fans who answered.", "回答者全体に占める割合です。")}</p>
          <ShareBars rows={a.regions.filter((r) => r.n > 0)} />
          <h3 className="mb-3 mt-7 text-[14px] font-semibold">{t("By age", "年齢別")}</h3>
          <ShareBars rows={a.ages} />
        </Card>
        <Card className="p-5 sm:p-6">
          <h2 className="text-[17px] font-semibold">{t("Language they watch in", "視聴言語")}</h2>
          <p className="mb-4 mt-1 text-[13px] text-moss">{t("A guide for print lines, captions and campaign copy.", "印刷テキスト・字幕・キャンペーン文言の参考になります。")}</p>
          <ShareBars rows={a.languages} />
        </Card>
        <Card className="p-5 sm:p-6">
          <h2 className="text-[17px] font-semibold">{t("Where they watch and discover", "視聴・発見の場")}</h2>
          <p className="mb-4 mt-1 text-[13px] text-moss">{t("Where creators should launch and promote.", "クリエイターが発売・告知を行うべき場所です。")}</p>
          <ShareBars rows={a.channels} />
        </Card>
      </section>

      <Card>
        <CardHeader
          title={t("Interest against paid backers, by city", "都市別の購入意向と購入者")}
          subtitle={t(
            "Paid backers per 100 fans who said they’d buy. A city with many fans and no backers is an opening, not a failure — nobody has sold there yet.",
            "購入意向のあるファン100人あたりの購入者数です。ファンが多く購入者がいない都市は、失敗ではなく機会です。まだ誰もそこで販売していないということです。",
          )}
        />
        <div className="overflow-x-auto">
          <table className="w-full min-w-[560px] text-left text-sm">
            <thead className="border-b border-sand text-xs uppercase tracking-wider text-moss">
              <tr>
                <th className="px-5 py-3 font-medium sm:px-6">{t("City", "都市")}</th>
                <th className="px-3 py-3 font-medium">{t("Region", "地域")}</th>
                <th className="px-3 py-3 text-right font-medium">{t("Said they’d buy", "購入意向あり")}</th>
                <th className="px-3 py-3 text-right font-medium">{t("Paid backers", "購入者")}</th>
                <th className="px-5 py-3 text-right font-medium sm:px-6">{t("Per 100", "100人あたり")}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-sand">
              {a.cities.map((c) => (
                <tr key={c.city}>
                  <td className="px-5 py-2.5 font-medium sm:px-6">{c.city}</td>
                  <td className="px-3 py-2.5 text-moss">{t(c.region, pulseJa(c.region))}</td>
                  <td className="px-3 py-2.5 text-right font-mono">{c.interest}</td>
                  <td className="px-3 py-2.5 text-right font-mono">{c.backers}</td>
                  <td className="px-5 py-2.5 text-right font-mono sm:px-6">{c.backers === 0 ? <span className="text-vermilion">{t("opening", "機会あり")}</span> : c.per100}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      <p className="text-xs text-moss">
        {t(
          `Demo data: answers are generated for a fictional property. First answer ${formatDate(a.firstSignalAt)}; first campaign launched ${formatDate(a.firstLaunchAt)}.`,
          `デモ用データです。回答は架空の作品向けに生成したものです。最初の回答：${t.date(a.firstSignalAt)}、最初のキャンペーン開始：${t.date(a.firstLaunchAt)}。`,
        )}
      </p>
    </div>
  );
}
