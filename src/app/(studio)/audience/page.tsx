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

export const metadata = { title: "Audience" };

export default async function AudiencePage() {
  const user = await requirePageRole("owner", "creator", "operator");
  const kitId = defaultKitId();
  const kit = kitId ? getKit(kitId) : undefined;
  if (!kit) notFound();
  requireAudienceView(user, kit);
  const a = audienceInsights(kit.id);
  const pct = (x: number) => `${Math.round(x * 100)}%`;

  return (
    <div className="space-y-10">
      <PageHeader
        eyebrow={`Audience discovery · ${kit.property_name}`}
        stage={1}
        title={<>Who wants it, where, <span className="font-serif font-normal italic">and at what price.</span></>}
        description={`${a.total} fans answered the ${kit.property_name} pulse — ${a.signalsBeforeFirstLaunch} of them before the first campaign launched. Their answers sit next to what fans actually paid for, so the next campaign can be aimed before it’s proposed.`}
        meta={[
          ["Fans", a.total],
          ["Cities", a.cities.length],
          ["Before launch", a.signalsBeforeFirstLaunch],
          ["Pulse → paid", pct(a.conversion.rate)],
        ]}
        actions={
          <Link href="/pulse" className="group inline-flex h-10 items-center gap-2 rounded-lg px-4 text-sm font-medium text-ink ring-1 ring-inset ring-sand-2 hover:ring-ink">
            Open the public pulse <Arrow />
          </Link>
        }
      />

      <section className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.05fr)]" aria-labelledby="where">
        <Card className="relative overflow-hidden p-5 sm:p-6">
          <div className="seigaiha pointer-events-none absolute inset-x-0 bottom-0 h-24 opacity-60 [mask-image:linear-gradient(to_top,black,transparent)]" aria-hidden />
          <div className="relative">
            <h2 id="where" className="text-[17px] font-semibold">Where fans are</h2>
            <p className="mt-1 text-[13px] text-moss">Sun size: fans who said they’d buy. Ink core: fans who have actually paid for a run.</p>
            <IndiaMap cities={a.cities} showBackers label="Interested fans and paid backers by city" className="mx-auto mt-4 max-w-[400px]" />
            <div className="mt-3 flex flex-wrap gap-x-5 gap-y-1 text-[12px] text-ink-2" aria-hidden>
              <span className="flex items-center gap-1.5"><span className="h-3 w-3 rounded-full bg-vermilion/75" /> Said they’d buy</span>
              <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-ink" /> Paid for a run</span>
            </div>
          </div>
        </Card>

        <div className="flex min-w-0 flex-col gap-6">
          <Card className="p-5 sm:p-6">
            <h2 className="text-[17px] font-semibold">What the numbers say</h2>
            <BrushStroke className="mt-1 h-2.5 w-28" />
            <ol className="mt-4 divide-y divide-sand">
              {a.findings.map((f, i) => (
                <li key={f.title} className="grid grid-cols-[28px_1fr] gap-2 py-3">
                  <span className="pt-0.5 font-mono text-[12px] text-vermilion">{String(i + 1).padStart(2, "0")}</span>
                  <span>
                    <span className="block text-[14.5px] font-medium text-ink">{f.title}</span>
                    <span className="mt-0.5 block text-[13px] text-ink-2">{f.detail}</span>
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
          eyebrow="Purchasing power"
          title="How many fans each T-shirt price reaches"
          subtitle={`The share of interested fans who said they’d pay at least that much. Dashed lines are this kit’s tees.${a.medianPriceMinor ? ` Half would pay ${formatINR(a.medianPriceMinor)} or more.` : ""}`}
        />
        <div className="px-3 pb-5 sm:px-5">
          <PriceCurve points={a.priceCurve} marks={a.teeCampaigns} />
        </div>
      </Card>

      <section className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Card className="p-5 sm:p-6">
          <h2 className="text-[17px] font-semibold">What they’d buy</h2>
          <p className="mb-4 mt-1 text-[13px] text-moss">Fans could pick several. Items the current kit doesn’t permit are hatched.</p>
          <ShareBars rows={a.wants.map((w) => ({ ...w, muted: !w.inKit }))} tag="Not in kit" />
        </Card>
        <Card className="p-5 sm:p-6">
          <h2 className="text-[17px] font-semibold">By region</h2>
          <p className="mb-4 mt-1 text-[13px] text-moss">Share of all fans who answered.</p>
          <ShareBars rows={a.regions.filter((r) => r.n > 0)} />
          <h3 className="mb-3 mt-7 text-[14px] font-semibold">By age</h3>
          <ShareBars rows={a.ages} />
        </Card>
        <Card className="p-5 sm:p-6">
          <h2 className="text-[17px] font-semibold">Language they watch in</h2>
          <p className="mb-4 mt-1 text-[13px] text-moss">A guide for print lines, captions and campaign copy.</p>
          <ShareBars rows={a.languages} />
        </Card>
        <Card className="p-5 sm:p-6">
          <h2 className="text-[17px] font-semibold">Where they watch and discover</h2>
          <p className="mb-4 mt-1 text-[13px] text-moss">Where creators should launch and promote.</p>
          <ShareBars rows={a.channels} />
        </Card>
      </section>

      <Card>
        <CardHeader title="Interest against paid backers, by city" subtitle="Paid backers per 100 fans who said they’d buy. A city with many fans and no backers is an opening, not a failure — nobody has sold there yet." />
        <div className="overflow-x-auto">
          <table className="w-full min-w-[560px] text-left text-sm">
            <thead className="border-b border-sand text-xs uppercase tracking-wider text-moss">
              <tr>
                <th className="px-5 py-3 font-medium sm:px-6">City</th>
                <th className="px-3 py-3 font-medium">Region</th>
                <th className="px-3 py-3 text-right font-medium">Said they’d buy</th>
                <th className="px-3 py-3 text-right font-medium">Paid backers</th>
                <th className="px-5 py-3 text-right font-medium sm:px-6">Per 100</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-sand">
              {a.cities.map((c) => (
                <tr key={c.city}>
                  <td className="px-5 py-2.5 font-medium sm:px-6">{c.city}</td>
                  <td className="px-3 py-2.5 text-moss">{c.region}</td>
                  <td className="px-3 py-2.5 text-right font-mono">{c.interest}</td>
                  <td className="px-3 py-2.5 text-right font-mono">{c.backers}</td>
                  <td className="px-5 py-2.5 text-right font-mono sm:px-6">{c.backers === 0 ? <span className="text-vermilion">opening</span> : c.per100}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      <p className="text-xs text-moss">
        Demo data: answers are generated for a fictional property. First answer {formatDate(a.firstSignalAt)}; first campaign launched {formatDate(a.firstLaunchAt)}.
      </p>
    </div>
  );
}
