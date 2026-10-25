"use client";
import { useEffect, useRef, useState } from "react";

/** Cover art from a URL. If it fails (offline, blocked CDN), a light typographic jacket takes its place. */
/** `quiet`: on failure render nothing (and call onFail) instead of the typographic jacket. */
export default function CoverImg({ src, title, color, eager = false, quiet = false, onFail }: { src: string; title: string; color: string; eager?: boolean; quiet?: boolean; onFail?: () => void }) {
  const [state, setState] = useState<"loading" | "ok" | "error">("loading");
  const img = useRef<HTMLImageElement>(null);
  // The image may have finished (or failed) before React attached its handlers.
  useEffect(() => { const el = img.current; if (el?.complete) setState(el.naturalWidth > 0 ? "ok" : "error"); }, [src]);
  useEffect(() => { if (state === "error") onFail?.(); }, [state, onFail]);
  if (state === "error") {
    if (quiet) return null;
    return (
      <div className="flex h-full w-full flex-col justify-between p-[9%]" style={{ background: `linear-gradient(155deg, ${color}, color-mix(in srgb, ${color} 55%, #000))` }}>
        <span className="font-display text-[clamp(11px,13cqw,22px)] leading-[1.05] text-white [text-shadow:0_1px_0_rgb(0_0_0/.35)]">{title.replace(/:.*/, "")}</span>
        <span className="h-[3px] w-1/3 rounded-full bg-white/70" />
      </div>
    );
  }
  return (
    <>
      {state === "loading" && !quiet && <span aria-hidden className="absolute inset-0 animate-pulse" style={{ background: color, opacity: 0.55 }} />}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img ref={img} src={src} alt={`${title} cover`} loading={eager ? "eager" : "lazy"} decoding="async" referrerPolicy="no-referrer"
        onLoad={() => setState("ok")} onError={() => setState("error")}
        className={`h-full w-full object-cover transition-opacity duration-500 ${state === "ok" ? "opacity-100" : "opacity-0"}`} />
    </>
  );
}
