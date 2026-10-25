"use client";

import { useState } from "react";
import { MAP_DOTS, MAP_H, MAP_W, OUTLINE_PATH, project } from "@/lib/india";
import { cx } from "./ui";
import { useT } from "./i18n-client";

export interface MapCity {
  city: string;
  lon: number;
  lat: number;
  interest: number;
  backers?: number;
}

/**
 * Dot-matrix India. Each city is a vermilion sun sized by interest; when backer
 * counts are given, an ink ring shows how many have actually paid.
 */
export function IndiaMap({ cities, dark = false, showBackers = false, className, label }: { cities: MapCity[]; dark?: boolean; showBackers?: boolean; className?: string; label: string }) {
  const [active, setActive] = useState<string | null>(null);
  const max = Math.max(1, ...cities.map((c) => c.interest));
  const r = (n: number) => 3 + Math.sqrt(n / max) * 15;
  const sorted = [...cities].sort((a, b) => b.interest - a.interest);
  const hit = active ? cities.find((c) => c.city === active) : null;
  const [hx, hy] = hit ? project(hit.lon, hit.lat) : [0, 0];
  const t = useT();

  return (
    <div className={cx("relative", className)}>
      <svg viewBox={`0 0 ${MAP_W} ${MAP_H}`} className="block h-auto w-full" role="img" aria-label={label}>
        <path d={OUTLINE_PATH} fill="none" stroke={dark ? "rgba(245,244,239,0.14)" : "rgba(14,19,17,0.12)"} strokeWidth="0.8" strokeLinejoin="round" />
        <g fill={dark ? "rgba(245,244,239,0.34)" : "rgba(14,19,17,0.18)"}>
          {MAP_DOTS.map(([x, y], i) => (
            <circle key={i} cx={x} cy={y} r="1.15" />
          ))}
        </g>
        {sorted.map((c) => {
          const [x, y] = project(c.lon, c.lat);
          const on = active === c.city;
          return (
            <g
              key={c.city}
              tabIndex={0}
              role="button"
              aria-label={t(`${c.city}: ${c.interest} interested${showBackers ? `, ${c.backers ?? 0} paid backers` : ""}`, `${c.city}：購入意向 ${c.interest}人${showBackers ? `、決済済み ${c.backers ?? 0}人` : ""}`)}
              onPointerEnter={() => setActive(c.city)}
              onPointerLeave={() => setActive(null)}
              onFocus={() => setActive(c.city)}
              onBlur={() => setActive(null)}
              className="cursor-default outline-none"
            >
              <circle cx={x} cy={y} r={r(c.interest) + 6} fill="transparent" />
              <circle cx={x} cy={y} r={r(c.interest)} fill="var(--color-vermilion)" opacity={on ? 0.95 : 0.72} stroke={dark ? "var(--color-ink)" : "var(--color-card)"} strokeWidth="1.5" />
              {showBackers && (c.backers ?? 0) > 0 && (
                <circle cx={x} cy={y} r={Math.max(2.5, r(c.interest) * Math.min(1, Math.sqrt((c.backers ?? 0) / Math.max(1, c.interest))))} fill={dark ? "var(--color-paper)" : "var(--color-ink)"} opacity="0.85" />
              )}
            </g>
          );
        })}
        {sorted.slice(0, 6).map((c) => {
          const [x, y] = project(c.lon, c.lat);
          return (
            <text key={`l-${c.city}`} x={x + r(c.interest) + 3} y={y + 3} className={cx("pointer-events-none font-mono text-[8px]", dark ? "fill-paper/70" : "fill-ink-2")}>
              {c.city}
            </text>
          );
        })}
      </svg>
      {hit && (
        <div
          className="pointer-events-none absolute z-10 w-max -translate-x-1/2 -translate-y-[calc(100%+14px)] rounded-md bg-ink px-3 py-2 text-[12px] leading-snug text-paper shadow-lg"
          style={{ left: `${(hx / MAP_W) * 100}%`, top: `${(hy / MAP_H) * 100}%` }}
          role="status"
        >
          <b className="font-semibold">{hit.city}</b>
          <br />
          {t(`${hit.interest} said they’d buy`, `購入意向あり ${hit.interest}人`)}
          {showBackers && (
            <>
              <br />
              {t(`${hit.backers ?? 0} have paid for a run`, `決済済み ${hit.backers ?? 0}人`)}
            </>
          )}
        </div>
      )}
    </div>
  );
}
