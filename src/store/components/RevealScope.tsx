"use client";
import { useEffect } from "react";
import { gsap, reduced, ScrollTrigger, setupReveals } from "@/store/lib/motion";

/** Placed at the end of a page: wires up that page's scroll reveals once it has hydrated. */
export default function RevealScope() {
  useEffect(() => {
    if (reduced()) { document.querySelectorAll<HTMLElement>("[data-count]").forEach((el) => (el.style.visibility = "visible")); return; }
    let ctx: gsap.Context | undefined;
    const raf = requestAnimationFrame(() => { ctx = gsap.context(() => setupReveals(document)); ScrollTrigger.refresh(); });
    return () => { cancelAnimationFrame(raf); ctx?.revert(); document.querySelectorAll("[data-rv]").forEach((el) => el.removeAttribute("data-rv")); };
  }, []);
  return null;
}
