"use client";

import { formatINR } from "@/lib/money";
import { useCountUp, useInView } from "./use-motion";

interface Stats {
  orders: number;
  capturedMinor: number;
  duplicates: number;
  paidTwice: number;
  refunds: number;
}

function Figure({ value, format, label, note, accent, active }: { value: number; format?: (n: number) => string; label: string; note: string; accent?: boolean; active: boolean }) {
  const n = useCountUp(value, active);
  return (
    <div className="group relative border-t border-ink pt-5">
      <div className={`text-[56px] font-semibold leading-[0.9] tracking-[-0.055em] tabular-nums sm:text-[72px] ${accent ? "text-vermilion" : "text-ink"}`}>{format ? format(n) : n.toLocaleString("en-IN")}</div>
      <div className="mt-4 text-[15px] font-medium text-ink">{label}</div>
      <div className="label mt-1.5 text-[10.5px] text-moss">{note}</div>
    </div>
  );
}

export function LiveStats({ stats }: { stats: Stats }) {
  const [ref, seen] = useInView<HTMLDivElement>(0.3);
  return (
    <section aria-labelledby="live-figures" className="pt-24">
      <div className="mb-10 flex flex-wrap items-end justify-between gap-4">
        <h2 id="live-figures" className="max-w-xl text-[30px] font-semibold leading-[1.02] sm:text-[44px]">
          Not a mock-up. <span className="font-serif font-normal italic text-moss">A working ledger.</span>
        </h2>
        <div className="max-w-xs text-right">
          <p className="label text-[10.5px] text-moss">Counted live from this demo’s database · simulated test-mode money</p>
          <a href="/proof" className="group mt-3 inline-flex items-center gap-1.5 text-sm font-medium text-ink">
            See the full proof
            <svg viewBox="0 0 16 16" className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden><path d="M2 8h11M9 4l4 4-4 4" strokeLinecap="round" strokeLinejoin="round" /></svg>
          </a>
        </div>
      </div>
      <div ref={ref} className="grid gap-x-8 gap-y-12 sm:grid-cols-2 lg:grid-cols-4">
        <Figure active={seen} value={stats.orders} label="Paid preorders" note="Each tied to one approved version" />
        <Figure active={seen} value={Math.round(stats.capturedMinor / 100)} format={(n) => formatINR(n * 100)} label="Collected in test mode" note={`${stats.refunds} refunds reconciled`} />
        <Figure active={seen} value={stats.duplicates} label="Duplicate payment events" note="Recognised and ignored" />
        <Figure active={seen} value={stats.paidTwice} label="Orders charged twice" note="Checked against the ledger, right now" accent />
      </div>
    </section>
  );
}
