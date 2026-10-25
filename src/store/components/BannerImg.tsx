"use client";
import { useEffect, useRef, useState } from "react";

/** Wide banner art behind a hero. Hidden entirely if it can't load. */
export default function BannerImg({ src, className = "", fade }: { src: string; className?: string; fade: string }) {
  const [ok, setOk] = useState<boolean | null>(null);
  const img = useRef<HTMLImageElement>(null);
  useEffect(() => { const el = img.current; if (el?.complete) setOk(el.naturalWidth > 0); }, [src]);
  if (ok === false) return null;
  return (
    <div aria-hidden className={`absolute inset-0 transition-opacity duration-700 ${ok ? "opacity-100" : "opacity-0"}`}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img ref={img} src={src} alt="" referrerPolicy="no-referrer" decoding="async" onLoad={() => setOk(true)} onError={() => setOk(false)} className={`w-full object-cover ${className}`} />
      <div className="absolute inset-0" style={{ background: fade }} />
    </div>
  );
}
