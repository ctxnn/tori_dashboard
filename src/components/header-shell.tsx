"use client";

import { usePathname } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";

/** Sticky header that turns ink while a dark band ([data-dark-band]) sits beneath it. */
export function HeaderShell({ children }: { children: ReactNode }) {
  const path = usePathname();
  const [dark, setDark] = useState(path === "/");

  useEffect(() => {
    const check = () => {
      const edge = (document.querySelector("header[data-tone]")?.getBoundingClientRect().bottom ?? 56) + 2;
      let over = false;
      document.querySelectorAll<HTMLElement>("[data-dark-band]").forEach((b) => {
        const r = b.getBoundingClientRect();
        if (r.top <= edge && r.bottom >= edge) over = true;
      });
      setDark(over);
    };
    check();
    window.addEventListener("scroll", check, { passive: true });
    window.addEventListener("resize", check);
    return () => {
      window.removeEventListener("scroll", check);
      window.removeEventListener("resize", check);
    };
  }, [path]);

  return (
    <header
      data-tone={dark ? "dark" : "light"}
      className="group/header sticky top-0 z-30 border-b backdrop-blur-md transition-colors duration-300 data-[tone=dark]:border-paper/10 data-[tone=dark]:bg-ink data-[tone=light]:border-sand data-[tone=light]:bg-paper/85"
    >
      {children}
    </header>
  );
}
