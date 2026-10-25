"use client";
/* Anime trailers from YouTube (the adaptation's official trailer, as listed on AniList).
   Embeds use youtube-nocookie.com and only load when they're about to be seen. */
import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useMangaArt } from "./AutoArt";
import { reduced } from "@/store/lib/motion";

const embed = (id: string, extra: Record<string, string | number>) =>
  `https://www.youtube-nocookie.com/embed/${id}?${new URLSearchParams({ playsinline: "1", rel: "0", modestbranding: "1", iv_load_policy: "3", ...Object.fromEntries(Object.entries(extra).map(([k, v]) => [k, String(v)])) })}`;
export const thumb = (id: string) => `https://i.ytimg.com/vi/${id}/hqdefault.jpg`;

/** The series' trailer id: from the catalogue, or looked up on AniList if the catalogue has none. */
export function useTrailer(title: string, known?: string) {
  const art = useMangaArt(title, !known);
  return known || art?.trailer;
}

function saveData() {
  const c = (navigator as Navigator & { connection?: { saveData?: boolean; effectiveType?: string } }).connection;
  return !!c?.saveData || /(^|-)2g$/.test(c?.effectiveType ?? "");
}

/** Muted, looping trailer playing behind the billboard, like a streaming app. Off for reduced motion and data saver. */
export function TrailerBackdrop({ id, fade, className = "" }: { id: string; fade: string; className?: string }) {
  const [allowed, setAllowed] = useState(false);
  const [shown, setShown] = useState(false);
  const [muted, setMuted] = useState(true);
  const frame = useRef<HTMLIFrameElement>(null);
  useEffect(() => { setAllowed(!reduced() && !saveData()); setShown(false); setMuted(true); }, [id]);
  // Only fade the video in once YouTube reports it is actually playing, so a blocked,
  // region-locked or non-embeddable trailer never shows an error screen behind the billboard.
  useEffect(() => {
    if (!allowed) return;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const onMsg = (e: MessageEvent) => {
      if (e.source !== frame.current?.contentWindow || !/^https:\/\/www\.youtube(-nocookie)?\.com$/.test(e.origin)) return;
      let d: { event?: string; info?: number | { playerState?: number } } | null = null;
      try { d = typeof e.data === "string" ? JSON.parse(e.data) : e.data; } catch { return; }
      const state = typeof d?.info === "number" ? d.info : d?.info?.playerState;
      if (d?.event === "onError") { clearTimeout(timer); setAllowed(false); }
      else if ((d?.event === "onStateChange" || d?.event === "infoDelivery") && state === 1) { timer ??= setTimeout(() => setShown(true), 900); }
    };
    window.addEventListener("message", onMsg);
    return () => { window.removeEventListener("message", onMsg); clearTimeout(timer); };
  }, [allowed, id]);
  if (!allowed) return null;
  const send = (func: string) => frame.current?.contentWindow?.postMessage(JSON.stringify({ event: "command", func, args: [] }), "*");
  const listen = () => frame.current?.contentWindow?.postMessage(JSON.stringify({ event: "listening", id: 1, channel: "widget" }), "*");
  return (
    <>
      <div aria-hidden className={`pointer-events-none absolute inset-x-0 top-0 overflow-hidden transition-opacity duration-1000 [container-type:size] ${shown ? "opacity-100" : "opacity-0"} ${className}`}>
        <iframe ref={frame} key={id} title="" tabIndex={-1} allow="autoplay; encrypted-media"
          src={embed(id, { autoplay: 1, mute: 1, controls: 0, loop: 1, playlist: id, disablekb: 1, fs: 0, enablejsapi: 1, origin: location.origin })}
          onLoad={listen}
          className="absolute left-1/2 top-1/2 h-[max(100cqh,56.25cqw)] w-[max(100cqw,177.78cqh)] -translate-x-1/2 -translate-y-1/2 scale-[1.18] border-0" />
        <div className="absolute inset-0" style={{ background: fade }} />
      </div>
      {shown && (
        <button type="button" onClick={() => { send(muted ? "unMute" : "mute"); setMuted(!muted); }} aria-label={muted ? "Turn trailer sound on" : "Mute trailer"}
          className="absolute right-3 top-3 z-10 grid h-9 w-9 place-items-center rounded-full border border-white/40 bg-black/35 text-white backdrop-blur transition active:scale-95">
          <svg viewBox="0 0 24 24" className="h-[18px] w-[18px]" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
            <path d="M11 5 6 9H3v6h3l5 4z" fill="currentColor" stroke="none" />
            {muted ? <path d="m16 9 5 6m0-6-5 6" /> : <path d="M15.5 8.5a5 5 0 0 1 0 7M18.5 5.5a9 9 0 0 1 0 13" />}
          </svg>
        </button>
      )}
    </>
  );
}

