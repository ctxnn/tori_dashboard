import Link from "next/link";
import RevealScope from "@/store/components/RevealScope";
import { read } from "@/store/lib/db";
import { currentUser } from "@/store/lib/auth";
import { publisherName } from "@/store/lib/catalog";
import { Cover } from "@/store/components/Art";
import ReadHero from "@/store/components/ReadHero";
import Row, { type RowItem } from "@/store/components/Row";
import { ROWS, rowItems } from "@/store/lib/rows";
import { CHAPTER_PRICE, FREE_CHAPTERS_IN_PAID_MODE } from "@/store/lib/config";
import { LANGS, type Series } from "@/store/lib/types";
import { CollabRow } from "@/store/components/Collabs";
import { listCollabs } from "@/store/lib/collabs";

export const dynamic = "force-dynamic";
export const metadata = { title: "Read" };

const item = (s: Series): RowItem => ({ slug: s.slug, title: s.title, color: s.color, image: s.image });

export default async function ReadHome() {
  const db = await read();
  const user = await currentUser();
  const pub = (id: string) => publisherName(db, id);
  const since = Date.now() - 30 * 864e5;
  const reads = new Map<string, number>();
  for (const e of db.events) if (e.type === "read" && Date.parse(e.createdAt) > since) reads.set(e.seriesId, (reads.get(e.seriesId) ?? 0) + 1);
  const score = (s: Series) => (reads.get(s.id) ?? 0) * 3 + s.popularity;
  const trending = [...db.series].sort((a, b) => score(b) - score(a)).slice(0, 10);
  const progress = user
    ? db.progress.filter((p) => p.userId === user.id).sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)).slice(0, 10)
        .map((p) => ({ p, s: db.series.find((s) => s.id === p.seriesId)! })).filter((x) => x.s)
    : [];
  const last = progress[0]?.s;
  const because = last ? db.series.filter((s) => s.id !== last.id && s.genres.some((gn) => last.genres.includes(gn)) && (!last.demographic || s.demographic === last.demographic))
    .sort((a, b) => b.popularity - a.popularity).slice(0, 14) : [];
  const paid = db.settings.readingMode === "paid";
  const featured = [...trending].sort((a, b) => Number(!!b.banner) - Number(!!a.banner)).slice(0, 5);
  const hero = featured.map((s) => ({
    slug: s.slug, title: s.title, author: s.author, publisher: pub(s.publisherId), color: s.color, synopsis: s.synopsis,
    langs: LANGS.filter((l) => s.languages.includes(l.code)).map((l) => l.native), chapters: s.totalChapters, image: s.image, banner: s.banner, trailer: s.trailer,
    genres: s.genres.slice(0, 3),
  }));
  const rows = ROWS.filter((r) => r.key !== "partner").map((r) => ({ r, items: rowItems(db.series, r) })).filter((x) => x.items.length >= 5);
  // Series Japanese publishers have released through the Partner Portal get their own row, however few.
  const partnerRow = ROWS.find((r) => r.key === "partner")!;
  const fresh = rowItems(db.series, partnerRow);
  const collabs = listCollabs();

  return (
    <div className="space-y-8">
      <ReadHero items={hero} priceNote={paid ? `First ${FREE_CHAPTERS_IN_PAID_MODE} chapters free, then ₹${CHAPTER_PRICE} each` : "Every chapter is free during launch"} />

      {progress.length > 0 && (
        <section aria-labelledby="cont">
          <h2 id="cont" className="h-section mb-2.5">Continue reading</h2>
          <ul className="no-scrollbar -mx-4 flex snap-x gap-3 overflow-x-auto scroll-px-4 px-4 pb-1">
            {progress.map(({ p, s }) => (
              <li key={s.id} className="w-[30%] min-w-[104px] max-w-[124px] shrink-0 snap-start">
                <Link href={`/read/${s.slug}/${p.chapter}?lang=${p.language}`} className="block active:opacity-80">
                  <Cover title={s.title} color={s.color} image={s.image} size="sm" />
                  <div className="mt-2 h-1 overflow-hidden rounded-full bg-line"><div className="h-full rounded-full bg-accent" style={{ width: `${Math.max(4, (p.chapter / s.totalChapters) * 100)}%` }} /></div>
                  <div className="mt-1.5 truncate text-[13px] font-semibold">{s.title}</div>
                  <div className="text-[11.5px] text-muted">Chapter {p.chapter}</div>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}

      <section aria-labelledby="top">
        <h2 id="top" className="h-section mb-2.5">Top 10 in India today</h2>
        <ol className="no-scrollbar -mx-4 flex snap-x gap-0.5 overflow-x-auto scroll-px-4 px-4 pb-1">
          {trending.map((s, i) => (
            <li key={s.id} className="shrink-0 snap-start">
              <Link href={`/read/${s.slug}`} className="flex items-end active:opacity-80" aria-label={`Number ${i + 1}: ${s.title}`}>
                <span aria-hidden className={`font-display leading-[.78] text-transparent [-webkit-text-stroke:1.5px_rgb(var(--fg)/.75)] ${i === 9 ? "-mr-2 text-[78px] tracking-[-0.08em]" : "-mr-3 text-[92px]"}`}>{i + 1}</span>
                <span className="relative w-[92px]"><Cover title={s.title} color={s.color} image={s.image} size="sm" /></span>
              </Link>
            </li>
          ))}
        </ol>
      </section>

      <CollabRow items={collabs} />

      {fresh.length > 0 && (
        <Row id="row-partner" title={partnerRow.title} href={`/read/browse?row=partner`}
          items={fresh.slice(0, 16).map((s) => ({ ...item(s), meta: s.nextRelease ? `Ch. ${s.nextRelease.number} on ${new Date(s.nextRelease.at).toLocaleDateString("en-IN", { day: "numeric", month: "short", timeZone: "Asia/Kolkata" })}` : `${pub(s.publisherId)} · ${s.totalChapters} ch` }))} />
      )}

      {because.length >= 4 && <Row id="because" title={`Because you read ${last!.title.replace(/:.*/, "")}`} items={because.map(item)} />}

      {rows.map(({ r, items }) => (
        <Row key={r.key} id={`row-${r.key}`} title={r.title} href={`/read/browse?row=${r.key}`} items={items.slice(0, 16).map(item)} />
      ))}

      <Link href="/read/browse" className="btn-ink w-full">Browse all {db.series.length} series</Link>
      <RevealScope />
    </div>
  );
}
