"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { api } from "@/components/client-api";
import { StageIcon } from "@/components/ui";

export interface V2Door {
  userId: string;
  name: string;
  role: string;
  org: string;
  stage: number;
  does: string;
  sees: string[];
  tint: "pink" | "green" | "yellow" | "blue";
}

/** The demo's way in, as heyclicky's plans: window cards floating on a sky. */
export function V2Doors({ doors, others, currentId }: { doors: V2Door[]; others: { userId: string; name: string; role: string }[]; currentId?: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function enter(userId: string) {
    setBusy(userId);
    setError(null);
    try {
      const r = await api<{ home: string }>("/api/session", { userId });
      router.push(r.home);
      router.refresh();
    } catch (e) {
      setError((e as Error).message);
      setBusy(null);
    }
  }

  return (
    <section id="enter" aria-labelledby="doors-title" className="sky bleed relative mt-28 scroll-mt-16 overflow-hidden py-20 sm:py-24">
      <div className="mx-auto max-w-7xl px-4 sm:px-6">
        <div className="text-center">
          <h2 id="doors-title" className="text-[34px] leading-[1.05] text-white [text-shadow:0_2px_12px_rgba(20,60,140,0.35)] sm:text-[48px]">
            torii, your way
          </h2>
          <p className="mt-3 text-[17px] tracking-[-0.02em] text-white/90">four people, four workspaces. no passwords; the server still checks what each may do.</p>
        </div>
        <ul className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {doors.map((d) => (
            <li key={d.userId} className="win flex flex-col !border-black/20 bg-white/90 backdrop-blur">
              <div className="win-bar" data-tint={d.tint}>
                <i />
                <i />
                <i />
              </div>
              <div className="flex flex-1 flex-col p-5">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h3 className="text-[24px] leading-tight">{d.role.toLowerCase()}</h3>
                    <p className="mt-1 text-[13.5px] text-black/55">
                      {d.name} · {d.org}
                    </p>
                  </div>
                  <StageIcon n={d.stage} className="h-8 w-8 text-black/70" strokeWidth={1.4} />
                </div>
                <p className="mt-4 text-[14.5px] leading-snug tracking-[-0.01em] lg:min-h-[3.9em]">{d.does}</p>
                <button
                  type="button"
                  onClick={() => enter(d.userId)}
                  disabled={!!busy}
                  className="gel gel-blue mt-5 inline-flex h-10 items-center justify-center px-5 text-[15px] disabled:opacity-60"
                  aria-label={`Enter the demo as ${d.name}, ${d.role}`}
                >
                  {busy === d.userId ? "opening…" : d.userId === currentId ? "continue" : `enter as ${d.name.split(" ")[0]}`}
                </button>
                <div className="mt-5 border-t border-dashed border-black/15 pt-4">
                  <div className="text-[12.5px] text-black/50">you’ll see</div>
                  <ul className="mt-2 space-y-1.5">
                    {d.sees.map((s) => (
                      <li key={s} className="flex items-start gap-2 text-[13.5px] tracking-[-0.01em]">
                        <svg viewBox="0 0 16 16" className="mt-0.5 h-4 w-4 shrink-0" aria-hidden>
                          <circle cx="8" cy="8" r="7.5" fill="#0c0c0f" />
                          <path d="M4.8 8.2l2.1 2.1 4.3-4.6" fill="none" stroke="#fff" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                        {s}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </li>
          ))}
        </ul>
        <div className="mt-8 flex flex-wrap items-center justify-center gap-2 text-[13.5px]">
          <span className="font-medium text-white [text-shadow:0_1px_6px_rgba(20,60,140,0.45)]">also in the demo:</span>
          {others.map((o) => (
            <button
              key={o.userId}
              type="button"
              onClick={() => enter(o.userId)}
              disabled={!!busy}
              className="rounded-full bg-white/85 px-3 py-1 font-medium text-ink shadow-[0_4px_12px_-4px_rgba(20,60,140,0.4)] backdrop-blur transition-colors hover:bg-white"
              aria-label={`Enter the demo as ${o.name}, ${o.role}`}
            >
              {busy === o.userId ? "opening…" : o.name} <span className="font-normal text-black/50">· {o.role.toLowerCase()}</span>
            </button>
          ))}
          <Link href="/switch" className="rounded-full px-3 py-1 font-medium text-white underline-offset-2 [text-shadow:0_1px_6px_rgba(20,60,140,0.45)] hover:underline">
            all demo people →
          </Link>
        </div>
        {error && (
          <p className="mt-4 text-center text-sm font-medium text-white" role="alert">
            {error}
          </p>
        )}
      </div>
    </section>
  );
}
