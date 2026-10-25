"use client";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { lookupCharacter, lookupManga, type Art } from "@/store/lib/anilist-client";
import CoverImg from "./CoverImg";
import BannerImg from "./BannerImg";

/** Calls `fn` once the element is near the viewport, so off-screen cards don't spend lookups. */
function useNearView<T extends HTMLElement>(fn: () => void, deps: unknown[]) {
  const ref = useRef<T>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (!("IntersectionObserver" in window)) { fn(); return; }
    const io = new IntersectionObserver((es) => { if (es.some((e) => e.isIntersecting)) { io.disconnect(); fn(); } }, { rootMargin: "300px" });
    io.observe(el);
    return () => io.disconnect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
  return ref;
}

/** Artwork for a manga title the catalogue has no images for. `null` until (unless) AniList answers. */
export function useMangaArt(title: string, need: boolean) {
  const [art, setArt] = useState<Art | null>(null);
  useEffect(() => {
    if (!need) return;
    let live = true;
    lookupManga(title).then((a) => { if (live) setArt(a); });
    return () => { live = false; };
  }, [title, need]);
  return art;
}

/** Shows the generated jacket, then swaps in the real cover once it's found. */
export function AutoCover({ title, color, eager, children }: { title: string; color: string; eager?: boolean; children: ReactNode }) {
  const [src, setSrc] = useState<string>();
  const ref = useNearView<HTMLDivElement>(() => { lookupManga(title).then((a) => a?.cover && setSrc(a.cover)); }, [title]);
  return (
    <div ref={ref} className="relative h-full w-full">
      {children}
      {src && <div className="absolute inset-0"><CoverImg src={src} title={title} color={color} eager={eager} quiet onFail={() => setSrc(undefined)} /></div>}
    </div>
  );
}

/** Generated figure render, replaced by the character's art when AniList has it. */
export function AutoFigure({ character, name, className = "", rounded, children }: { character: string; name: string; className?: string; rounded?: boolean; children: ReactNode }) {
  const [src, setSrc] = useState<string>();
  const [ok, setOk] = useState(false);
  const ref = useNearView<HTMLDivElement>(() => { lookupCharacter(character).then((a) => a?.image && setSrc(a.image)); }, [character]);
  return (
    <div ref={ref} className="relative">
      {children}
      {src && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={src} alt={name} referrerPolicy="no-referrer" decoding="async" onLoad={() => setOk(true)} onError={() => setSrc(undefined)}
          className={`absolute inset-0 h-full w-full object-cover object-top transition-opacity duration-500 ${ok ? "opacity-100" : "opacity-0"} ${rounded ? "rounded-[10px]" : ""} ${className}`} />
      )}
    </div>
  );
}

/** Banner behind a series header: the catalogue's if it has one, otherwise looked up by title. */
export function AutoBanner({ src, title, className, fade }: { src?: string; title: string; className?: string; fade: string }) {
  const art = useMangaArt(title, !src);
  const url = src || art?.banner;
  return url ? <BannerImg key={url} src={url} className={className} fade={fade} /> : null;
}
