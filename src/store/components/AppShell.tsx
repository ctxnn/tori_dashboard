"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { APP_NAME, SECTIONS, type SectionKey } from "@/store/lib/config";
import { EASE, gsap, reduced } from "@/store/lib/motion";
import { IconBook, IconCart, IconFigure, IconScan, IconShelf, IconStack, IconTee, IconUser, Torii } from "./Icons";

export function sectionFor(path: string): SectionKey {
  if (path.startsWith("/read")) return "read";
  if (path.startsWith("/manga")) return "manga";
  if (path.startsWith("/figures")) return "figures";
  if (path.startsWith("/collabs")) return "collabs";
  if (path.startsWith("/account") || path.startsWith("/publisher") || path.startsWith("/login")) return "account";
  return "shelf";
}

const NAV: { href: string; key: SectionKey; label: string; Icon: (p: { className?: string }) => React.JSX.Element }[] = [
  { href: "/read", key: "read", label: "Read", Icon: IconBook },
  { href: "/manga", key: "manga", label: "Manga", Icon: IconStack },
  { href: "/figures", key: "figures", label: "Figures", Icon: IconFigure },
  { href: "/collabs", key: "collabs", label: "Collabs", Icon: IconTee },
  { href: "/shelf", key: "shelf", label: "Shelf", Icon: IconShelf },
];
const useIso = typeof window === "undefined" ? useEffect : useLayoutEffect;

