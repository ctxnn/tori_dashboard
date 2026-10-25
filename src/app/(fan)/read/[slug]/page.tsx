import Link from "next/link";
import RevealScope from "@/store/components/RevealScope";
import { notFound } from "next/navigation";
import { read } from "@/store/lib/db";
import { currentUser } from "@/store/lib/auth";
import { canRead, isChapterFree, publisherName } from "@/store/lib/catalog";
import { chaptersOf } from "@/store/lib/derive";
import { Cover } from "@/store/components/Art";
import ChapterList from "@/store/components/ChapterList";
import { AutoBanner } from "@/store/components/AutoArt";
import { TrailerCard } from "@/store/components/Trailer";
import { LANGS, type Lang } from "@/store/lib/types";
import { CHAPTER_PRICE } from "@/store/lib/config";
import { CollabRow } from "@/store/components/Collabs";
import { listCollabs } from "@/store/lib/collabs";

export const dynamic = "force-dynamic";
export async function generateMetadata({ params: paramsIn }: { params: Promise<{ slug: string }> }) { const params = await paramsIn;
  const s = (await read()).series.find((x) => x.slug === params.slug);
  return { title: s ? `Read ${s.title}` : "Not found" };
}

export default async function SeriesRead({ params: paramsIn, searchParams: searchParamsIn }: { params: Promise<{ slug: string }>; searchParams: Promise<{ lang?: string }> }) { const params = await paramsIn; const searchParams = await searchParamsIn;
  const db = await read();
  const s = db.series.find((x) => x.slug === params.slug);
  if (!s) notFound();
  const user = await currentUser();
  const prog = user ? db.progress.find((p) => p.userId === user.id && p.seriesId === s.id) : undefined;
  const lang: Lang = (s.languages.includes(searchParams.lang as Lang) ? searchParams.lang : prog?.language && s.languages.includes(prog.language) ? prog.language : "en") as Lang;
  const chs = chaptersOf(db, s);
  const rows = chs.map((c) => [c.number, c.volumeNumber, isChapterFree(db, c) ? 1 : 0, canRead(db, c, user) ? 1 : 0] as [number, number, number, number]);
  const lockedCount = rows.filter((r) => !r[3]).length;
  const startAt = prog ? prog.chapter : 1;
  const pub = publisherName(db, s.publisherId);
  // Official merch for this series, made by Indian creators from the publisher's kit.
  const collabs = listCollabs({ property: s.title });

  return (
    <div className="space-y-7">
      <section className={`paper-band bleed relative -mt-5 overflow-hidden border-b border-line px-4 pb-6 ${s.banner ? "pt-24" : "pt-6"}`}>
        <div className="tone pointer-events-none absolute -inset-y-12 inset-x-0 opacity-60" />
        <AutoBanner src={s.banner} title={s.title} className="h-48" fade="linear-gradient(to bottom, rgb(var(--paper)/.2) 0%, rgb(var(--paper)/.7) 30%, rgb(var(--paper)) 48%)" />
        <div className="relative flex gap-5">
          <div data-parallax="28" className="w-[38%] max-w-[170px] shrink-0"><Cover title={s.title} color={s.color} image={s.image} sub={pub} size="lg" /></div>
          <div className="min-w-0 self-end">
            {s.demoProperty && <span className="mb-2 mr-1 inline-flex items-center gap-1 rounded-md bg-accent px-2 py-0.5 text-[11.5px] font-bold text-white dark:text-bg">Fictional demo series</span>}
            {s.source === "partner" && <span className="mb-2 inline-flex items-center gap-1 rounded-md bg-ink px-2 py-0.5 text-[11.5px] font-bold text-white dark:bg-fg dark:text-bg">Official release · first on Torii</span>}
            <h1 className="font-display text-[clamp(26px,7.5cqw,40px)] leading-[1]">{s.title}</h1>
            {s.titleJa && <p className="jp mt-1 text-[14px] text-muted" lang="ja">{s.titleJa}</p>}
            <p className="mt-2 text-[14.5px] font-semibold">{s.author}</p>
            <p className="text-[13.5px] text-muted">{pub}, since {s.startYear}</p>
            <div className="mt-3 flex flex-wrap gap-1.5">
              <span className="rounded-md border border-line bg-card px-2 py-0.5 text-[12px] font-bold dark:border-line">{s.status === "ongoing" ? "Ongoing" : "Completed"}</span>
              {s.genres.map((g) => <span key={g} className="rounded-md bg-card/70 px-2 py-0.5 text-[12px] font-semibold">{g}</span>)}
            </div>
          </div>
        </div>
        <p className="relative mt-5 max-w-prose text-[15px] leading-relaxed">{s.synopsis}</p>
        {s.nextRelease && (
          <p className="relative mt-3 inline-flex rounded-full bg-card/80 px-3 py-1 text-[13px] font-semibold ring-1 ring-inset ring-fg/10">
            Chapter {s.nextRelease.number} arrives {new Date(s.nextRelease.at).toLocaleString("en-IN", { weekday: "short", day: "numeric", month: "short", hour: "numeric", minute: "2-digit", timeZone: "Asia/Kolkata" })} IST
          </p>
        )}
        <div className={`relative mt-5 grid gap-2 ${s.totalVolumes ? "grid-cols-[1fr_auto]" : ""}`}>
          <Link href={`/read/${s.slug}/${startAt}?lang=${lang}`} className="btn-primary text-[16px]">{prog ? `Continue chapter ${prog.chapter}` : "Start with chapter 1"}</Link>
          {s.totalVolumes > 0 && <Link href={`/manga/${s.slug}`} className="btn-ghost">Buy the books</Link>}
        </div>
      </section>

      <section aria-labelledby="lang">
        <h2 id="lang" className="label mb-2">Read in</h2>
        <div className="no-scrollbar -mx-4 flex gap-2 overflow-x-auto px-4">
          {LANGS.map((l) => s.languages.includes(l.code) ? (
            <Link key={l.code} href={`/read/${s.slug}?lang=${l.code}`} replace aria-current={lang === l.code ? "true" : undefined} className={lang === l.code ? "chip-on" : "chip"}>{l.native}</Link>
          ) : (
            <span key={l.code} className="chip cursor-not-allowed border-dashed text-muted" title="Translation in progress">{l.native}, coming soon</span>
          ))}
        </div>
      </section>

      <div data-reveal="stagger" className="grid grid-cols-3 gap-2 text-center">
        {[[s.totalChapters.toLocaleString("en-IN"), "chapters"], s.totalVolumes ? [String(s.totalVolumes), "printed volumes"] : [String(s.languages.length), s.languages.length === 1 ? "language" : "languages"], [lockedCount ? `₹${CHAPTER_PRICE}` : "Free", lockedCount ? "per paid chapter" : "to read now"]].map(([n, l]) => (
          <div key={l} className="card py-3"><div data-count={/\d/.test(n) ? "" : undefined} className="price text-[22px] leading-none">{n}</div><div className="mt-1 text-[12px] text-muted">{l}</div></div>
        ))}
      </div>

      <TrailerCard title={s.title} trailer={s.trailer} />

      <CollabRow id="series-collabs" items={collabs} title={`Official ${s.title} merch`} note={`Approved by ${pub}, designed in India. Pay now; it’s made only if enough fans join.`} />

      <ChapterList slug={s.slug} lang={lang} rows={rows} readUpTo={prog?.chapter ?? 0} totalVolumes={s.totalVolumes} titles={s.chapterTitles} />
      <RevealScope />
    </div>
  );
}
