"use client";

import { useRef, useState, type ReactNode } from "react";
import { cx } from "@/components/ui";
import { fmtHours } from "@/lib/format";

/** Tooltip that follows the pointer within a chart. */
function useTip() {
  const box = useRef<HTMLDivElement>(null);
  const [tip, setTip] = useState<{ x: number; y: number; content: ReactNode } | null>(null);
  const show = (e: React.PointerEvent | React.FocusEvent, content: ReactNode) => {
    const r = box.current?.getBoundingClientRect();
    if (!r) return;
    const t = "clientX" in e ? { x: e.clientX - r.left, y: e.clientY - r.top } : (() => {
      const el = (e.target as Element).getBoundingClientRect();
      return { x: el.left - r.left + el.width / 2, y: el.top - r.top };
    })();
    setTip({ ...t, content });
  };
  const node = tip && (
    <div
      className="pointer-events-none absolute z-10 w-max max-w-[240px] -translate-x-1/2 -translate-y-[calc(100%+12px)] rounded-md bg-ink px-3 py-2 text-[12px] leading-snug text-paper shadow-lg"
      style={{ left: tip.x, top: tip.y }}
      role="status"
    >
      {tip.content}
    </div>
  );
  return { box, show, hide: () => setTip(null), node };
}

const DECISION = {
  approved: { label: "Approved", bar: "bg-ok", icon: "✓" },
  changes_requested: { label: "Changes requested", bar: "bg-warn", icon: "!" },
  rejected: { label: "Rejected", bar: "bg-fail", icon: "✕" },
} as const;

export function DecisionBars({ rows, target }: { rows: { title: string; versionNo: number; decision: keyof typeof DECISION; reviewer: string; hours: number }[]; target: number }) {
  const { box, show, hide, node } = useTip();
  const max = Math.max(target * 1.3, ...rows.map((r) => r.hours));
  const pct = (h: number) => `${Math.max(1.5, (h / max) * 100)}%`;
  return (
    <div ref={box} className="relative">
      <div className="mb-3 flex flex-wrap gap-x-5 gap-y-1 text-[12px] text-ink-2" aria-hidden>
        {Object.values(DECISION).map((d) => (
          <span key={d.label} className="flex items-center gap-1.5">
            <span className={cx("grid h-3.5 w-3.5 place-items-center rounded-[3px] text-[9px] font-bold text-white", d.bar)}>{d.icon}</span>
            {d.label}
          </span>
        ))}
      </div>
      <div className="grid grid-cols-[minmax(0,110px)_1fr] sm:grid-cols-[minmax(0,180px)_1fr] gap-3" aria-hidden>
        <span />
        <span className="relative h-5">
          <span className="label absolute bottom-1 -translate-x-1/2 whitespace-nowrap text-[9.5px] text-ink" style={{ left: `${(target / max) * 100}%` }}>
            Target {target} h
          </span>
        </span>
      </div>
      <ul aria-label="Time from submission to decision">
        {rows.map((r, i) => (
          <li key={i} className="grid h-8 grid-cols-[minmax(0,110px)_1fr] sm:grid-cols-[minmax(0,180px)_1fr] items-center gap-3">
            <span className="truncate text-[12.5px] text-ink-2">{r.title} <span className="font-mono text-moss">v{r.versionNo}</span></span>
            <span className="relative flex h-full items-center">
              <span className="absolute inset-y-0 w-px bg-ink" style={{ left: `${(target / max) * 100}%` }} aria-hidden />
              <span
                tabIndex={0}
                onPointerMove={(e) => show(e, <><b className="font-semibold">{DECISION[r.decision].label}</b> by {r.reviewer}<br />{fmtHours(r.hours)} after submission</>)}
                onPointerLeave={hide}
                onFocus={(e) => show(e, `${DECISION[r.decision].label} in ${fmtHours(r.hours)}`)}
                onBlur={hide}
                className={cx("relative h-[14px] rounded-r-[4px] outline-none ring-ink/30 focus-visible:ring-2", DECISION[r.decision].bar)}
                style={{ width: pct(r.hours) }}
                aria-label={`${r.title} v${r.versionNo}: ${DECISION[r.decision].label} in ${fmtHours(r.hours)}`}
              />
              <span className="relative ml-2 shrink-0 rounded bg-card px-1 font-mono text-[11px] text-ink-2">{fmtHours(r.hours)}</span>
            </span>
          </li>
        ))}
      </ul>
      {node}
    </div>
  );
}

