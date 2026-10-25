"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import { useGSAP } from "@gsap/react";
import { EASE, gsap, reduced } from "@/store/lib/motion";
import PayButton from "./PayButton";
import { Cover } from "./Art";
import { IconBack, IconLock } from "./Icons";

gsap.registerPlugin(useGSAP);
export default function UnlockGate({ slug, title, chapter, chapterId, lang, price, signedIn, wallet, color }:
  { slug: string; title: string; chapter: number; chapterId: string; lang: string; price: number; signedIn: boolean; wallet: number; color: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const root = useRef<HTMLDivElement>(null);
  const here = `/read/${slug}/${chapter}?lang=${lang}`;
  useGSAP(() => { if (!reduced()) gsap.timeline({ defaults: { ease: EASE } }).from("[data-art]", { clipPath: "inset(100% 0% 0% 0%)", duration: 1.1 }).from("[data-lock]", { scale: 0.6, autoAlpha: 0, duration: 0.8 }, 0.35).from("[data-copy] > *", { autoAlpha: 0, y: 14, duration: 0.8, stagger: 0.06, clearProps: "transform" }, 0.45); }, { scope: root });

  // Shackle pops open, then the chapter loads.
  const celebrate = () => new Promise<void>((res) => {
    if (reduced() || !root.current) return res();
    gsap.timeline({ onComplete: res })
      .to("[data-shackle]", { y: -5, rotate: -18, transformOrigin: "80% 100%", duration: 0.45, ease: "power3.out" })
      .to("[data-lock]", { scale: 0.85, autoAlpha: 0, filter: "blur(6px)", duration: 0.45, ease: "power3.in" }, "+=0.1")
      .to("[data-art]", { filter: "blur(0px)", duration: 0.5, ease: "power2.out" }, "<");
  });
  async function useWallet() {
    setBusy(true); setErr("");
    const r = await fetch("/api/store/wallet/unlock", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ chapterId }) });
    const j = await r.json();
    if (!r.ok) { setErr(j.error || "Couldn't unlock this chapter. Try again."); setBusy(false); return; }
    await celebrate(); router.refresh();
  }
  return (
    <div ref={root} data-section="read" className="min-h-screen bg-bg">
      <div className="paper-band border-b border-line" style={{ paddingTop: "env(safe-area-inset-top)" }}>
        <div className="mx-auto flex h-[58px] max-w-3xl items-center gap-2 px-2">
          <Link href={`/read/${slug}?lang=${lang}`} className="flex h-11 w-11 items-center justify-center" aria-label="Back to chapters"><IconBack /></Link>
          <div className="truncate font-bold">{title}, chapter {chapter}</div>
        </div>
      </div>
      <div className="mx-auto max-w-sm px-4 pt-10 text-center">
        <div className="relative mx-auto w-36">
          <div data-art className="opacity-90 blur-[2px]"><Cover title={title} color={color} vol={chapter} size="md" /></div>
          <div data-lock className="absolute inset-0 m-auto flex h-20 w-20 items-center justify-center rounded-full bg-accent text-white shadow-panel ring-4 ring-white/40">
            <svg viewBox="0 0 24 24" className="h-10 w-10" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round"><rect x="4.5" y="11" width="15" height="10" rx="2" fill="currentColor" stroke="none" /><path data-shackle d="M8 11V7a4 4 0 0 1 8 0v4" /></svg>
          </div>
        </div>
        <div data-copy><h1 className="h-title mt-7">Unlock chapter {chapter}</h1>
        <p className="mx-auto mt-2 max-w-[30ch] text-[15px] leading-snug text-muted">₹{price}, once. It stays yours in every language, and the money goes to the people who made it.</p>
        <div className="mt-7 space-y-2.5">
          {!signedIn ? (
            <Link href={`/login?next=${encodeURIComponent(here)}`} className="btn-primary w-full">Sign in to unlock</Link>
          ) : (
            <>
              {wallet >= price && <button className="btn-primary w-full text-[16px]" onClick={useWallet} disabled={busy}>{busy ? "Unlocking…" : `Unlock with wallet, ₹${price}`}</button>}
              <PayButton purpose="unlock" payload={{ chapterId }} className={wallet >= price ? "btn-ghost w-full" : "btn-primary w-full text-[16px]"} onSuccess={async () => { await celebrate(); router.refresh(); }}>
                Pay ₹{price} with UPI
              </PayButton>
              <p className="pt-1 text-[13px] text-muted">Wallet balance ₹{wallet.toLocaleString("en-IN")}. <Link href="/account" className="font-semibold text-fg underline underline-offset-2">Add money</Link></p>
            </>
          )}
          {err && <p className="text-[13px] font-semibold text-bad">{err}</p>}
        </div></div>
      </div>
    </div>
  );
}
