"use client";

import { useEffect, useState } from "react";
import { usePrefersReducedMotion } from "./landing/use-motion";

interface Petal {
  left: number;
  size: number;
  delay: number;
  duration: number;
  drift: number;
  spin: number;
  hue: string;
}

/** A few cherry-blossom petals drifting down. Off for reduced motion. */
export function Sakura({ count = 14, className }: { count?: number; className?: string }) {
  const reduced = usePrefersReducedMotion();
  const [petals, setPetals] = useState<Petal[]>([]);
  useEffect(() => {
    // Generated on the client only, so server and client markup always match.
    const hues = ["#f6d3d8", "#f2c1c9", "#fbe3e6", "#eab0ba"];
    setPetals(
      Array.from({ length: count }, (_, i) => ({
        left: (i * 97) % 100,
        size: 8 + ((i * 37) % 9),
        delay: -((i * 1.9) % 16),
        duration: 13 + ((i * 7) % 9),
        drift: 40 + ((i * 53) % 120),
        spin: 360 + ((i * 131) % 540),
        hue: hues[i % hues.length],
      })),
    );
  }, [count]);
  if (reduced || !petals.length) return null;
  return (
    <div className={`pointer-events-none absolute inset-0 overflow-hidden ${className ?? ""}`} aria-hidden>
      {petals.map((p, i) => (
        <span
          key={i}
          className="absolute top-0"
          style={{
            left: `${p.left}%`,
            animation: `petal-fall ${p.duration}s ${p.delay}s linear infinite`,
            ["--drift" as string]: `${p.drift}px`,
            ["--spin" as string]: `${p.spin}deg`,
          }}
        >
          <svg viewBox="0 0 20 20" width={p.size} height={p.size} style={{ animation: `petal-sway ${3 + (i % 3)}s ease-in-out infinite` }}>
            <path d="M10 1 C15 5 17 11 10 19 C3 11 5 5 10 1 Z M10 1 L11.5 4 L10 3.4 L8.5 4 Z" fill={p.hue} />
          </svg>
        </span>
      ))}
    </div>
  );
}