export default function AppShell({ children, signedIn, cartCount, wallet, credit = false }: { children: React.ReactNode; signedIn: boolean; cartCount: number; wallet: number; credit?: boolean }) {
  const path = usePathname() || "/";
  const section = sectionFor(path);
  const isReader = /^\/read\/[^/]+\/\d+/.test(path);
  const isPublisher = path.startsWith("/publisher");
  const navRef = useRef<HTMLDivElement>(null);
  const pillRef = useRef<HTMLSpanElement>(null);
  const [scrolled, setScrolled] = useState(false);
  const shared = path.startsWith("/cart") || path.startsWith("/checkout") || path.startsWith("/store/orders") || path.startsWith("/verify");
  const activeKey = shared ? null : section;
  const tag = path.startsWith("/cart") || path.startsWith("/checkout") ? "Cart" : path.startsWith("/store/orders") ? "Orders" : path.startsWith("/verify") ? "Verify" : isPublisher ? "Publisher" : SECTIONS[section].label;

  useIso(() => {
    const nav = navRef.current, pill = pillRef.current;
    if (!nav || !pill) return;
    const el = nav.querySelector<HTMLElement>(`[data-key="${activeKey}"]`);
    if (!el) { gsap.to(pill, { autoAlpha: 0, scale: 0.9, duration: 0.3, ease: EASE }); return; }
    const x = el.offsetLeft, w = el.offsetWidth;
    if (reduced() || pill.dataset.ready !== "1") { gsap.set(pill, { x, width: w, autoAlpha: 1, scale: 1 }); pill.dataset.ready = "1"; return; }
    gsap.to(pill, { x, width: w, autoAlpha: 1, scale: 1, duration: 0.7, ease: EASE });
  }, [activeKey]);

  useEffect(() => {
    const on = () => setScrolled(window.scrollY > 8);
    on(); window.addEventListener("scroll", on, { passive: true });
    return () => window.removeEventListener("scroll", on);
  }, []);

  // The Partner Portal (for publishers) is a desktop tool with its own layout.
  if (path.startsWith("/partner")) return <>{children}</>;
  if (isReader) return <div data-section="read" className="app-col"><div key={path} className="animate-page-in">{children}</div></div>;

  return (
    <div data-section={section} className="app-col">
      <header className={`sticky top-0 z-30 border-b transition-[background-color,border-color,box-shadow] duration-500 ease-out bg-[rgb(var(--paper))] ${scrolled ? "border-line shadow-[0_8px_24px_-18px_rgb(var(--ink)/.5)]" : "border-transparent"}`} style={{ paddingTop: "env(safe-area-inset-top)" }}>
        <div className={`flex items-center gap-2.5 px-4 transition-[height] duration-500 ease-out ${scrolled ? "h-[52px]" : "h-[60px]"}`}>
          <Link href="/read" className="group flex items-center gap-2 text-fg" aria-label={`${APP_NAME} home`}>
            <span className="flex h-8 w-8 items-center justify-center rounded-[9px] bg-[rgb(222,0,52)] text-white shadow-panel-sm transition-transform duration-500 ease-out group-hover:scale-105"><Torii className="h-[18px] w-[18px]" /></span>
            <span className="font-display text-[19px] leading-none">{APP_NAME}</span>
          </Link>
          <span key={tag} className="animate-fade-in rounded-full bg-card/70 px-2.5 py-0.5 text-[12.5px] font-semibold text-fg ring-1 ring-inset ring-fg/10" aria-label={`Section: ${tag}`}>{tag}</span>
          <div className="ml-auto flex items-center gap-0.5">
            {signedIn && (
              <Link href="/account" className="mr-1 hidden rounded-full bg-card/70 px-3 py-1 text-[13px] font-semibold tabular-nums ring-1 ring-inset ring-fg/10 transition hover:bg-card " title="Wallet balance">
                Wallet ₹{wallet.toLocaleString("en-IN")}
              </Link>
            )}
            <Link href="/verify" className="flex h-11 w-11 items-center justify-center rounded-full transition-colors duration-300 hover:bg-card/70" aria-label="Verify a product"><IconScan /></Link>
            <Link href="/cart" data-cart-icon className="relative flex h-11 w-11 items-center justify-center rounded-full transition-colors duration-300 hover:bg-card/70" aria-label={`Cart, ${cartCount} items`}>
              <IconCart />
              {cartCount > 0 && (
                <span className="absolute right-1 top-1 flex h-[18px] min-w-[18px] items-center justify-center overflow-hidden rounded-full bg-[rgb(222,0,52)] px-1 text-[10.5px] font-bold tabular-nums text-white ring-2 ring-[rgb(var(--paper))]">
                  <span key={cartCount} className="animate-badge-in">{cartCount}</span>
                </span>
              )}
            </Link>
            <Link href="/account" aria-current={section === "account" ? "page" : undefined} className={`flex h-11 w-11 items-center justify-center rounded-full transition-colors duration-300 hover:bg-card/70 ${section === "account" ? "bg-card/70" : ""}`} aria-label="Your account"><IconUser /></Link>
          </div>
        </div>
      </header>
      <main className="px-4 pb-32 pt-5"><div key={path} className="animate-page-in">{children}</div>
        {credit && <p className="mt-10 text-center text-[11.5px] leading-relaxed text-muted">Covers, banners, synopses and character art from <a href="https://anilist.co" className="underline underline-offset-2">AniList</a>; trailers play from YouTube. Artwork © its publishers and studios. Shown for demonstration only.</p>}
      </main>
      {(
        <nav className="app-fixed bottom-0 z-30 px-3" style={{ paddingBottom: "max(12px, env(safe-area-inset-bottom))" }} aria-label="Sections">
          <div ref={navRef} className="relative mx-auto grid max-w-md grid-cols-5 rounded-[22px] bg-ink p-1.5 shadow-lift ring-1 ring-white/10 dark:bg-card">
            <span ref={pillRef} aria-hidden className="absolute left-0 top-1.5 h-[calc(100%-12px)] rounded-[16px] bg-[rgb(var(--paper))] opacity-0 shadow-[inset_0_1px_0_rgb(255_255_255/.5)]" />
            {NAV.map(({ href, key, label, Icon }) => {
              const on = activeKey === key;
              return (
                <Link key={key} href={href} data-key={key} data-section={key} aria-current={on ? "page" : undefined}
                  className={`relative z-10 flex flex-col items-center gap-0.5 rounded-[16px] py-1.5 text-[11.5px] font-semibold transition-colors duration-500 ease-out ${on ? "text-fg" : "text-white/55 hover:text-white/90"}`}>
                  <Icon className="h-[21px] w-[21px]" />
                  {label}
                </Link>
              );
            })}
          </div>
        </nav>
      )}
    </div>
  );
}
