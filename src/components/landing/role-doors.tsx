"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { api } from "@/components/client-api";
import { StageIcon, cx } from "@/components/ui";

export interface Door {
  userId: string;
  name: string;
  role: string;
  org: string;
  stage: number;
  does: string;
  sun: string;
}

/** Four doorways into the demo. Each sun rises as you approach. */
export function RoleDoors({ doors, others, currentId }: { doors: Door[]; others: { userId: string; name: string; role: string }[]; currentId?: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function enter(d: { userId: string }) {
    setBusy(d.userId);
    setError(null);
    try {
      const r = await api<{ home: string }>("/api/session", { userId: d.userId });
      router.push(r.home);
      router.refresh();
    } catch (e) {
      setError((e as Error).message);
      setBusy(null);
    }
  }

  return (
    <section id="enter" aria-labelledby="doors-title" className="scroll-mt-16 pt-28">
      <div className="flex flex-wrap items-end justify-between gap-6 border-b border-ink pb-6">
        <h2 id="doors-title" className="text-[38px] font-semibold leading-[0.98] tracking-[-0.045em] sm:text-[64px]">
          Choose your <span className="font-serif font-normal italic">door.</span>
        </h2>
        <p className="max-w-sm text-[14px] leading-relaxed text-ink-2">
          No passwords in this demo. Each person lands in their own workspace, and the server still enforces what they may do.{" "}
          <Link href="/switch" className="underline decoration-sand-2 underline-offset-2 hover:decoration-ink">All six demo people</Link>
        </p>
      </div>
      <ul className="mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {doors.map((d, i) => (
          <li key={d.userId}>
            <button
              type="button"
              onClick={() => enter(d)}
              disabled={!!busy}
              aria-label={`Enter the demo as ${d.name}, ${d.role}`}
              className="group relative flex h-[340px] w-full flex-col overflow-hidden rounded-[14px] bg-ink p-6 text-left text-paper outline-offset-4 transition-transform duration-500 hover:-translate-y-1 disabled:opacity-70 sm:h-[420px]"
            >
              <div className="grid-paper-dark absolute inset-0 opacity-70" aria-hidden />
              {/* the rising sun */}
              <span
                className="absolute left-1/2 top-full h-[260px] w-[260px] -translate-x-1/2 -translate-y-[38%] rounded-full transition-transform duration-[900ms] ease-[cubic-bezier(0.2,0.75,0.2,1)] group-hover:-translate-y-[78%] group-focus-visible:-translate-y-[78%]"
                style={{ background: `radial-gradient(circle at 50% 35%, ${d.sun}, ${d.sun}cc)` }}
                aria-hidden
              />
              {/* torii silhouette in front of the sun */}
              <svg viewBox="0 0 32 32" className="absolute bottom-0 left-1/2 h-[150px] w-[150px] -translate-x-1/2 fill-ink" aria-hidden>
                <path d="M1.5 5.2 Q16 9.6 30.5 5.2 L29.6 8.6 Q16 11.6 2.4 8.6 Z" />
                <rect x="4.6" y="13" width="22.8" height="2.4" rx="0.4" />
                <rect x="7.6" y="9.6" width="2.8" height="22.4" rx="0.4" />
                <rect x="21.6" y="9.6" width="2.8" height="22.4" rx="0.4" />
                <rect x="14.8" y="10.4" width="2.4" height="2.8" />
              </svg>
              <span className="relative flex items-start justify-between">
                <StageIcon n={d.stage} className="h-14 w-14 text-paper" strokeWidth={1.3} />
                <span className="label text-[10px] text-paper/45">Door 0{i + 1}</span>
              </span>
              <span className="relative mt-6">
                <span className="label block text-[10px]" style={{ color: d.sun }}>{d.role}</span>
                <span className="mt-2 block text-[24px] font-semibold leading-tight tracking-[-0.03em]">{d.name}</span>
                <span className="mt-1 block text-[13px] text-paper/55">{d.org}</span>
                <span className="mt-4 block max-w-[240px] text-[13.5px] leading-snug text-paper/75">{d.does}</span>
              </span>
              <span className="relative mt-auto flex items-center gap-2 self-start rounded-full bg-paper px-4 py-2 text-[13px] font-medium text-ink opacity-0 transition-all duration-500 group-hover:opacity-100 group-focus-visible:opacity-100 max-lg:opacity-100">
                {busy === d.userId ? "Opening…" : d.userId === currentId ? "Continue" : "Enter"}
                <svg viewBox="0 0 16 16" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden><path d="M2 8h11M9 4l4 4-4 4" strokeLinecap="round" strokeLinejoin="round" /></svg>
              </span>
            </button>
          </li>
        ))}
      </ul>
      {others.length > 0 && (
        <div className="mt-4 flex flex-wrap items-center gap-x-5 gap-y-2 text-[13px] text-moss">
          <span className="label text-[10px]">Also in the demo</span>
          {others.map((o) => (
            <button
              key={o.userId}
              type="button"
              onClick={() => enter(o)}
              disabled={!!busy}
              aria-label={`Enter the demo as ${o.name}, ${o.role}`}
              className={cx("group flex items-center gap-1.5 font-medium text-ink hover:text-vermilion", o.userId === currentId && "text-vermilion")}
            >
              {busy === o.userId ? "Opening…" : o.name}
              <span className="font-normal text-moss">· {o.role}</span>
            </button>
          ))}
        </div>
      )}
      {error && <p className="mt-3 text-sm text-fail" role="alert">{error}</p>}
    </section>
  );
}