/** Full-screen player with sound and controls. */
export function TrailerModal({ id, title, onClose }: { id: string; title: string; onClose: () => void }) {
  useEffect(() => {
    const k = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", k);
    const o = document.body.style.overflow; document.body.style.overflow = "hidden";
    return () => { document.removeEventListener("keydown", k); document.body.style.overflow = o; };
  }, [onClose]);
  return createPortal(
    <div role="dialog" aria-modal="true" aria-label={`${title} trailer`} className="fixed inset-0 z-[80] flex flex-col justify-center bg-black/90 px-3" onClick={onClose}>
      <div className="mx-auto w-full max-w-[720px]" onClick={(e) => e.stopPropagation()}>
        <div className="mb-2 flex items-center justify-between text-white">
          <p className="truncate pr-3 text-[15px] font-semibold">{title} · anime trailer</p>
          <button type="button" onClick={onClose} className="grid h-10 w-10 place-items-center rounded-full bg-white/15 text-[22px] leading-none" aria-label="Close trailer">×</button>
        </div>
        <div className="relative aspect-video overflow-hidden rounded-[10px] bg-black">
          <iframe title={`${title} trailer`} src={embed(id, { autoplay: 1 })} allow="autoplay; encrypted-media; picture-in-picture; fullscreen" allowFullScreen className="absolute inset-0 h-full w-full border-0" />
        </div>
      </div>
    </div>,
    document.body,
  );
}

export function PlayIcon({ className = "h-4 w-4" }: { className?: string }) {
  return <svg viewBox="0 0 24 24" className={className} fill="currentColor" aria-hidden><path d="M8 5.5v13a1 1 0 0 0 1.5.86l10.6-6.5a1 1 0 0 0 0-1.72L9.5 4.64A1 1 0 0 0 8 5.5z" /></svg>;
}

/** Trailer section for a series page: a poster frame that plays in place when tapped. */
export function TrailerCard({ title, trailer }: { title: string; trailer?: string }) {
  const id = useTrailer(title, trailer);
  const [play, setPlay] = useState(false);
  const [thumbOk, setThumbOk] = useState(true);
  if (!id) return null;
  return (
    <section aria-labelledby="trailer">
      <h2 id="trailer" className="h-section mb-2.5">Watch the anime trailer</h2>
      <div className="relative aspect-video overflow-hidden rounded-panel border border-line bg-ink shadow-panel dark:border-line dark:shadow-none">
        {play ? (
          <iframe title={`${title} trailer`} src={embed(id, { autoplay: 1 })} allow="autoplay; encrypted-media; picture-in-picture; fullscreen" allowFullScreen className="absolute inset-0 h-full w-full border-0" />
        ) : (
          <button type="button" onClick={() => setPlay(true)} className="group absolute inset-0 block text-left" aria-label={`Play the ${title} trailer`}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            {thumbOk && <img src={thumb(id)} alt="" loading="lazy" decoding="async" referrerPolicy="no-referrer" onError={() => setThumbOk(false)} className="absolute inset-0 h-full w-full scale-[1.34] object-cover transition-transform duration-700 ease-out group-hover:scale-[1.4]" />}
            <span className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/10 to-transparent" />
            <span className="absolute left-1/2 top-1/2 grid h-16 w-16 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full bg-white/95 text-ink shadow-lg transition group-active:scale-95"><PlayIcon className="ml-1 h-7 w-7" /></span>
            <span className="absolute bottom-3 left-3.5 right-3.5 text-[13px] font-semibold text-white">Official trailer · plays from YouTube</span>
          </button>
        )}
      </div>
    </section>
  );
}
