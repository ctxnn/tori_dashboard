"use client";
import { useEffect, useRef, useState } from "react";
import { Cover, hueShift, shade } from "./Art";
import AddToCart from "./AddToCart";
import { EASE, gsap, reduced } from "@/store/lib/motion";

type V = { id: string; number: number; price: number; edition: string; stock: number; owned: boolean; inCart: boolean };
export default function VolumeGrid({ vols, title, color, signedIn }: { vols: V[]; title: string; color: string; signedIn: boolean }) {
  const [sel, setSel] = useState<V | null>(null);
  const [view, setView] = useState<"spines" | "covers">("spines");
  const sheet = useRef<HTMLDivElement>(null);
  useEffect(() => { if (sel && sheet.current && !reduced()) gsap.fromTo(sheet.current, { yPercent: 100 }, { yPercent: 0, duration: 0.7, ease: EASE }); }, [sel]);
  const close = () => { if (!sheet.current || reduced()) return setSel(null); gsap.to(sheet.current, { yPercent: 100, duration: 0.35, ease: "power3.in", onComplete: () => setSel(null) }); };
  const owned = vols.filter((v) => v.owned).length;

  return (
    <section aria-labelledby="vols">
      <div className="mb-3 flex items-center gap-2">
        <h2 id="vols" data-reveal="lines" className="h-section mr-auto">All {vols.length} volumes</h2>
        <div className="flex rounded-full border border-line p-0.5 dark:border-line" role="tablist" aria-label="View">
          {(["spines", "covers"] as const).map((v) => (
            <button key={v} role="tab" aria-selected={view === v} onClick={() => setView(v)} className={`rounded-full px-3 py-1 text-[13px] font-bold ${view === v ? "bg-ink text-white dark:bg-fg dark:text-bg" : "text-muted"}`}>{v === "spines" ? "Shelf" : "Covers"}</button>
          ))}
        </div>
      </div>
      <p className="mb-3 text-[13.5px] text-muted">{owned ? `${owned} on your shelf. Tap any gap to fill it.` : "Tap a volume to see the price and add it."}</p>

      {view === "spines" ? (
        <div data-reveal className="rounded-panel border border-line bg-card p-3 pb-0 dark:border-line">
          <div className="flex flex-wrap items-end gap-x-[3px] gap-y-3">
            {vols.map((v) => {
              const c = hueShift(color, ((v.number * 23) % 50) - 25);
              return (
                <button key={v.id} onClick={() => setSel(v)} aria-label={`Volume ${v.number}${v.owned ? ", owned" : ""}`}
                  className={`group relative flex h-[118px] w-[26px] flex-col items-center justify-between rounded-[4px] border-2 py-1.5 transition-transform hover:-translate-y-1 ${v.owned ? "border-ink" : "border-line bg-bg"} ${v.inCart && !v.owned ? "ring-2 ring-accent ring-offset-1" : ""}`}
                  style={v.owned ? { background: `linear-gradient(90deg, ${shade(c, -30)}, ${c} 30%, ${c} 70%, ${shade(c, -25)})` } : undefined}>
                  <span className={`text-[9px] font-black [writing-mode:vertical-rl] ${v.owned ? "text-white" : "text-muted/50"}`}>{title.replace(/:.*/, "").slice(0, 14)}</span>
                  <span className={`text-[11px] font-bold tracking-[-0.02em] ${v.owned ? "text-white" : "text-muted"}`}>{v.number}</span>
                </button>
              );
            })}
          </div>
          <div className="-mx-3 mt-0 h-3 border-t border-line bg-[repeating-linear-gradient(90deg,rgb(var(--line)),rgb(var(--line))_6px,rgb(var(--card))_6px,rgb(var(--card))_12px)] dark:border-line" />
        </div>
      ) : (
        <div className="grid grid-cols-4 gap-2.5 ">
          {vols.map((v) => (
            <button key={v.id} onClick={() => setSel(v)} className="text-left" aria-label={`Volume ${v.number}`}>
              <Cover title={title} color={color} vol={v.number} size="sm" dim={!v.owned} />
              <div className="mt-1 flex items-center justify-between px-0.5 text-[12px]">
                <span className={v.owned ? "font-bold text-accent" : v.stock === 0 ? "text-muted line-through" : "font-bold"}>{v.owned ? "Owned" : `₹${v.price}`}</span>
                {v.edition === "import" && <span className="rounded bg-line px-1 text-[9.5px] font-bold">Import</span>}
              </div>
            </button>
          ))}
        </div>
      )}

      {sel && (
        <div className="fixed inset-0 z-50 flex animate-fade-in items-end justify-center bg-black/40 backdrop-blur-[2px]" onClick={close}>
          <div ref={sheet} role="dialog" aria-label={`Volume ${sel.number}`} className="w-full max-w-[440px] rounded-t-[24px] border border-b-0 border-line bg-card p-5 dark:border-line" onClick={(e) => e.stopPropagation()} style={{ paddingBottom: "max(1.25rem, env(safe-area-inset-bottom))" }}>
            <div className="mx-auto mb-4 h-1.5 w-12 rounded-full bg-line" />
            <div className="flex gap-4">
              <div className="w-28 shrink-0 "><Cover title={title} color={color} vol={sel.number} size="md" /></div>
              <div className="min-w-0 space-y-1.5">
                <div className="text-[20px] font-bold tracking-[-0.02em] leading-tight">{title.replace(/:.*/, "")}, volume {sel.number}</div>
                <p className="text-[13.5px] text-muted">{sel.edition === "india" ? "Printed in India. Ships in 2 to 6 days." : "Imported edition. Not printed in India yet."}</p>
                <div className="price text-[28px]">₹{sel.price.toLocaleString("en-IN")}</div>
                <p className="text-[13px] font-semibold">{sel.owned ? "Already on your shelf" : sel.stock === 0 ? "Out of stock" : sel.stock < 25 ? `Only ${sel.stock} left` : "In stock"}</p>
              </div>
            </div>
            <div className="mt-5 grid grid-cols-[1fr_auto] gap-2">
              <AddToCart kind="volume" refId={sel.id} signedIn={signedIn} className="btn-primary" disabled={sel.stock === 0} label={sel.owned ? "Buy another copy" : "Add to cart"} />
              <button className="btn-ghost" onClick={close}>Close</button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
