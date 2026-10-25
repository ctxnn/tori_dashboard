"use client";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { EASE, gsap, pulseCart, reduced } from "@/store/lib/motion";

export default function AddToCart({ kind, refId, items, label = "Add to cart", className = "btn-primary", signedIn, disabled }:
  { kind?: "volume" | "box" | "figure"; refId?: string; items?: { kind: string; refId: string }[]; label?: string; className?: string; signedIn: boolean; disabled?: boolean }) {
  const router = useRouter();
  const [state, setState] = useState<"idle" | "busy" | "done">("idle");
  const [err, setErr] = useState("");
  const btn = useRef<HTMLButtonElement>(null);

  // The label slides away and a check mark draws itself.
  useEffect(() => {
    const b = btn.current; if (!b || state !== "done" || reduced()) return;
    gsap.fromTo(b.querySelector("[data-done]"), { yPercent: 100, autoAlpha: 0 }, { yPercent: 0, autoAlpha: 1, duration: 0.5, ease: EASE });
    gsap.fromTo(b.querySelector("[data-tick]"), { strokeDashoffset: 1 }, { strokeDashoffset: 0, duration: 0.5, ease: "power2.out", delay: 0.12 });
  }, [state]);

  async function add() {
    if (!signedIn) { location.href = `/login?next=${encodeURIComponent(location.pathname + location.search)}`; return; }
    setState("busy"); setErr("");
    const r = await fetch("/api/store/cart", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(items ? { items } : { kind, refId }) });
    const j = await r.json();
    if (!r.ok) { setErr(j.error || "That couldn't be added. Try again."); setState("idle"); return; }
    setState("done"); pulseCart(); router.refresh();
    setTimeout(() => setState("idle"), 1800);
  }
  return (
    <span className="contents">
      <button ref={btn} className={`${className} relative overflow-hidden`} onClick={add} disabled={disabled || state === "busy"} aria-live="polite">
        {state === "done" ? (
          <span data-done className="flex items-center gap-2">
            <svg viewBox="0 0 24 24" className="h-[18px] w-[18px]" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
              <path data-tick d="m5 12.5 4.5 4.5L19 7.5" pathLength={1} strokeDasharray={1} />
            </svg>
            Added
          </span>
        ) : state === "busy" ? (
          <span className="flex items-center gap-2"><span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />Adding</span>
        ) : label}
      </button>
      {err && <span className="block text-[13px] font-semibold text-bad">{err}</span>}
    </span>
  );
}
