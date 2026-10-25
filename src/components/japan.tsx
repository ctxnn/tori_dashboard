// Japanese visual motifs, drawn as plain SVG: Mount Fuji, ukiyo-e waves, golden
// mist bands (suyari-gasumi), a brushed ensō, brush strokes and hanko stamps.
// Decorative only — every one is aria-hidden unless it carries a label.
import type { ReactNode } from "react";
import { cx } from "./ui";

/** Mount Fuji with a snow cap, sized by its container. */
export function Fuji({ className, snow = "var(--color-paper)", body = "currentColor" }: { className?: string; snow?: string; body?: string }) {
  return (
    <svg viewBox="0 0 400 160" className={className} aria-hidden preserveAspectRatio="xMidYMax meet">
      <path d="M0 160 C70 150 120 120 160 70 C172 55 180 40 188 32 Q200 22 212 32 C220 40 228 55 240 70 C280 120 330 150 400 160 Z" fill={body} />
      <path d="M160 70 C172 55 180 40 188 32 Q200 22 212 32 C220 40 228 55 240 70 L230 76 L218 64 L206 80 L196 66 L184 82 L172 68 Z" fill={snow} />
    </svg>
  );
}

/** Golden mist bands drifting across a scene. */
export function Mist({ className, tone = "gold" }: { className?: string; tone?: "gold" | "paper" | "ink" }) {
  const fill = tone === "gold" ? "var(--color-gold)" : tone === "paper" ? "var(--color-paper)" : "var(--color-ink)";
  const bands: [number, number, number, number][] = [
    [30, 40, 220, 0.0],
    [180, 92, 260, 1.4],
    [-40, 140, 200, 0.7],
    [300, 168, 180, 2.1],
  ];
  return (
    <svg viewBox="0 0 600 200" className={className} aria-hidden preserveAspectRatio="none">
      {bands.map(([x, y, w, d], i) => (
        <g key={i} style={{ animation: `mist ${9 + i * 2}s ${d}s ease-in-out infinite alternate` }}>
          <rect x={x} y={y} width={w} height="16" rx="8" fill={fill} />
          <rect x={x + w * 0.18} y={y - 9} width={w * 0.5} height="12" rx="6" fill={fill} />
        </g>
      ))}
    </svg>
  );
}

/** A band of stylised ukiyo-e waves with curling crests. */
export function Waves({ className, fill = "var(--color-indigo)", crest = "var(--color-paper)" }: { className?: string; fill?: string; crest?: string }) {
  const crests = Array.from({ length: 9 }, (_, i) => i * 80 - 20);
  return (
    <svg viewBox="0 0 700 90" className={className} aria-hidden preserveAspectRatio="none">
      <path
        d={`M0 50 ${crests.map((x) => `C${x + 20} 20 ${x + 50} 18 ${x + 62} 34 C${x + 70} 44 ${x + 60} 52 ${x + 52} 46 C${x + 66} 60 ${x + 86} 54 ${x + 100} 46`).join(" ")} L700 90 L0 90 Z`}
        fill={fill}
      />
      {crests.map((x) => (
        <path key={x} d={`M${x + 22} 30 C${x + 38} 18 ${x + 56} 22 ${x + 60} 34`} fill="none" stroke={crest} strokeWidth="2.2" strokeLinecap="round" opacity="0.85" />
      ))}
      {crests.map((x) => (
        <g key={`f${x}`} fill={crest} opacity="0.75">
          <circle cx={x + 64} cy={30} r="2.2" />
          <circle cx={x + 70} cy={26} r="1.5" />
          <circle cx={x + 58} cy={24} r="1.2" />
        </g>
      ))}
    </svg>
  );
}

