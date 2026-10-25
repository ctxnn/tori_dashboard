"use client";

import { useRef, useState, type CSSProperties, type ReactNode } from "react";

/**
 * A die-cut sticker that bobs gently and can be dragged around with a mouse (heyclicky's
 * desktop of objects). Touch is left alone so the page still scrolls on phones.
 */
export function Sticker({
  children,
  className = "",
  style,
  rotate = 0,
  delay = 0,
  duration = 6,
  cut = true,
}: {
  children: ReactNode;
  className?: string;
  style?: CSSProperties;
  rotate?: number;
  delay?: number;
  duration?: number;
  /** false for stickers that draw their own white border */
  cut?: boolean;
}) {
  const start = useRef<{ x: number; y: number; px: number; py: number } | null>(null);
  const [pos, setPos] = useState({ x: 0, y: 0 });
  const [held, setHeld] = useState(false);

  return (
    <div
      aria-hidden
      className={`absolute select-none ${held ? "z-20 cursor-grabbing" : "cursor-grab"} ${className}`}
      style={{ ...style, translate: `${pos.x}px ${pos.y}px` }}
      onPointerDown={(e) => {
        if (e.pointerType === "touch") return;
        e.currentTarget.setPointerCapture(e.pointerId);
        start.current = { x: e.clientX, y: e.clientY, px: pos.x, py: pos.y };
        setHeld(true);
      }}
      onPointerMove={(e) => {
        const s = start.current;
        if (s) setPos({ x: s.px + e.clientX - s.x, y: s.py + e.clientY - s.y });
      }}
      onPointerUp={() => {
        start.current = null;
        setHeld(false);
      }}
      onDragStart={(e) => e.preventDefault()}
    >
      <div className="v2-float" style={{ "--r": `${rotate}deg`, "--delay": `${-delay}s`, "--d": `${duration}s` } as CSSProperties}>
        <div className={`transition-transform duration-200 ${held ? "scale-110" : ""} ${cut ? "sticker" : ""}`}>{children}</div>
      </div>
    </div>
  );
}
