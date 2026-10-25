"use client";
import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { IconBack, IconLock } from "./Icons";
import AddToCart from "./AddToCart";

type Props = {
  slug: string; title: string; chapter: number; chapterTitle?: string; pages: number; lang: string; langs: { code: string; native: string }[]; total: number;
  next: { number: number; locked: boolean; free: boolean } | null;
  bridge: { volumeId: string; number: number; price: number; edition: string; inStock: boolean; owned: boolean } | null;
  signedIn: boolean;
};

export default function Reader(p: Props) {
  const [mode, setMode] = useState<"vertical" | "paged">("vertical");
  const [ui, setUi] = useState(true);
  const [page, setPage] = useState(1); // paged mode; pages+1 = end card
  const saved = useRef(false);
  const src = (i: number) => `/api/store/page?s=${p.slug}&c=${p.chapter}&p=${i}&l=${p.lang}`;

  useEffect(() => {
    try { const m = localStorage.getItem("torii_reader_mode"); if (m === "paged" || m === "vertical") setMode(m); } catch {}
    if (!saved.current) {
      saved.current = true;
      fetch("/api/store/progress", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ slug: p.slug, chapter: p.chapter, language: p.lang }) }).catch(() => {});
    }
    const t = setTimeout(() => setUi(false), 2500);
    return () => clearTimeout(t);
  }, [p.slug, p.chapter, p.lang]);

  const setM = (m: "vertical" | "paged") => { setMode(m); setPage(1); try { localStorage.setItem("torii_reader_mode", m); } catch {} };
  const go = useCallback((d: number) => setPage((x) => Math.min(p.pages + 1, Math.max(1, x + d))), [p.pages]);
  useEffect(() => {
    const k = (e: KeyboardEvent) => { if (mode !== "paged") return; if (e.key === "ArrowRight") go(1); if (e.key === "ArrowLeft") go(-1); };
    window.addEventListener("keydown", k); return () => window.removeEventListener("keydown", k);
  }, [mode, go]);

  const nextHref = p.next ? `/read/${p.slug}/${p.next.number}?lang=${p.lang}` : null;
  const End = (
    <div className="mx-auto max-w-md space-y-3 px-4 py-8 text-center">
      <div className="text-[22px] font-bold tracking-[-0.02em]">End of chapter {p.chapter}</div>
      {p.bridge && (
        <div data-section="manga" className="panel paper-band space-y-2 p-4 text-left">
          <div className="text-[13px] font-bold text-accent">You finished volume {p.bridge.number}</div>
          <div className="text-[20px] font-bold tracking-[-0.02em] leading-tight">{p.bridge.owned ? `Volume ${p.bridge.number} is on your shelf` : `Own volume ${p.bridge.number} in print for ₹${p.bridge.price.toLocaleString("en-IN")}`}</div>
          <p className="text-sm text-muted">{p.bridge.edition === "india" ? "Official India-printed edition with an authenticity tag." : "Official imported edition with an authenticity tag."}</p>
          {!p.bridge.owned && (
            <div className="flex gap-2">
              {p.bridge.inStock ? <AddToCart kind="volume" refId={p.bridge.volumeId} label="Add to cart" className="btn-primary flex-1" signedIn={p.signedIn} /> : <span className="btn-ghost flex-1">Out of stock</span>}
              <Link href={`/manga/${p.slug}`} className="btn-ghost">See all volumes</Link>
            </div>
          )}
        </div>
      )}
      {nextHref ? (
        <Link href={nextHref} className="btn-primary w-full">
          {p.next!.locked ? <><IconLock className="h-4 w-4" /> Unlock chapter {p.next!.number} for ₹9</> : `Next chapter: ${p.next!.number}`}
        </Link>
      ) : (
        <div className="text-sm text-muted">You're all caught up. New chapters arrive soon after Japan.</div>
      )}
      <Link href={`/read/${p.slug}`} className="btn-ghost w-full">All chapters</Link>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#111] text-white">
      <div className={`app-fixed top-0 z-20 bg-black/85 backdrop-blur transition-transform ${ui ? "translate-y-0" : "-translate-y-full"}`} style={{ paddingTop: "env(safe-area-inset-top)" }}>
        <div className="mx-auto flex h-12 max-w-3xl items-center gap-2 px-2">
          <Link href={`/read/${p.slug}?lang=${p.lang}`} className="p-2" aria-label="Back to series"><IconBack /></Link>
          <div className="min-w-0 flex-1">
            <div className="truncate text-sm font-semibold">{p.title}</div>
            <div className="truncate text-[11px] text-white/60">Chapter {p.chapter} of {p.total.toLocaleString("en-IN")}{p.chapterTitle ? ` · ${p.chapterTitle}` : ""}</div>
          </div>
          <select className="rounded-lg bg-white/10 px-2 py-1 text-xs" value={p.lang} aria-label="Language"
            onChange={(e) => (location.href = `/read/${p.slug}/${p.chapter}?lang=${e.target.value}`)}>
            {p.langs.map((l) => <option key={l.code} value={l.code} className="text-black">{l.native}</option>)}
          </select>
          <button className="rounded-lg bg-white/10 px-2 py-1 text-xs" onClick={() => setM(mode === "vertical" ? "paged" : "vertical")}>{mode === "vertical" ? "Scroll" : "Pages"}</button>
        </div>
      </div>

      {mode === "vertical" ? (
        <div className="mx-auto max-w-2xl" onClick={() => setUi((u) => !u)}>
          {Array.from({ length: p.pages }, (_, i) => (
            // eslint-disable-next-line @next/next/no-img-element
            <img key={i} src={src(i + 1)} alt={`Page ${i + 1}`} className="block w-full" loading={i < 2 ? "eager" : "lazy"} />
          ))}
          <div onClick={(e) => e.stopPropagation()} className="bg-bg text-fg">{End}</div>
        </div>
      ) : (
        <div className="relative flex min-h-screen items-center justify-center">
          {page <= p.pages ? (
            <>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={src(page)} alt={`Page ${page}`} className="max-h-screen w-auto max-w-full" />
              <button className="absolute inset-y-0 left-0 w-1/3" aria-label="Previous page" onClick={() => go(-1)} />
              <button className="absolute inset-y-0 left-1/3 w-1/3" aria-label="Toggle controls" onClick={() => setUi((u) => !u)} />
              <button className="absolute inset-y-0 right-0 w-1/3" aria-label="Next page" onClick={() => go(1)} />
            </>
          ) : (
            <div className="w-full bg-bg text-fg">{End}</div>
          )}
          {/* preload next page */}
          {page < p.pages && <link rel="preload" as="image" href={src(page + 1)} />}
        </div>
      )}

      {mode === "paged" && (
        <div className={`app-fixed bottom-0 z-20 bg-black/85 backdrop-blur transition-transform ${ui ? "translate-y-0" : "translate-y-full"}`} style={{ paddingBottom: "env(safe-area-inset-bottom)" }}>
          <div className="mx-auto flex max-w-3xl items-center gap-3 px-4 py-2 text-xs">
            <button className="rounded-lg bg-white/10 px-3 py-1.5" onClick={() => go(-1)}>Prev</button>
            <input type="range" min={1} max={p.pages + 1} value={page} onChange={(e) => setPage(Number(e.target.value))} className="flex-1 accent-[rgb(232,84,76)]" aria-label="Page" />
            <span className="w-12 text-right">{Math.min(page, p.pages)}/{p.pages}</span>
            <button className="rounded-lg bg-white/10 px-3 py-1.5" onClick={() => go(1)}>Next</button>
          </div>
        </div>
      )}
    </div>
  );
}
