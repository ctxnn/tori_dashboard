"use client";
import { usePathname, useSearchParams } from "next/navigation";
import { useEffect, useRef } from "react";
import { EASE, gsap } from "@/store/lib/motion";

/** A hairline progress bar across the top while the next screen loads. */
export default function NavProgress() {
  const bar = useRef<HTMLDivElement>(null);
  const path = usePathname(), qs = useSearchParams();
  const running = useRef(false);

  useEffect(() => {
    const start = (e: MouseEvent) => {
      if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey) return;
      const a = (e.target as HTMLElement).closest?.("a[href]") as HTMLAnchorElement | null;
      if (!a || a.target || a.origin !== location.origin) return;
      if (a.pathname + a.search === location.pathname + location.search) return;
      running.current = true;
      gsap.killTweensOf(bar.current);
      gsap.fromTo(bar.current, { scaleX: 0, opacity: 1 }, { scaleX: 0.85, duration: 2.4, ease: "power2.out" });
    };
    document.addEventListener("click", start, true);
    return () => document.removeEventListener("click", start, true);
  }, []);

  useEffect(() => {
    if (!running.current) return;
    running.current = false;
    gsap.killTweensOf(bar.current);
    gsap.timeline().to(bar.current, { scaleX: 1, duration: 0.35, ease: EASE }).to(bar.current, { opacity: 0, duration: 0.4 }, "+=0.05");
  }, [path, qs]);

  return <div ref={bar} aria-hidden className="pointer-events-none app-fixed top-0 z-[60] h-[2.5px] origin-left scale-x-0 bg-[rgb(var(--accent))] opacity-0" style={{ top: "env(safe-area-inset-top)" }} />;
}
