"use client";

import Link from "next/link";
import { useCallback, useEffect, useState, type ReactNode } from "react";
import { cx } from "@/components/ui";

export interface Slide {
  id: string;
  kicker: string;
  tone: "ink" | "paper" | "red" | "indigo";
  body: ReactNode;
  live?: { href: string; label: string };
}

const TONE: Record<Slide["tone"], string> = {
  ink: "bg-ink text-paper",
  paper: "bg-paper text-ink",
  red: "bg-vermilion text-white",
  indigo: "bg-indigo text-paper",
};
const PATTERN: Record<Slide["tone"], string> = {
  ink: "seigaiha-ink",
  paper: "seigaiha",
  red: "seigaiha-red",
  indigo: "seigaiha-indigo",
};

/** Full-screen deck: ← → / space to move, F for fullscreen, Esc to leave. */
export function Deck({ slides }: { slides: Slide[] }) {
  const [i, setI] = useState(0);
  const go = useCallback((n: number) => setI((cur) => Math.max(0, Math.min(slides.length - 1, typeof n === "number" ? n : cur))), [slides.length]);

  useEffect(() => {
    const read = () => {
      const n = Number(window.location.hash.replace("#", "")) - 1;
      if (Number.isInteger(n) && n >= 0) setI(Math.min(slides.length - 1, n));
    };
    read();
    window.addEventListener("hashchange", read);
    return () => window.removeEventListener("hashchange", read);
  }, [slides.length]);
  useEffect(() => {
    history.replaceState(null, "", `#${i + 1}`);
  }, [i]);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement) return;
      if (["ArrowRight", "PageDown", " "].includes(e.key)) { e.preventDefault(); setI((c) => Math.min(slides.length - 1, c + 1)); }
      if (["ArrowLeft", "PageUp"].includes(e.key)) { e.preventDefault(); setI((c) => Math.max(0, c - 1)); }
      if (e.key === "Home") go(0);
      if (e.key === "End") go(slides.length - 1);
      if (e.key.toLowerCase() === "f") {
        if (document.fullscreenElement) document.exitFullscreen().catch(() => {});
        else document.documentElement.requestFullscreen().catch(() => {});
      }
      if (e.key === "Escape" && !document.fullscreenElement) window.location.assign("/");
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [go, slides.length]);

  const s = slides[i];
  return (
    <div className={cx("fixed inset-0 z-[60] flex flex-col overflow-hidden transition-colors duration-500", TONE[s.tone])} role="region" aria-roledescription="slide deck" aria-label="Torii pitch">
      <div className={cx(PATTERN[s.tone], "pointer-events-none absolute inset-x-0 bottom-0 h-[38vh] opacity-70 [mask-image:linear-gradient(to_top,black,transparent)]")} aria-hidden />
      <div className="relative flex items-center justify-between px-6 pt-5 sm:px-12 sm:pt-8">
        <span className="label text-[10.5px] opacity-60">{s.kicker}</span>
        <span className="label text-[10.5px] opacity-60">
          {String(i + 1).padStart(2, "0")} / {String(slides.length).padStart(2, "0")}
        </span>
      </div>

      <div key={s.id} className="relative flex min-h-0 flex-1 animate-rise items-center overflow-y-auto px-6 py-8 sm:px-12 lg:px-20" aria-live="polite">
        <div className="mx-auto w-full max-w-6xl">{s.body}</div>
      </div>

      <div className="relative flex items-center justify-between gap-4 px-6 pb-5 sm:px-12 sm:pb-8">
        <div className="flex items-center gap-2">
          <button type="button" onClick={() => setI((c) => Math.max(0, c - 1))} disabled={i === 0} className="grid h-10 w-10 place-items-center rounded-full ring-1 ring-inset ring-current/30 disabled:opacity-25" aria-label="Previous slide">
            <svg viewBox="0 0 16 16" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden><path d="M10 3 5 8l5 5" strokeLinecap="round" strokeLinejoin="round" /></svg>
          </button>
          <button type="button" onClick={() => setI((c) => Math.min(slides.length - 1, c + 1))} disabled={i === slides.length - 1} className="grid h-10 w-10 place-items-center rounded-full ring-1 ring-inset ring-current/30 disabled:opacity-25" aria-label="Next slide">
            <svg viewBox="0 0 16 16" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden><path d="m6 3 5 5-5 5" strokeLinecap="round" strokeLinejoin="round" /></svg>
          </button>
          <span className="ml-3 hidden text-[12px] opacity-50 sm:inline">← → to move · F fullscreen · Esc to leave</span>
        </div>
        <div className="flex items-center gap-4">
          {s.live && (
            <Link href={s.live.href} className="rounded-full bg-current/10 px-4 py-2 text-[13px] font-medium ring-1 ring-inset ring-current/30 hover:ring-current">
              Show it live: {s.live.label} →
            </Link>
          )}
        </div>
      </div>
      <div className="relative flex h-1 w-full gap-1 px-6 pb-3 sm:px-12" aria-hidden>
        {slides.map((x, k) => (
          <button key={x.id} type="button" tabIndex={-1} onClick={() => go(k)} className={cx("h-1 flex-1 rounded-full transition-opacity", k <= i ? "bg-current opacity-80" : "bg-current opacity-20")} />
        ))}
      </div>
    </div>
  );
}
