"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { Arrow, StageIcon, buttonClass, cx } from "@/components/ui";

export interface TourVideo {
  id: string;
  title: string;
  role: string;
  color: string;
  blurb: string;
  src: string;
  poster: string;
  duration: number;
  chapters: { t: number; title: string }[];
}

const STAGE: Record<string, number> = { owner: 1, creator: 2, fan: 4, operator: 5 };

const clock = (s: number) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, "0")}`;

export function VideoTour({ videos }: { videos: TourVideo[] }) {
  const [index, setIndex] = useState(0);
  const [time, setTime] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [autoNext, setAutoNext] = useState(true);
  const ref = useRef<HTMLVideoElement>(null);
  const frameRef = useRef<HTMLDivElement>(null);
  const resumeRef = useRef(false);
  const v = videos[index];
  const chapter = v.chapters.reduce((cur, c, i) => (time + 0.25 >= c.t ? i : cur), -1);

  const select = useCallback(
    (i: number, autoplay = true) => {
      resumeRef.current = autoplay;
      setIndex((i + videos.length) % videos.length);
      setTime(0);
    },
    [videos.length],
  );

  // Start the newly selected film once it has loaded.
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.load();
    if (resumeRef.current) el.play().catch(() => {});
  }, [index]);

  const seek = useCallback((t: number) => {
    const el = ref.current;
    if (!el) return;
    el.currentTime = Math.max(0, t - 0.15);
    el.play().catch(() => {});
  }, []);

  // Keyboard shortcuts for presenting: ←/→ chapters, 1–4 films, F full screen.
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const target = e.target as HTMLElement;
      if (target.closest("input, textarea, select, [contenteditable]")) return;
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      if (e.key >= "1" && e.key <= String(videos.length)) select(Number(e.key) - 1);
      else if (e.key === "ArrowRight" && target.tagName !== "VIDEO") {
        e.preventDefault();
        const next = v.chapters[chapter + 1];
        if (next) seek(next.t);
        else select(index + 1);
      } else if (e.key === "ArrowLeft" && target.tagName !== "VIDEO") {
        e.preventDefault();
        const prev = v.chapters[Math.max(0, chapter - (time - (v.chapters[chapter]?.t ?? 0) > 2 ? 0 : 1))];
        if (prev) seek(prev.t);
      } else if (e.key === "f" || e.key === "F") {
        frameRef.current?.requestFullscreen?.().catch(() => {});
      } else if (e.key === " " && target.tagName !== "VIDEO" && target.tagName !== "BUTTON") {
        e.preventDefault();
        const el = ref.current;
        if (el) (el.paused ? el.play() : el.pause())?.catch?.(() => {});
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [chapter, index, seek, select, time, v.chapters, videos.length]);

  return (
    <section aria-label="Walkthrough videos">
      {/* Film selector */}
      <div role="tablist" aria-label="Choose a login" className="grid grid-cols-2 border-t border-ink md:grid-cols-4">
        {videos.map((x, i) => {
          const active = i === index;
          return (
            <button
              key={x.id}
              role="tab"
              aria-selected={active}
              aria-controls="tour-player"
              onClick={() => select(i)}
              className={cx(
                "group relative flex flex-col items-start gap-2 border-b border-sand px-0 py-5 text-left transition-colors md:border-b-0 md:border-r md:px-5 md:last:border-r-0",
                active ? "bg-card" : "hover:bg-card/60",
              )}
            >
              <span className={cx("absolute inset-x-0 top-0 h-[3px] transition-colors", active ? "" : "bg-transparent")} style={active ? { background: x.color } : undefined} aria-hidden />
              <span className="flex w-full items-baseline justify-between gap-2 px-3 md:px-0">
                <span className={cx("transition-colors", active ? "text-vermilion" : "text-ink group-hover:text-vermilion")}>
                  {STAGE[x.id] ? <StageIcon n={STAGE[x.id]} className="h-7 w-7" strokeWidth={1.5} /> : <span className="font-mono text-[22px] leading-none">{String(i + 1).padStart(2, "0")}</span>}
                </span>
                <span className="label text-moss">
                  {i + 1} · {clock(x.duration)}
                </span>
              </span>
              <span className="px-3 md:px-0">
                <span className="block text-[16px] font-semibold tracking-[-0.02em] text-ink">{x.title}</span>
                <span className="label mt-1 flex items-center gap-1.5 text-moss">
                  <span className="h-1.5 w-1.5 rounded-full" style={{ background: x.color }} aria-hidden />
                  {x.role}
                </span>
              </span>
            </button>
          );
        })}
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-[minmax(0,1fr)_360px]">
        {/* Player */}
        <div id="tour-player" role="tabpanel" aria-label={v.title}>
          <div ref={frameRef} className="relative overflow-hidden rounded-[var(--radius-card)] bg-ink shadow-[var(--shadow-lift)] [&:fullscreen]:rounded-none">
            <video
              ref={ref}
              key={v.id}
              poster={v.poster}
              muted
              controls
              preload="metadata"
              playsInline
              className="block aspect-video w-full bg-ink [:fullscreen_&]:h-full"
              onTimeUpdate={(e) => setTime(e.currentTarget.currentTime)}
              onPlay={() => setPlaying(true)}
              onPause={() => setPlaying(false)}
              onEnded={() => {
                setPlaying(false);
                if (autoNext && index < videos.length - 1) select(index + 1);
              }}
              aria-label={`${v.title} walkthrough`}
            >
              <source src={v.src} type="video/mp4" />
            </video>
          </div>
          {/* Progress rail with chapter ticks */}
          <div className="relative mt-3 h-1.5 rounded-full bg-ivory" aria-hidden>
            <div className="absolute inset-y-0 left-0 rounded-full bg-vermilion transition-[width] duration-200" style={{ width: `${Math.min(100, (time / v.duration) * 100)}%` }} />
            {v.chapters.map((c, i) => (
              <span key={i} className="absolute top-1/2 h-3 w-[2px] -translate-y-1/2 bg-ink/40" style={{ left: `${(c.t / v.duration) * 100}%` }} />
            ))}
          </div>
          <div className="mt-5 flex flex-wrap items-start justify-between gap-4">
            <div className="max-w-xl">
              <h2 className="text-[22px] font-semibold tracking-[-0.02em]">{v.title}</h2>
              <p className="mt-1 text-sm leading-relaxed text-ink-2">{v.blurb}</p>
            </div>
            <div className="flex flex-wrap gap-2">
              <a href={v.src} download className={buttonClass("secondary", "sm")}>Download MP4</a>
              <button type="button" className={buttonClass("secondary", "sm")} onClick={() => frameRef.current?.requestFullscreen?.().catch(() => {})}>
                Present full screen
              </button>
              <Link href="/#enter" className={`group ${buttonClass("primary", "sm")}`}>Try this login <Arrow /></Link>
            </div>
          </div>
          <div className="mt-4 flex flex-wrap items-center gap-x-6 gap-y-2 font-mono text-[11px] text-moss">
            <label className="flex cursor-pointer items-center gap-2">
              <input type="checkbox" checked={autoNext} onChange={(e) => setAutoNext(e.target.checked)} className="accent-[var(--color-ink)]" />
              Play the next film automatically
            </label>
            <span className="hidden sm:inline">Keys: 1–{videos.length} films · ← → chapters · space play/pause · F full screen</span>
          </div>
        </div>

        {/* Chapters = transcript */}
        <aside aria-label="Chapters" className="lg:sticky lg:top-20 lg:self-start">
          <div className="flex items-baseline justify-between border-b border-sand pb-3">
            <h3 className="label text-moss">Chapters · transcript</h3>
            <span className="font-mono text-[11px] text-moss">{playing ? "playing" : "paused"} · {clock(time)} / {clock(v.duration)}</span>
          </div>
          <ol className="max-h-[560px] divide-y divide-sand overflow-auto">
            {v.chapters.map((c, i) => {
              const active = i === chapter;
              return (
                <li key={i}>
                  <button
                    type="button"
                    onClick={() => seek(c.t)}
                    aria-current={active ? "step" : undefined}
                    className={cx("grid w-full grid-cols-[44px_1fr] gap-3 px-2 py-3 text-left transition-colors", active ? "bg-card" : "hover:bg-card/60")}
                  >
                    <span className={cx("font-mono text-[12px] tabular-nums", active ? "text-vermilion" : "text-moss")}>{clock(c.t)}</span>
                    <span className={cx("text-[13.5px] leading-snug", active ? "font-medium text-ink" : "text-ink-2")}>{c.title}</span>
                  </button>
                </li>
              );
            })}
          </ol>
        </aside>
      </div>
    </section>
  );
}
