"use client";
import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { EASE, gsap, reduced } from "@/store/lib/motion";
import { IconScan } from "./Icons";
import RevealScope from "./RevealScope";
import type { VerifyResult } from "@/app/api/store/verify/route";

function Stamp({ tone, word }: { tone: "ok" | "warn" | "bad"; word: string }) {
  const c = tone === "ok" ? "rgb(var(--ok))" : tone === "warn" ? "rgb(var(--warn))" : "rgb(var(--bad))";
  return (
    <svg data-stamp viewBox="0 0 120 120" className="h-24 w-24 shrink-0 -rotate-6" aria-hidden>
      <circle data-ring cx="60" cy="60" r="54" fill="none" stroke={c} strokeWidth="5" pathLength={1} strokeDasharray={1} transform="rotate(-90 60 60)" />
      <circle data-ring cx="60" cy="60" r="44" fill="none" stroke={c} strokeWidth="1.5" pathLength={1} strokeDasharray={1} transform="rotate(-90 60 60)" />
      <text x="60" y="68" textAnchor="middle" fontSize={word.length > 6 ? 17 : 22} fill={c} fontFamily="'Dela Gothic One', sans-serif">{word}</text>
      <text x="60" y="34" textAnchor="middle" fontSize="9" fontWeight="800" fill={c} fontFamily="'Hanken Grotesk Variable', sans-serif">TORII</text>
    </svg>
  );
}

