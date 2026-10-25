"use client";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { SplitText } from "gsap/SplitText";

if (typeof window !== "undefined") gsap.registerPlugin(ScrollTrigger, SplitText);
export { gsap, ScrollTrigger, SplitText };

/** One easing language for the whole app: long, decelerating curves. No overshoot, no bounce. */
export const EASE = "expo.out";
export const EASE_IN = "power3.in";
export const reduced = () => typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
export const finePointer = () => typeof window !== "undefined" && window.matchMedia("(hover: hover) and (pointer: fine)").matches;

/** A quiet acknowledgement on the cart icon after something is added. */
export function pulseCart() {
  const target = document.querySelector<HTMLElement>("[data-cart-icon]");
  if (!target || reduced()) return;
  const ring = document.createElement("span");
  ring.className = "pointer-events-none absolute inset-1 rounded-full border-2 border-[rgb(var(--accent))]";
  target.appendChild(ring);
  gsap.fromTo(ring, { scale: 0.6, opacity: 0.9 }, { scale: 1.6, opacity: 0, duration: 0.8, ease: "power2.out", onComplete: () => ring.remove() });
}

/**
 * Scroll-driven reveals, declared in markup:
 *   data-reveal            fade and rise
 *   data-reveal="lines"    split into lines that rise from behind a mask
 *   data-reveal="stagger"  children cascade in
 *   data-reveal="clip"     image opens with a clip-path wipe
 *   data-parallax="-40"    drifts by N px while scrolling past
 *   data-count             number counts up
 * Anything already on screen when the page opens is left alone (the page transition covers it),
 * so nothing ever flashes or gets stuck hidden.
 */
let focusWired = false;
export function setupReveals(root: ParentNode = document) {
  if (!focusWired && typeof document !== "undefined") {
    focusWired = true;
    document.addEventListener("focusin", (e) => {
      const el = (e.target as HTMLElement).closest?.("[data-reveal] > *, [data-reveal]") as HTMLElement | null;
      if (el && Number(getComputedStyle(el).opacity) < 1) gsap.to(el, { opacity: 1, y: 0, duration: 0.4, ease: EASE, overwrite: true, clearProps: "transform" });
    });
  }
  const vh = window.innerHeight;
  const below = (el: Element) => el.getBoundingClientRect().top > vh * 0.92;
  root.querySelectorAll<HTMLElement>("[data-reveal]:not([data-rv])").forEach((el) => {
    el.dataset.rv = "1";
    const kind = el.dataset.reveal || "up";
    const st = { trigger: el, start: "top 90%", once: true };
    if (kind === "lines") {
      if (!below(el)) return;
      const split = SplitText.create(el, { type: "lines", mask: "lines", linesClass: "rv-line" });
      gsap.from(split.lines, { yPercent: 105, duration: 1.1, ease: EASE, stagger: 0.08, scrollTrigger: st, onComplete: () => split.revert() });
    } else if (kind === "stagger") {
      const kids = Array.from(el.children).filter((k) => below(k));
      if (!kids.length) return;
      gsap.set(kids, { opacity: 0, y: 28 });
      ScrollTrigger.batch(kids, { start: "top 92%", once: true, onEnter: (b) => gsap.to(b, { opacity: 1, y: 0, duration: 0.9, ease: EASE, stagger: 0.06, overwrite: true, clearProps: "transform" }) });
    } else if (kind === "clip") {
      if (!below(el)) return;
      gsap.fromTo(el, { clipPath: "inset(0% 0% 100% 0%)" }, { clipPath: "inset(0% 0% 0% 0%)", duration: 1.2, ease: EASE, scrollTrigger: st, clearProps: "clipPath" });
      const inner = el.firstElementChild; if (inner) gsap.from(inner, { scale: 1.12, duration: 1.6, ease: EASE, scrollTrigger: st });
    } else {
      if (!below(el)) return;
      gsap.from(el, { opacity: 0, y: 32, duration: 1, ease: EASE, scrollTrigger: st, clearProps: "transform" });
    }
  });
  root.querySelectorAll<HTMLElement>("[data-parallax]:not([data-rv])").forEach((el) => {
    el.dataset.rv = "1";
    gsap.to(el, { y: Number(el.dataset.parallax) || -40, ease: "none", scrollTrigger: { trigger: el.closest("section") || el, start: "top top", end: "bottom top", scrub: 0.6 } });
  });
  root.querySelectorAll<HTMLElement>("[data-count]:not([data-rv])").forEach((el) => {
    el.dataset.rv = "1";
    const raw = el.textContent || ""; const m = raw.match(/[\d,]+/); if (!m) { el.style.visibility = "visible"; return; }
    const target = Number(m[0].replace(/,/g, "")), pre = raw.slice(0, m.index), post = raw.slice((m.index || 0) + m[0].length);
    const o = { v: 0 };
    el.textContent = pre + "0" + post; el.style.visibility = "visible";
    gsap.to(o, { v: target, duration: 1.4, ease: "power3.out", scrollTrigger: below(el) ? { trigger: el, start: "top 92%", once: true } : undefined,
      onUpdate: () => { el.textContent = pre + Math.round(o.v).toLocaleString("en-IN") + post; } });
  });
}

/** After filtering, bring every card in a revealed grid back on screen (scroll triggers were measured for the old layout). */
export function settleGrid(grid: HTMLElement | null) {
  if (!grid) return;
  const hidden = Array.from(grid.children).filter((k) => Number(getComputedStyle(k).opacity) < 1);
  ScrollTrigger.getAll().forEach((t) => { if (t.trigger && grid.contains(t.trigger as Node)) t.kill(); });
  if (hidden.length) gsap.to(hidden, { opacity: 1, y: 0, duration: reduced() ? 0 : 0.6, ease: EASE, stagger: 0.03, overwrite: true, clearProps: "transform" });
  ScrollTrigger.refresh();
}