/** A single brushed ensō circle. */
export function Enso({ className, stroke = "currentColor" }: { className?: string; stroke?: string }) {
  return (
    <svg viewBox="0 0 120 120" className={className} aria-hidden fill="none">
      <path
        d="M78 16 C44 6 14 30 14 62 C14 92 40 108 64 106 C92 104 108 82 106 58 C104 40 96 28 84 22"
        stroke={stroke}
        strokeWidth="9"
        strokeLinecap="round"
        pathLength={1}
        strokeDasharray="1"
        style={{ animation: "ink-draw 1.6s cubic-bezier(0.6,0,0.3,1) both" }}
      />
    </svg>
  );
}

/** A dry-brush underline for headings. */
export function BrushStroke({ className, color = "var(--color-vermilion)" }: { className?: string; color?: string }) {
  return (
    <svg viewBox="0 0 300 18" className={className} aria-hidden preserveAspectRatio="none">
      <path d="M4 11 C60 4 140 5 210 8 C250 9 280 8 296 6 C280 12 240 14 190 14 C120 14 60 16 6 14 Z" fill={color} opacity="0.9" />
      <path d="M30 13 C90 10 170 11 260 9" stroke={color} strokeWidth="1" opacity="0.4" fill="none" />
    </svg>
  );
}

/** A square hanko stamp with up to two short lines (Latin text, mono). */
export function Hanko({ lines, className, tone = "vermilion", animate = false, label }: { lines: [string, string?]; className?: string; tone?: "vermilion" | "ink" | "indigo"; animate?: boolean; label?: string }) {
  const c = tone === "vermilion" ? "var(--torii-red, var(--color-vermilion))" : tone === "indigo" ? "var(--color-indigo)" : "var(--color-ink)";
  return (
    <svg viewBox="0 0 100 100" className={cx("-rotate-6", className)} role={label ? "img" : undefined} aria-label={label} aria-hidden={label ? undefined : true} style={animate ? { animation: "stamp-in 0.6s cubic-bezier(0.2,0.8,0.25,1.2) both" } : undefined}>
      <defs>
        <filter id="hanko-rough">
          <feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="1" seed="3" />
          <feDisplacementMap in="SourceGraphic" scale="2.2" />
        </filter>
      </defs>
      <g filter="url(#hanko-rough)">
        <rect x="6" y="6" width="88" height="88" rx="10" fill="none" stroke={c} strokeWidth="5" />
        <rect x="14" y="14" width="72" height="72" rx="5" fill="none" stroke={c} strokeWidth="1.4" />
        <text x="50" y={lines[1] ? 47 : 57} textAnchor="middle" fill={c} style={{ fontFamily: "var(--font-sans)", fontWeight: 700, fontSize: Math.min(20, 104 / Math.max(1, lines[0].length)), letterSpacing: -0.5 }}>{lines[0]}</text>
        {lines[1] && <text x="50" y="68" textAnchor="middle" fill={c} style={{ fontFamily: "var(--font-mono)", fontSize: 9.5, letterSpacing: 1.2 }}>{lines[1]}</text>}
      </g>
    </svg>
  );
}

/** A torii gate silhouette for scenes (fills its box). */
export function ToriiGate({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 120 100" className={className} aria-hidden fill="currentColor">
      <path d="M2 12 C40 22 80 22 118 12 L115 22 C80 30 40 30 5 22 Z" />
      <rect x="14" y="34" width="92" height="6" rx="1" />
      <rect x="56" y="24" width="8" height="12" />
      <path d="M28 24 H38 L40 100 H26 Z" />
      <path d="M82 24 H92 L94 100 H80 Z" />
    </svg>
  );
}

/** Section eyebrow with a small vermilion sun and an optional rule. */
export function SunEyebrow({ children, className, dark = false }: { children: ReactNode; className?: string; dark?: boolean }) {
  return (
    <div className={cx("label flex items-center gap-2.5", dark ? "text-paper/55" : "text-moss", className)}>
      <span className="relative h-3 w-3 shrink-0 rounded-full bg-vermilion" aria-hidden>
        <span className="absolute inset-x-[-3px] top-1/2 h-px -translate-y-1/2 bg-current opacity-40" />
      </span>
      {children}
    </div>
  );
}
