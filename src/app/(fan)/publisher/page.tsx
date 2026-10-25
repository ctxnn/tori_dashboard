import Link from "next/link";
import RevealScope from "@/store/components/RevealScope";
import { read } from "@/store/lib/db";
import { requireAdmin } from "@/store/lib/auth";
import { publisherName } from "@/store/lib/catalog";
import Dashboard from "@/store/components/Dashboard";
import AdminControls from "@/store/components/AdminControls";
import { buildInsights } from "@/store/lib/insights";
import { listCollabs } from "@/store/lib/collabs";

export const dynamic = "force-dynamic";
export const metadata = { title: "Publisher dashboard" };


export default async function Publisher({ searchParams: searchParamsIn }: { searchParams: Promise<{ pub?: string }> }) { const searchParams = await searchParamsIn;
  await requireAdmin();
  const db = await read();
  const pub = searchParams.pub || "";
  const seriesIds = new Set(db.series.filter((s) => !pub || s.publisherId === pub).map((s) => s.id));
  const waiting = db.submissions.filter((s) => s.status === "submitted").length;
  const collabs = listCollabs();
  const { kpis, bySeries, byLang, byState, trend, topCities, opportunities } = buildInsights(db, seriesIds);
  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end gap-3">
        <div className="mr-auto">
          <div className="label">Publisher dashboard, last 90 days</div>
          <h1 className="h-title mt-1">What India is reading and buying</h1>
        </div>
        <div className="no-scrollbar flex gap-2 overflow-x-auto">
          <Link href="/publisher" className={!pub ? "chip-on" : "chip"}>All publishers</Link>
          {db.publishers.map((p) => <Link key={p.id} href={`/publisher?pub=${p.id}`} className={pub === p.id ? "chip-on" : "chip"}>{p.name}</Link>)}
        </div>
      </div>
      <Link href="/publisher/review" className="panel paper-band flex items-center gap-3 p-4">
        <div className="min-w-0 flex-1">
          <div className="label">Partner Portal</div>
          <div className="text-[17px] font-bold">{waiting ? `${waiting} title${waiting === 1 ? "" : "s"} waiting for review` : "Review queue"}</div>
          <div className="text-[13px] text-muted">{db.partners.length} publishers · {db.submissions.filter((s) => s.status === "approved").length} partner titles live</div>
        </div>
        <span className="btn-ink min-h-[40px] px-4 text-[14px]">Open</span>
      </Link>
      <Link href="/ops" data-section="collabs" className="panel paper-band flex items-center gap-3 p-4">
        <div className="min-w-0 flex-1">
          <div className="label">Official collabs</div>
          <div className="text-[17px] font-bold">Production, fulfilment and refunds</div>
          <div className="text-[13px] text-muted">{collabs.filter((c) => c.open).length} taking preorders · {collabs.filter((c) => c.thresholdMet).length} past their gate · run in the Torii workspace</div>
        </div>
        <span className="btn-ink min-h-[40px] px-4 text-[14px]">Open</span>
      </Link>
      <AdminControls mode={db.settings.readingMode} slugs={db.series.map((s) => ({ slug: s.slug, title: s.title }))}
        overrides={Object.entries(db.chapterOverrides).slice(0, 20).map(([id, free]) => { const m = id.match(/^c_(.+)_(\d+)$/)!; const se = db.series.find((x) => x.slug === m[1]); return { title: se?.title ?? m[1], slug: m[1], number: Number(m[2]), free }; })} />
      <Dashboard kpis={kpis} bySeries={bySeries} byLang={byLang} byState={byState} trend={trend} topCities={topCities} opportunities={opportunities}
        scope={pub ? publisherName(db, pub) : "All publishers"} />
      <div className="flex flex-wrap gap-2 text-sm">
        <Link href="/publisher/tags" className="btn-ghost">Demo authenticity codes</Link>
        <Link href="/read" className="btn-ghost">Open the fan app</Link>
      </div>
      <RevealScope />
    </div>
  );
}
