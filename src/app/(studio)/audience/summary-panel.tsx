"use client";

import { useState } from "react";
import { api } from "@/components/client-api";
import { Button } from "@/components/ui";

interface Summary {
  source: "claude" | "offline";
  model?: string;
  note?: string;
  headline: string;
  moves: { title: string; detail: string }[];
}

export function SummaryPanel({ kitId, aiConfigured }: { kitId: string; aiConfigured: boolean }) {
  const [s, setS] = useState<Summary | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function run() {
    setBusy(true);
    setError(null);
    try {
      setS(await api<Summary>("/api/audience/summary", { kitId }));
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="relative overflow-hidden rounded-[var(--radius-card)] bg-ink p-5 text-paper sm:p-6">
      <div className="shippo-dark pointer-events-none absolute inset-0" aria-hidden />
      <div className="relative">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <div className="label text-[10px] text-paper/50">Next moves</div>
            <h3 className="mt-1 text-[18px] font-semibold tracking-[-0.02em]">Three things to do with this</h3>
          </div>
          <Button type="button" variant="accent" size="sm" onClick={run} disabled={busy}>
            {busy ? "Reading the pulse…" : s ? "Ask again" : aiConfigured ? "Summarise with Claude" : "Summarise"}
          </Button>
        </div>
        {error && <p className="mt-3 text-sm text-[#ff9c8c]" role="alert">{error}</p>}
        {!s && !error && <p className="mt-3 max-w-md text-[13px] leading-relaxed text-paper/60">Turns the numbers on this page into three concrete moves — which region to recruit a creator in, which price to test, what to add to the kit. Only aggregates are used; no emails or individual answers.</p>}
        {s && (
          <div className="mt-4" aria-live="polite">
            <p className="font-serif text-[21px] leading-snug text-paper">{s.headline}</p>
            <ol className="mt-4 space-y-3">
              {s.moves.map((m, i) => (
                <li key={i} className="grid grid-cols-[26px_1fr] gap-2">
                  <span className="grid h-6 w-6 place-items-center rounded-full bg-vermilion font-mono text-[11px] font-semibold">{i + 1}</span>
                  <span>
                    <span className="block text-[14px] font-medium">{m.title}</span>
                    <span className="mt-0.5 block text-[13px] leading-relaxed text-paper/65">{m.detail}</span>
                  </span>
                </li>
              ))}
            </ol>
            <p className="label mt-4 text-[9.5px] text-paper/40">{s.source === "claude" ? `Written by ${s.model ?? "Claude"} from the aggregates` : s.note}</p>
          </div>
        )}
      </div>
    </div>
  );
}