export function GateChart({ points, threshold, durationDays, title, reached }: { points: { day: number; date: string; units: number }[]; threshold: number; durationDays: number; title: string; reached: boolean }) {
  const { box, show, hide, node } = useTip();
  const W = 320;
  const H = 150;
  const pad = { l: 28, r: 10, t: 14, b: 22 };
  const maxY = Math.max(threshold * 1.15, ...points.map((p) => p.units), 1);
  const x = (d: number) => pad.l + (d / Math.max(1, durationDays)) * (W - pad.l - pad.r);
  const y = (u: number) => H - pad.b - (u / maxY) * (H - pad.t - pad.b);
  const line = points.map((p, i) => `${i ? "L" : "M"}${x(p.day).toFixed(1)} ${y(p.units).toFixed(1)}`).join(" ");
  const area = points.length ? `${line} L${x(points[points.length - 1].day).toFixed(1)} ${y(0)} L${x(0)} ${y(0)} Z` : "";
  const last = points[points.length - 1];
  const [hover, setHover] = useState<number | null>(null);
  const color = reached ? "var(--color-ok)" : "var(--color-vermilion)";

  function onMove(e: React.PointerEvent<SVGSVGElement>) {
    const r = e.currentTarget.getBoundingClientRect();
    const day = Math.round((((e.clientX - r.left) / r.width) * W - pad.l) / ((W - pad.l - pad.r) / Math.max(1, durationDays)));
    const p = points[Math.max(0, Math.min(points.length - 1, day))];
    if (!p) return;
    setHover(p.day);
    show(e, <><b className="font-semibold">Day {p.day + 1}</b> · {p.date}<br />{p.units} of {threshold} paid units</>);
  }

  return (
    <div ref={box} className="relative">
      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="block w-full touch-none"
        role="img"
        aria-label={`${title}: ${last?.units ?? 0} of ${threshold} paid units after ${points.length} days${reached ? ", gate reached" : ""}`}
        onPointerMove={onMove}
        onPointerLeave={() => {
          setHover(null);
          hide();
        }}
      >
        {[0, threshold].map((t) => (
          <line key={t} x1={pad.l} x2={W - pad.r} y1={y(t)} y2={y(t)} stroke={t ? "var(--color-ink)" : "var(--color-sand)"} strokeWidth="1" />
        ))}
        <text x={pad.l - 6} y={y(threshold) + 3} textAnchor="end" className="fill-ink-2 font-mono text-[8.5px]">{threshold}</text>
        <text x={pad.l - 6} y={y(0) + 3} textAnchor="end" className="fill-moss font-mono text-[8.5px]">0</text>
        <text x={pad.l + 4} y={y(threshold) - 4} className="fill-ink font-mono text-[8px] uppercase tracking-wider">gate</text>
        <text x={pad.l} y={H - 6} className="fill-moss font-mono text-[8px]">launch</text>
        <text x={W - pad.r} y={H - 6} textAnchor="end" className="fill-moss font-mono text-[8px]">deadline</text>
        {area && <path d={area} fill={color} opacity="0.1" />}
        {line && <path d={line} fill="none" stroke={color} strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />}
        {hover !== null && <line x1={x(hover)} x2={x(hover)} y1={pad.t} y2={H - pad.b} stroke="var(--color-ink)" strokeOpacity="0.35" strokeWidth="1" />}
        {last && <circle cx={x(last.day)} cy={y(last.units)} r="4.5" fill={color} stroke="var(--color-card)" strokeWidth="2" />}
      </svg>
      {node}
    </div>
  );
}

export function FunnelBars({ steps }: { steps: { label: string; value: number; note?: string; tone?: "ok" | "fail" | "ink" }[] }) {
  const { box, show, hide, node } = useTip();
  const max = Math.max(1, ...steps.map((s) => s.value));
  return (
    <div ref={box} className="relative">
      <ul className="space-y-3">
        {steps.map((s) => (
          <li key={s.label} className="grid grid-cols-[minmax(0,150px)_1fr] items-center gap-3 sm:grid-cols-[minmax(0,190px)_1fr]">
            <span className="text-[12.5px] text-ink-2">{s.label}</span>
            <span className="flex items-center">
              <span
                tabIndex={0}
                onPointerMove={(e) => show(e, <><b className="font-semibold">{s.value}</b> {s.label.toLowerCase()}{s.note ? <><br />{s.note}</> : null}</>)}
                onPointerLeave={hide}
                onFocus={(e) => show(e, `${s.value} ${s.label.toLowerCase()}`)}
                onBlur={hide}
                className={cx("h-[16px] rounded-r-[4px] outline-none ring-ink/30 focus-visible:ring-2", s.tone === "ok" ? "bg-ok" : s.tone === "fail" ? "bg-fail" : "bg-ink")}
                style={{ width: `${Math.max(1.5, (s.value / max) * 100)}%` }}
                aria-label={`${s.label}: ${s.value}`}
              />
              <span className="ml-2 font-mono text-[11.5px] text-ink">{s.value}</span>
            </span>
          </li>
        ))}
      </ul>
      {node}
    </div>
  );
}
