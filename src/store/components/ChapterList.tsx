"use client";
import Link from "next/link";
import { useMemo, useRef, useState } from "react";
import { EASE, gsap, reduced } from "@/store/lib/motion";
import { IconLock, IconCheck } from "./Icons";

type Row = [number, number, number, number]; // number, volume, free, canRead
export default function ChapterList({ slug, lang, rows, readUpTo, totalVolumes, titles }: { slug: string; lang: string; rows: Row[]; readUpTo: number; totalVolumes: number; titles?: string[] }) {
  const [desc, setDesc] = useState(false);
  const [jump, setJump] = useState("");
  const groups = useMemo(() => {
    const m = new Map<number, Row[]>();
    for (const r of rows) { const k = r[1]; if (!m.has(k)) m.set(k, []); m.get(k)!.push(r); }
    const arr = Array.from(m.entries()).sort((a, b) => (a[0] === 0 ? 1e9 : a[0]) - (b[0] === 0 ? 1e9 : b[0]));
    return desc ? arr.reverse().map(([k, v]) => [k, [...v].reverse()] as [number, Row[]]) : arr;
  }, [rows, desc]);
  const currentVol = rows.find((r) => r[0] === Math.max(1, readUpTo))?.[1] ?? 1;
  const [open, setOpen] = useState<Set<number>>(() => new Set([currentVol]));
  const lists = useRef<Record<number, HTMLUListElement | null>>({});
  const toggle = (v: number) => {
    const opening = !open.has(v);
    setOpen((o) => { const n = new Set(o); opening ? n.add(v) : n.delete(v); return n; });
    if (opening && !reduced()) requestAnimationFrame(() => { const el = lists.current[v]; el && gsap.from(el, { height: 0, opacity: 0, duration: 0.6, ease: EASE, clearProps: "height,opacity" }); });
  };

  return (
    <section aria-labelledby="chapters">
      <div className="mb-3 flex items-center gap-2">
        <h2 id="chapters" data-reveal="lines" className="h-section mr-auto">Chapters</h2>
        <form onSubmit={(e) => { e.preventDefault(); const n = parseInt(jump, 10); if (n >= 1 && n <= rows.length) location.href = `/read/${slug}/${n}?lang=${lang}`; }}>
          <input className="input min-h-[38px] w-[104px] py-1 text-[14px]" inputMode="numeric" placeholder="Go to…" value={jump} onChange={(e) => setJump(e.target.value.replace(/\D/g, ""))} aria-label="Go to chapter number" />
        </form>
        <button className="chip" onClick={() => setDesc(!desc)} aria-label="Change order">{desc ? "Newest first" : "Oldest first"}</button>
      </div>
      <div className="space-y-2">
        {groups.map(([vol, list]) => {
          const isOpen = open.has(vol);
          const first = Math.min(...list.map((r) => r[0])), last = Math.max(...list.map((r) => r[0]));
          const done = vol !== 0 && vol <= totalVolumes && last <= readUpTo;
          return (
            <div key={vol} className={`overflow-hidden rounded-panel border bg-card transition-colors duration-300 ${isOpen ? "border-fg/25" : "border-line"}`}>
              <button className="flex min-h-[52px] w-full items-center gap-3 px-4 text-left" onClick={() => toggle(vol)} aria-expanded={isOpen}>
                <span className="text-[15px] font-bold tracking-[-0.02em]">{vol === 0 ? "Latest chapters" : `Volume ${vol}`}</span>
                <span className="text-[12.5px] text-muted">{first === last ? `Chapter ${first}` : `Chapters ${first} to ${last}`}</span>
                {done && <span className="flex h-5 w-5 items-center justify-center rounded-full bg-ok text-white" aria-label="Read"><IconCheck className="h-3 w-3" /></span>}
                <span aria-hidden className={`ml-auto text-xl leading-none transition-transform ${isOpen ? "rotate-45" : ""}`}>+</span>
              </button>
              {isOpen && (
                <ul ref={(el) => { lists.current[vol] = el; }} className="divide-y divide-line border-t border-line">
                  {list.map(([n, , free, ok]) => (
                    <li key={n}>
                      <Link href={`/read/${slug}/${n}?lang=${lang}`} className="flex min-h-[48px] items-center gap-2 px-4 text-[14.5px] hover:bg-accentsoft/50">
                        <span className={`min-w-0 truncate ${n <= readUpTo ? "text-muted" : "font-semibold"}`}>Chapter {n}{titles?.[n - 1] && titles[n - 1] !== `Chapter ${n}` ? `: ${titles[n - 1]}` : ""}</span>
                        {n === readUpTo && <span className="rounded-md bg-ink px-1.5 py-0.5 text-[11px] font-bold text-white dark:bg-fg dark:text-bg">Last read</span>}
                        <span className="ml-auto text-[13px] font-bold">
                          {free ? <span className="text-ok">Free</span> : ok ? <span className="text-ok">Yours</span> : <span className="flex items-center gap-1 text-accent"><IconLock className="h-3.5 w-3.5" />₹9</span>}
                        </span>
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
}
