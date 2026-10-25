"use client";
import { useRef, useState } from "react";
import { FigureArt } from "./Art";
import { EASE, gsap, reduced } from "@/store/lib/motion";

const VIEWS = [["Character", 0], ["Figure", 1], ["In the box", 2]] as const;
export default function Gallery({ color, name, image, character }: { color: string; name: string; image?: string; character?: string }) {
  const [v, setV] = useState(0);
  const stage = useRef<HTMLDivElement>(null);
  const pick = (n: number) => {
    if (n === v) return;
    if (reduced() || !stage.current) { setV(n); return; }
    gsap.to(stage.current, { autoAlpha: 0, scale: 0.985, duration: 0.25, ease: "power2.in", onComplete: () => {
      setV(n); gsap.fromTo(stage.current, { autoAlpha: 0, scale: 1.025 }, { autoAlpha: 1, scale: 1, duration: 0.8, ease: EASE, clearProps: "transform" });
    } });
  };
  return (
    <div className="bleed -mt-5 border-b border-line paper-band px-4 pb-4 pt-5 dark:border-line" style={{ perspective: 900 }}>
      <div ref={stage} className="mx-auto max-w-sm overflow-hidden rounded-panel border border-line shadow-panel dark:border-line dark:shadow-none">
        <FigureArt color={color} name={name} variant={VIEWS[v][1]} image={image} character={character} rounded={false} />
      </div>
      <div className="mt-4 flex justify-center gap-2" role="tablist" aria-label="Views">
        {VIEWS.map(([l], i) => <button key={l} role="tab" aria-selected={v === i} onClick={() => pick(i)} className={v === i ? "chip-on" : "chip"}>{l}</button>)}
      </div>
    </div>
  );
}