export default function Verify({ initialCode, signedIn }: { initialCode: string; signedIn: boolean }) {
  const [code, setCode] = useState(initialCode);
  const [res, setRes] = useState<VerifyResult | null>(null);
  const [busy, setBusy] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [camErr, setCamErr] = useState("");
  const scanner = useRef<{ stop: () => Promise<void>; clear: () => void } | null>(null);
  const ran = useRef(false);
  const out = useRef<HTMLDivElement>(null);

  const check = useCallback(async (c: string) => {
    if (!c.trim()) return;
    setBusy(true); setRes(null);
    const r = await fetch("/api/store/verify", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ code: c }) });
    setRes(await r.json()); setBusy(false);
  }, []);
  useEffect(() => { if (initialCode && !ran.current) { ran.current = true; check(initialCode); } }, [initialCode, check]);
  // The stamp slams down on the result.
  useEffect(() => {
    if (!res || reduced() || !out.current) return;
    const card = out.current.firstElementChild; if (!card) return;
    gsap.timeline({ defaults: { ease: EASE } })
      .fromTo(card, { clipPath: "inset(0% 0% 100% 0%)", y: 12 }, { clipPath: "inset(0% 0% 0% 0%)", y: 0, duration: 0.9, clearProps: "clipPath,transform" })
      .fromTo(card.querySelectorAll("[data-ring]"), { strokeDashoffset: 1 }, { strokeDashoffset: 0, duration: 1.1, ease: "power2.inOut", stagger: 0.1 }, 0.1)
      .from(card.querySelectorAll("[data-stamp] text"), { autoAlpha: 0, duration: 0.6 }, 0.6)
      .from(card.querySelectorAll("[data-body] > *"), { autoAlpha: 0, y: 10, duration: 0.7, stagger: 0.05, clearProps: "transform" }, 0.25);
  }, [res]);

  const stopScan = useCallback(async () => { try { await scanner.current?.stop(); scanner.current?.clear(); } catch {} scanner.current = null; setScanning(false); }, []);
  useEffect(() => () => { stopScan(); }, [stopScan]);
  async function startScan() {
    setCamErr(""); setRes(null); setScanning(true);
    try {
      const { Html5Qrcode } = await import("html5-qrcode");
      const s = new Html5Qrcode("qr-reader");
      scanner.current = s as unknown as { stop: () => Promise<void>; clear: () => void };
      await s.start({ facingMode: "environment" }, { fps: 10, qrbox: { width: 220, height: 220 } }, (text) => { setCode(text); stopScan(); check(text); }, () => {});
    } catch {
      setCamErr("The camera isn't available. Allow camera access, or type the code from the tag."); setScanning(false);
    }
  }

  return (
    <div className="space-y-5">
      <section className="paper-band bleed relative -mt-5 overflow-hidden border-b border-line px-4 pb-6 pt-7 dark:border-line">
        <div className="tone pointer-events-none absolute -inset-y-12 inset-x-0 opacity-60" />
        <div className="relative">
          <h1 className="font-display text-[clamp(30px,9cqw,46px)] leading-none">Is it real?</h1>
          <p className="mt-2 max-w-[34ch] text-[15px] leading-snug">Scan the Torii code on any book, figure box or collab tag. It takes a second.</p>
          <div className={`mt-5 overflow-hidden rounded-panel border border-line bg-black ${scanning ? "" : "hidden"}`}><div id="qr-reader" className="w-full" /></div>
          <div className="mt-4">
            {scanning ? <button className="btn-ghost w-full" onClick={stopScan}>Stop the camera</button>
              : <button className="btn-ink w-full text-[16px]" onClick={startScan}><IconScan /> Scan a code</button>}
          </div>
          {camErr && <p className="mt-2 text-[13px] font-semibold text-bad">{camErr}</p>}
        </div>
      </section>

      <form className="flex gap-2" onSubmit={(e) => { e.preventDefault(); check(code); }}>
        <input className="input font-semibold uppercase tracking-wide" placeholder="Or type the code from the tag" value={code} onChange={(e) => setCode(e.target.value)} aria-label="Code from the tag" />
        <button className="btn-ghost" disabled={busy}>{busy ? "Checking…" : "Check"}</button>
      </form>

      <div ref={out} aria-live="polite">
        {res?.state === "genuine" && (
          <div className="panel flex gap-4 p-4">
            <Stamp tone="ok" word="REAL" />
            <div data-body className="min-w-0 space-y-1 text-[14.5px] leading-snug">
              <p className="text-[18px] font-bold tracking-[-0.02em] leading-tight text-ok">Genuine</p>
              <p className="font-bold">{res.title}{res.editionNo ? `, #${String(res.editionNo).padStart(4, "0")}` : ""}</p>
              <p className="text-muted">Licensed by {res.licensor}{res.manufacturer ? `, made by ${res.manufacturer}` : ""}.</p>
              {res.mine && <p className="font-semibold">It's registered to you and on <Link href="/shelf" className="underline underline-offset-2">your shelf</Link>.</p>}
              {res.needsLogin && <p><Link href={`/login?next=${encodeURIComponent(`/verify?code=${code}`)}`} className="font-bold underline underline-offset-2">Sign in</Link> to register it as yours.</p>}
              <Link href={res.href} className="inline-block pt-1 font-semibold underline underline-offset-2">See the product</Link>
            </div>
          </div>
        )}
        {res?.state === "claimed" && (
          <div className="panel flex gap-4 p-4">
            <Stamp tone="warn" word="COPY?" />
            <div data-body className="min-w-0 space-y-1 text-[14.5px] leading-snug">
              <p className="text-[18px] font-bold tracking-[-0.02em] leading-tight text-warn">Already registered</p>
              <p className="font-bold">{res.title}</p>
              <p>This code was first registered in <b>{res.city}</b> on <b>{res.when}</b>, by someone else.</p>
              <p className="text-muted">If you just bought it new, it's probably a copy wearing a cloned tag. Don't pay for it.</p>
              <Link href={res.href} className="inline-block pt-1 font-semibold underline underline-offset-2">Get the official one</Link>
            </div>
          </div>
        )}
        {res?.state === "collab" && (
          <div className="panel flex gap-4 p-4">
            <Stamp tone="ok" word="REAL" />
            <div data-body className="min-w-0 space-y-1 text-[14.5px] leading-snug">
              <p className="text-[18px] font-bold tracking-[-0.02em] leading-tight text-ok">Official collab</p>
              <p className="font-bold">{res.title}</p>
              <p className="text-muted">A numbered piece from an official {res.property} collaboration, made in India from an approved design.</p>
              <Link href={res.href} className="inline-block pt-1 font-semibold underline underline-offset-2">See who approved it, and its number in the run</Link>
            </div>
          </div>
        )}
        {res?.state === "invalid" && (
          <div className="panel flex gap-4 p-4">
            <Stamp tone="bad" word="FAKE" />
            <div data-body className="min-w-0 space-y-1 text-[14.5px] leading-snug">
              <p className="text-[18px] font-bold tracking-[-0.02em] leading-tight text-bad">Not an official product</p>
              <p>Torii never issued <span className="font-semibold">{res.code || "that code"}</span>. Real codes are signed, so they can't be made up.</p>
            </div>
          </div>
        )}
      </div>
      {!signedIn && !res && <p className="text-center text-[13px] text-muted">Anyone can check a code. Sign in to register things to your shelf.</p>}
      <RevealScope />
    </div>
  );
}
