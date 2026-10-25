"use client";

import { useState } from "react";
import { cx } from "@/components/ui";
import { formatINR } from "@/lib/money";
import { useT } from "@/components/i18n-client";
import { pulseJa } from "@/lib/pulse-ja";

/**
 * Share of interested fans who'd pay at least each price. Current tee campaigns
 * are marked on the curve so the owner can see how many fans each price leaves out.
 */
export function PriceCurve({ points, marks }: { points: { priceMinor: number; share: number }[]; marks: { title: string; priceMinor: number; reach: number }[] }) {
  const [hover, setHover] = useState<number | null>(null);
  const t = useT();
  const W = 900;
  const H = 300;
  const pad = { l: 40, r: 16, t: 44, b: 30 };
  const xs = points.map((p) => p.priceMinor);
  const min = xs[0];
  const max = xs[xs.length - 1];
  const x = (v: number) => pad.l + ((v - min) / (max - min)) * (W - pad.l - pad.r);
  const y = (s: number) => H - pad.b - s * (H - pad.t - pad.b);
  // Fans answered in price bands, so reach is a staircase: it drops just after each band.
  const line = `M${x(points[0].priceMinor).toFixed(1)} ${y(points[0].share).toFixed(1)} ${points
    .slice(1)
    .map((p) => `V${y(p.share).toFixed(1)} H${x(p.priceMinor).toFixed(1)}`)
    .join(" ")}`;
  const area = `${line} L${x(max)} ${y(0)} L${x(min)} ${y(0)} Z`;
  // Group campaigns at the same price into one marker.
  const byPrice = new Map<number, { titles: string[]; reach: number }>();
  for (const m of marks) byPrice.set(m.priceMinor, { titles: [...(byPrice.get(m.priceMinor)?.titles ?? []), m.title], reach: m.reach });
  const h = hover !== null ? points[hover] : null;

  return (
    <div className="relative">
      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="block w-full touch-none"
        role="img"
        aria-label={`${t("Share of interested fans who would pay at least each price", "各価格以上を支払ってもよいファンの割合")}: ${points.map((p) => `${formatINR(p.priceMinor)} ${Math.round(p.share * 100)}%`).join(", ")}`}
        onPointerMove={(e) => {
          const r = e.currentTarget.getBoundingClientRect();
          const px = ((e.clientX - r.left) / r.width) * W;
          let best = 0;
          points.forEach((p, i) => {
            if (Math.abs(x(p.priceMinor) - px) < Math.abs(x(points[best].priceMinor) - px)) best = i;
          });
          setHover(best);
        }}
        onPointerLeave={() => setHover(null)}
      >
        {[0, 0.25, 0.5, 0.75, 1].map((t) => (
          <g key={t}>
            <line x1={pad.l} x2={W - pad.r} y1={y(t)} y2={y(t)} stroke="var(--color-sand)" strokeWidth="1" />
            <text x={pad.l - 6} y={y(t) + 3} textAnchor="end" className="fill-moss font-mono text-[11px]">{Math.round(t * 100)}%</text>
          </g>
        ))}
        {points.map((p) => (
          <text key={p.priceMinor} x={x(p.priceMinor)} y={H - 10} textAnchor="middle" className="fill-moss font-mono text-[11px]">
            {formatINR(p.priceMinor).replace(".00", "")}
          </text>
        ))}
        <path d={area} fill="var(--color-vermilion)" opacity="0.1" />
        <path d={line} fill="none" stroke="var(--color-vermilion)" strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />
        {[...byPrice].map(([price, m], k) => {
          // Stagger labels on two rows so neighbouring prices never collide; flip left near the edge.
          const ly = 14 + (k % 2) * 14;
          const left = x(price) > W * 0.7;
          return (
            <g key={price}>
              <line x1={x(price)} x2={x(price)} y1={ly + 4} y2={y(0)} stroke="var(--color-ink)" strokeDasharray="3 3" strokeWidth="1" />
              <circle cx={x(price)} cy={y(m.reach)} r="5" fill="var(--color-ink)" stroke="var(--color-card)" strokeWidth="2" />
              <text x={x(price) + (left ? -6 : 6)} y={ly} textAnchor={left ? "end" : "start"} className="fill-ink font-mono text-[11px]">
                {m.titles.join(", ")} · {t(`${formatINR(price).replace(".00", "")} reaches ${Math.round(m.reach * 100)}%`, `${formatINR(price).replace(".00", "")}で${Math.round(m.reach * 100)}%に到達`)}
              </text>
            </g>
          );
        })}
        {h && (
          <g>
            <line x1={x(h.priceMinor)} x2={x(h.priceMinor)} y1={pad.t} y2={y(0)} stroke="var(--color-ink)" strokeOpacity="0.3" />
            <circle cx={x(h.priceMinor)} cy={y(h.share)} r="4.5" fill="var(--color-vermilion)" stroke="var(--color-card)" strokeWidth="2" />
          </g>
        )}
      </svg>
      {h && (
        <div
          className="pointer-events-none absolute z-10 w-max -translate-x-1/2 -translate-y-[calc(100%+12px)] rounded-md bg-ink px-3 py-2 text-[12px] leading-snug text-paper shadow-lg"
          style={{ left: `${(x(h.priceMinor) / W) * 100}%`, top: `${(y(h.share) / H) * 100}%` }}
          role="status"
        >
          {t(<><b className="font-semibold">{Math.round(h.share * 100)}%</b> would pay {formatINR(h.priceMinor)} or more</>, <><b className="font-semibold">{Math.round(h.share * 100)}%</b>が{formatINR(h.priceMinor)}以上を支払ってもよいと回答</>)}
        </div>
      )}
    </div>
  );
}

