"use client";
import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { settleGrid } from "@/store/lib/motion";
import { Cover } from "./Art";
import { IconSearch } from "./Icons";
import { LANGS, type Lang } from "@/store/lib/types";

type Item = {
  slug: string; title: string; author: string; publisher: string; genres: string[]; demographic: string; status: string; languages: Lang[];
  popularity: number; chapters: number; color: string; startYear: number; image?: string; score: number;
};
const DEMOS = ["Shonen", "Seinen", "Shojo", "Josei"];
const PAGE = 36;

export default function ReadCatalog({ items, initial = {}, keepOrder = false }: { items: Item[]; initial?: { genre?: string; demo?: string; lang?: Lang; q?: string }; keepOrder?: boolean }) {
  const [q, setQ] = useState(initial.q ?? "");
  const [pub, setPub] = useState("");
  const [genre, setGenre] = useState(initial.genre ?? "");
  const [demo, setDemo] = useState(initial.demo ?? "");
  const [lang, setLang] = useState<Lang | "">(initial.lang ?? "");
  const [status, setStatus] = useState("");
  const [sort, setSort] = useState(keepOrder ? "row" : "popular");
  const [shown, setShown] = useState(PAGE);
  const pubs = useMemo(() => Array.from(new Set(items.map((i) => i.publisher))).sort((a, b) => (a.startsWith("Other") ? 1 : b.startsWith("Other") ? -1 : a.localeCompare(b))), [items]);
  const genres = useMemo(() => Array.from(new Set(items.flatMap((i) => i.genres))).sort(), [items]);
  const list = useMemo(() => {
    const t = q.trim().toLowerCase();
    const r = items.filter((i) =>
      (!t || i.title.toLowerCase().includes(t) || i.author.toLowerCase().includes(t)) && (!pub || i.publisher === pub) &&
      (!genre || i.genres.includes(genre)) && (!demo || i.demographic === demo) && (!lang || i.languages.includes(lang)) && (!status || i.status === status));
    if (sort === "row") return r;
    return [...r].sort((a, b) => sort === "az" ? a.title.localeCompare(b.title) : sort === "new" ? b.startYear - a.startYear : sort === "rated" ? b.score - a.score : b.popularity - a.popularity);
  }, [items, q, pub, genre, demo, lang, status, sort]);
  useEffect(() => setShown(PAGE), [q, pub, genre, demo, lang, status, sort]);
  const grid = useRef<HTMLDivElement>(null);
  const first = useRef(true);
  useEffect(() => { if (first.current) { first.current = false; return; } settleGrid(grid.current); }, [list, shown]);
  const active = [pub, genre, demo, lang, status, q].filter(Boolean).length;
  const clear = () => { setPub(""); setGenre(""); setDemo(""); setLang(""); setStatus(""); setQ(""); };

  return (
    <section aria-label="All series" className="space-y-4">
      <div className="sticky top-[52px] z-20 -mx-4 space-y-2.5 border-b border-line bg-bg px-4 pb-3 pt-2">
        <div className="relative">
          <IconSearch className="pointer-events-none absolute left-3.5 top-1/2 h-[18px] w-[18px] -translate-y-1/2 text-muted" />
          <input className="input pl-10" placeholder="Search by title or author" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Search manga" />
        </div>
        <div className="no-scrollbar -mx-4 flex gap-2 overflow-x-auto px-4">
          {DEMOS.map((d) => <button key={d} aria-pressed={demo === d} className={demo === d ? "chip-on" : "chip"} onClick={() => setDemo(demo === d ? "" : d)}>{d}</button>)}
          <span className="w-px shrink-0 bg-line" />
          {LANGS.map((l) => <button key={l.code} aria-pressed={lang === l.code} className={lang === l.code ? "chip-on" : "chip"} onClick={() => setLang(lang === l.code ? "" : l.code)}>{l.native}</button>)}
        </div>
        <div className="flex gap-2">
          <select className="input min-h-[40px] py-1.5 text-[14px]" value={genre} onChange={(e) => setGenre(e.target.value)} aria-label="Genre">
            <option value="">Any genre</option>{genres.map((g) => <option key={g}>{g}</option>)}
          </select>
          <select className="input min-h-[40px] py-1.5 text-[14px]" value={pub} onChange={(e) => setPub(e.target.value)} aria-label="Publisher">
            <option value="">Any publisher</option>{pubs.map((p) => <option key={p}>{p}</option>)}
          </select>
          <select className="input min-h-[40px] w-auto py-1.5 text-[14px]" value={sort} onChange={(e) => setSort(e.target.value)} aria-label="Sort">
            {keepOrder && <option value="row">Suggested</option>}
            <option value="popular">Popular</option><option value="rated">Top rated</option><option value="new">Newest</option><option value="az">A to Z</option>
          </select>
        </div>
        <div className="flex items-center gap-2 text-[12.5px] text-muted">
          <span>{list.length} series</span>
          <button onClick={() => setStatus(status === "completed" ? "" : "completed")} aria-pressed={status === "completed"} className={`ml-auto rounded-full px-2.5 py-1 font-semibold ${status === "completed" ? "bg-fg text-bg" : "ring-1 ring-inset ring-line"}`}>Completed only</button>
          {active > 0 && <button onClick={clear} className="font-semibold text-accent">Clear</button>}
        </div>
      </div>

      <div ref={grid} data-reveal="stagger" className="grid grid-cols-3 gap-x-3 gap-y-5">
        {list.slice(0, shown).map((i) => (
          <Link key={i.slug} href={`/read/${i.slug}`} className="group active:opacity-80">
            <Cover title={i.title} color={i.color} image={i.image} size="sm" sub={i.image ? undefined : i.publisher} />
            <div className="mt-2 line-clamp-2 text-[13px] font-semibold leading-tight">{i.title}</div>
            <div className="mt-0.5 text-[11.5px] text-muted">{i.demographic || i.genres[0]}{i.score ? `, ${i.score}%` : ""}</div>
          </Link>
        ))}
      </div>
      {shown < list.length && <button className="btn-ghost w-full" onClick={() => setShown((n) => n + PAGE)}>Show {Math.min(PAGE, list.length - shown)} more</button>}
      {list.length === 0 && (
        <div className="panel p-6 text-center">
          <p className="font-bold">Nothing matches those filters.</p>
          <button className="btn-ghost mt-3" onClick={clear}>Clear filters</button>
        </div>
      )}
    </section>
  );
}
