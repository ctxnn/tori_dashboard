"use client";
import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { settleGrid } from "@/store/lib/motion";
import { FigureArt } from "./Art";
import { IconSearch } from "./Icons";

type F = { slug: string; name: string; series: string; character: string; manufacturer: string; price: number; scale: string; availability: string; color: string; left: number | null; releaseMonth: string | null; stock: number; image?: string };
const BANDS = [["", "Any price"], ["lo", "Under ₹1,000"], ["mid", "₹1,000 to ₹2,999"], ["hi", "₹3,000 and up"]] as const;
const AVAIL: Record<string, string> = { in_stock: "In stock", preorder: "Pre-order", limited: "Numbered editions" };

export default function FigureCatalog({ items }: { items: F[] }) {
  const [q, setQ] = useState(""); const [series, setSeries] = useState(""); const [maker, setMaker] = useState("");
  const [band, setBand] = useState(""); const [scale, setScale] = useState(""); const [avail, setAvail] = useState("");
  const uniq = (k: keyof F) => Array.from(new Set(items.map((i) => String(i[k])))).sort();
  const list = useMemo(() => items.filter((i) => {
    const t = q.trim().toLowerCase();
    const inBand = !band || (band === "lo" ? i.price < 1000 : band === "mid" ? i.price >= 1000 && i.price < 3000 : i.price >= 3000);
    return (!t || i.name.toLowerCase().includes(t) || i.character.toLowerCase().includes(t)) && (!series || i.series === series) &&
      (!maker || i.manufacturer === maker) && inBand && (!scale || i.scale === scale) && (!avail || i.availability === avail);
  }), [items, q, series, maker, band, scale, avail]);
  const grid = useRef<HTMLDivElement>(null);
  const first = useRef(true);
  useEffect(() => { if (first.current) { first.current = false; return; } settleGrid(grid.current); }, [list]);

  return (
    <section className="space-y-3">
      <div className="relative">
        <IconSearch className="pointer-events-none absolute left-3.5 top-1/2 h-[18px] w-[18px] -translate-y-1/2 text-muted" />
        <input className="input pl-10" placeholder="Search by character or figure" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Search figures" />
      </div>
      <div className="no-scrollbar -mx-4 flex gap-2 overflow-x-auto px-4">
        {BANDS.map(([k, l]) => <button key={k} className={band === k ? "chip-on" : "chip"} onClick={() => setBand(k)}>{l}</button>)}
        <span className="w-px shrink-0 bg-line" />
        {Object.entries(AVAIL).map(([k, l]) => <button key={k} className={avail === k ? "chip-on" : "chip"} onClick={() => setAvail(avail === k ? "" : k)}>{l}</button>)}
      </div>
      <div className="grid grid-cols-3 gap-2">
        <select className="input" value={series} onChange={(e) => setSeries(e.target.value)} aria-label="Series"><option value="">All series</option>{uniq("series").map((x) => <option key={x}>{x}</option>)}</select>
        <select className="input" value={maker} onChange={(e) => setMaker(e.target.value)} aria-label="Brand"><option value="">All brands</option>{uniq("manufacturer").map((x) => <option key={x}>{x}</option>)}</select>
        <select className="input" value={scale} onChange={(e) => setScale(e.target.value)} aria-label="Scale"><option value="">Any scale</option>{uniq("scale").map((x) => <option key={x}>{x}</option>)}</select>
      </div>
      <div className="text-[13px] text-muted">{list.length} figures</div>
      <div ref={grid} data-reveal="stagger" className="grid grid-cols-2 gap-x-3 gap-y-5 ">
        {list.map((f) => (
          <Link key={f.slug} href={`/figures/${f.slug}`} className="group">
            <div className="relative overflow-hidden rounded-panel border border-line dark:border-line">
              <FigureArt color={f.color} name={f.name} image={f.image} character={f.character} rounded={false} className="transition-transform duration-300 group-hover:scale-[1.04] duration-700 ease-out" />
              {f.availability !== "in_stock" && <span className="absolute left-2 top-2 rounded-md border border-line bg-card px-1.5 py-0.5 text-[11.5px] font-black dark:border-line">{f.availability === "limited" ? `${f.left} of a numbered run left` : `Pre-order, ${f.releaseMonth}`}</span>}
            </div>
            <div className="mt-2 line-clamp-2 text-[14px] font-bold leading-tight">{f.name}</div>
            <div className="mt-0.5 truncate text-[12.5px] text-muted">{f.manufacturer}</div>
            <div className="price mt-1 text-[17px]">₹{f.price.toLocaleString("en-IN")}</div>
          </Link>
        ))}
      </div>
      {list.length === 0 && <div className="panel p-6 text-center"><p className="font-bold">No figures match those filters.</p><button className="btn-ghost mt-3" onClick={() => { setQ(""); setSeries(""); setMaker(""); setBand(""); setScale(""); setAvail(""); }}>Clear filters</button></div>}
    </section>
  );
}