/** Horizontal share bars. `muted` rows are drawn hatched with a text tag, never colour alone. */
export function ShareBars({ rows, tag }: { rows: { id: string; label: string; n: number; share: number; muted?: boolean }[]; tag?: string }) {
  const [hover, setHover] = useState<string | null>(null);
  const t = useT();
  const max = Math.max(0.0001, ...rows.map((r) => r.share));
  return (
    <ul className="space-y-2.5">
      {rows.map((r) => (
        <li
          key={r.id}
          className="grid grid-cols-[minmax(0,140px)_1fr] items-center gap-3 sm:grid-cols-[minmax(0,200px)_1fr]"
          onPointerEnter={() => setHover(r.id)}
          onPointerLeave={() => setHover(null)}
        >
          <span className="flex min-w-0 items-center gap-1.5 text-[12.5px] text-ink-2">
            <span className="truncate">{t(r.label, pulseJa(r.id, pulseJa(r.label, r.label)))}</span>
            {r.muted && tag && <span className="label shrink-0 rounded-[3px] border border-dashed border-moss/60 px-1 text-[8.5px] text-moss">{tag}</span>}
          </span>
          <span className="flex items-center">
            <span
              className={cx(
                "h-[14px] rounded-r-[4px] transition-opacity",
                r.muted ? "border border-ink/50 bg-[repeating-linear-gradient(135deg,transparent_0_3px,rgb(14_19_17/0.28)_3px_4.5px)]" : "bg-ink",
                hover && hover !== r.id && "opacity-50",
              )}
              style={{ width: `${Math.max(1.5, (r.share / max) * 100)}%` }}
              aria-hidden
            />
            <span className="ml-2 font-mono text-[11.5px] text-ink">{Math.round(r.share * 100)}%</span>
            <span className={cx("ml-2 font-mono text-[10.5px] text-moss transition-opacity", hover === r.id ? "opacity-100" : "opacity-0")}>{t(`${r.n} fans`, `${r.n}人`)}</span>
          </span>
        </li>
      ))}
    </ul>
  );
}
