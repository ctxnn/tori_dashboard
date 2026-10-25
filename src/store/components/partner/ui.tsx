import Link from "next/link";
import { STATUS } from "@/store/lib/partner";
import type { ReviewStatus } from "@/store/lib/types";
import type { ChapterState } from "@/store/lib/partner";
import { Torii } from "../Icons";

const TONE = {
  muted: "bg-fg/[.04] text-muted ring-fg/10",
  info: "bg-[rgb(38_70_220/.08)] text-[rgb(38_70_220)] ring-[rgb(38_70_220/.25)] dark:text-[rgb(140_160_255)]",
  warn: "bg-warn/10 text-warn ring-warn/30",
  ok: "bg-ok/10 text-ok ring-ok/30",
  bad: "bg-bad/10 text-bad ring-bad/30",
} as const;

export function StatusPill({ status, ja = true }: { status: ReviewStatus; ja?: boolean }) {
  const s = STATUS[status];
  return (
    <span className={`pill ${TONE[s.tone]}`}>
      <span aria-hidden className="h-1.5 w-1.5 rounded-full bg-current" />
      {s.label}{ja && <span className="jp font-normal opacity-70">{s.ja}</span>}
    </span>
  );
}

const CH: Record<ChapterState, { label: string; tone: keyof typeof TONE }> = {
  draft: { label: "Draft", tone: "muted" }, ready: { label: "Ready", tone: "info" }, scheduled: { label: "Scheduled", tone: "warn" }, live: { label: "Live", tone: "ok" },
};
export function ChapterPill({ state }: { state: ChapterState }) {
  return <span className={`pill ${TONE[CH[state].tone]}`}>{CH[state].label}</span>;
}

/** An English heading with its Japanese label underneath, for the Japanese publishers using the portal. */
export function PageHead({ en, ja, sub, children }: { en: string; ja: string; sub?: React.ReactNode; children?: React.ReactNode }) {
  return (
    <div className="mb-7 flex flex-wrap items-end gap-4">
      <div className="mr-auto min-w-0">
        <div className="jp text-[13px] font-medium tracking-[.08em] text-accent">{ja}</div>
        <h1 className="mt-1 font-display text-[clamp(26px,3.2vw,36px)] leading-[1.05]">{en}</h1>
        {sub && <p className="mt-2 max-w-2xl text-[15px] leading-relaxed text-muted">{sub}</p>}
      </div>
      {children && <div className="flex flex-wrap gap-2">{children}</div>}
    </div>
  );
}

export function Card({ title, ja, children, className = "", action }: { title?: string; ja?: string; children: React.ReactNode; className?: string; action?: React.ReactNode }) {
  return (
    <section className={`card p-5 sm:p-6 ${className}`}>
      {title && (
        <div className="mb-4 flex items-baseline gap-2">
          <h2 className="text-[17px] font-bold tracking-[-0.02em]">{title}</h2>
          {ja && <span className="jp text-[12.5px] text-muted">{ja}</span>}
          {action && <div className="ml-auto">{action}</div>}
        </div>
      )}
      {children}
    </section>
  );
}

export function Stat({ label, value, sub, strong }: { label: string; value: string; sub?: string; strong?: boolean }) {
  return (
    <div className={strong ? "panel paper-band p-4" : "card p-4"}>
      <div className="label">{label}</div>
      <div className="price mt-1.5 text-[26px] leading-none">{value}</div>
      {sub && <div className="mt-1.5 text-[12.5px] text-muted">{sub}</div>}
    </div>
  );
}

export function Brand({ href = "/partner", sub = true }: { href?: string; sub?: boolean }) {
  return (
    <Link href={href} className="group flex items-center gap-2.5" aria-label="Torii Partner Portal home">
      <span className="flex h-9 w-9 items-center justify-center rounded-[10px] bg-[rgb(222,0,52)] text-white shadow-panel-sm transition-transform duration-500 ease-out group-hover:scale-105"><Torii className="h-5 w-5" /></span>
      <span className="leading-none">
        <span className="block font-display text-[19px]">Torii</span>
        {sub && <span className="mt-0.5 block text-[11.5px] font-semibold tracking-[.02em] opacity-70">Partner Portal <span className="jp font-normal">パートナー</span></span>}
      </span>
    </Link>
  );
}

export const inr = (n: number) => "₹" + Math.round(n).toLocaleString("en-IN");
