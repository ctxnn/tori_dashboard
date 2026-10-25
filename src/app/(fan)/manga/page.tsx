import Link from "next/link";
import RevealScope from "@/store/components/RevealScope";
import { read } from "@/store/lib/db";
import { currentUser } from "@/store/lib/auth";
import { ownedVolumes, publisherName } from "@/store/lib/catalog";
import { boxSetsOf } from "@/store/lib/derive";
import { Cover } from "@/store/components/Art";
import { inr } from "@/store/lib/format";

export const dynamic = "force-dynamic";
export const metadata = { title: "Manga" };

export default async function MangaHome({ searchParams: searchParamsIn }: { searchParams: Promise<{ pub?: string; q?: string; show?: string }> }) { const searchParams = await searchParamsIn;
  const db = await read();
  const user = await currentUser();
  const q = (searchParams.q || "").toLowerCase();
  const list = db.series
    .filter((s) => s.totalVolumes > 0 && (!searchParams.pub || s.publisherId === searchParams.pub) && (!q || s.title.toLowerCase().includes(q) || s.author.toLowerCase().includes(q)))
    .sort((a, b) => b.popularity - a.popularity);
  const boxes = db.series.filter((s) => s.status === "completed").sort((a, b) => b.popularity - a.popularity).slice(0, 10).flatMap((s) => boxSetsOf(s).filter((b) => b.id.endsWith("_all")));
  const filtered = !!(searchParams.pub || q);
  const show = Math.max(30, Number(searchParams.show) || 30);
  const qs = (n: number) => `/manga?${new URLSearchParams({ ...(searchParams.pub ? { pub: searchParams.pub } : {}), ...(searchParams.q ? { q: searchParams.q } : {}), show: String(n) })}`;

  return (
    <div className="space-y-8">
      <section className="paper-band bleed relative -mt-5 overflow-hidden border-b border-line px-4 pb-6 pt-7 dark:border-line">
        <div className="tone pointer-events-none absolute -inset-y-12 inset-x-0 opacity-60" />
        <div className="relative">
          <h1 className="font-display text-[clamp(30px,9cqw,48px)] leading-[0.98]">Every volume,<br />in order.</h1>
          <p className="mt-3 max-w-[34ch] text-[15px] leading-snug">Printed in India from ₹299. Every copy carries a code you can scan to prove it's real.</p>
          <form className="mt-5 flex gap-2" action="/manga">
            <input name="q" defaultValue={searchParams.q} className="input" placeholder="Find a series or author" aria-label="Search" />
            {searchParams.pub && <input type="hidden" name="pub" value={searchParams.pub} />}
            <button className="btn-ink">Search</button>
          </form>
        </div>
      </section>

      <div className="no-scrollbar -mx-4 -mt-3 flex gap-2 overflow-x-auto px-4">
        <Link href="/manga" className={!searchParams.pub ? "chip-on" : "chip"}>All publishers</Link>
        {db.publishers.map((p) => <Link key={p.id} href={`/manga?pub=${p.id}`} className={searchParams.pub === p.id ? "chip-on" : "chip"}>{p.name}</Link>)}
      </div>

      {!filtered && (
        <section aria-labelledby="box">
          <h2 id="box" data-reveal="lines" className="h-section mb-3">Whole series in one box</h2>
          <div data-reveal="stagger" className="no-scrollbar -mx-4 flex gap-4 overflow-x-auto px-4 pb-3">
            {boxes.map((b) => {
              const s = db.series.find((x) => x.id === b.seriesId)!;
              return (
                <Link key={b.id} href={`/manga/${s.slug}`} className="group w-[220px] shrink-0">
                  <div className="relative h-[170px] rounded-panel border border-line bg-card p-3 shadow-panel transition-transform group-hover:-translate-y-1 dark:border-line dark:shadow-none">
                    <div className="flex h-full items-end gap-[2px] overflow-hidden">
                      {Array.from({ length: Math.min(b.toVol, 16) }, (_, k) => (
                        <div key={k} className="h-full flex-1 rounded-[2px] border border-ink/60" style={{ background: s.color, filter: `hue-rotate(${((k * 23) % 50) - 25}deg) brightness(${0.85 + (k % 3) * 0.08})` }} />
                      ))}
                    </div>
                    <span className="absolute right-2 top-2 rounded-md border border-line bg-card px-1.5 text-[12px] font-black dark:border-line">{b.toVol} books</span>
                  </div>
                  <div className="mt-2 font-bold leading-tight">{s.title}</div>
                  <div className="text-[13.5px]"><span className="price text-[16px]">{inr(b.price)}</span> <span className="text-muted">for the set</span></div>
                </Link>
              );
            })}
          </div>
        </section>
      )}

      <section aria-labelledby="series" className="space-y-3">
        <h2 id="series" data-reveal="lines" className="h-section">{filtered ? `${list.length} series found` : "Shop by series"}</h2>
        <div data-reveal="stagger" className="space-y-3">
        {list.slice(0, show).map((s) => {
          const minP = s.volPrice;
          const owned = user ? ownedVolumes(db, user.id, s.id).size : 0;
          return (
            <Link key={s.id} href={`/manga/${s.slug}`} className="group card flex items-center gap-4 p-3 hover:border-fg/25 hover:shadow-panel-sm">
              <div className="w-[64px] shrink-0"><Cover title={s.title} color={s.color} image={s.image} size="sm" /></div>
              <div className="min-w-0 flex-1">
                <div className="text-[16px] font-bold tracking-[-0.02em] leading-tight">{s.title}</div>
                <div className="mt-0.5 text-[13px] text-muted">{s.author}, {publisherName(db, s.publisherId)}</div>
                <div className="mt-1.5 text-[13.5px]"><span className="font-bold">{s.totalVolumes} volumes</span> from <span className="price">{inr(minP)}</span></div>
                {owned > 0 && (
                  <div className="mt-2 flex items-center gap-2 text-[12px] font-semibold">
                    <div className="h-2 flex-1 overflow-hidden rounded-full bg-line"><div className="h-full rounded-full bg-accent" style={{ width: `${(owned / s.totalVolumes) * 100}%` }} /></div>
                    {owned} owned
                  </div>
                )}
              </div>
            </Link>
          );
        })}
        </div>
        {list.length > show && <Link href={qs(show + 30)} scroll={false} className="btn-ghost w-full">Show {Math.min(30, list.length - show)} more of {list.length}</Link>}
        {!list.length && <div className="panel p-6 text-center"><p className="font-bold">No series match “{searchParams.q}”.</p><Link href="/manga" className="btn-ghost mt-3">Show all series</Link></div>}
      </section>
      <RevealScope />
    </div>
  );
}
