"use client";

import { usePathname, useSearchParams } from "next/navigation";
import type { UiMode } from "@/lib/ui-mode";

/**
 * A small floating toggle between the new look and the classic one. It's styled with fixed
 * colours so it reads the same in either look. A full page load follows, so the html
 * attribute and server-rendered chrome both change.
 */
export function UiSwitch({ mode }: { mode: UiMode }) {
  const path = usePathname() || "/";
  const qs = useSearchParams()?.toString();
  const next = encodeURIComponent(qs ? `${path}?${qs}` : path);
  const opt = (m: UiMode, label: string) =>
    m === mode ? (
      <span aria-current="true" className="rounded-full bg-white px-3 py-1 text-[#0c0c0f] shadow-[0_1px_2px_rgba(0,0,0,0.12),0_2px_6px_rgba(0,0,0,0.08)]">{label}</span>
    ) : (
      <a href={`/api/ui?mode=${m}&next=${next}`} className="rounded-full px-3 py-1 text-[#5d5f66] transition-colors hover:text-[#0c0c0f]">{label}</a>
    );
  return (
    <div
      role="group"
      aria-label="Interface look"
      className="fixed bottom-4 right-4 z-40 flex items-center gap-0.5 rounded-full border border-black/10 bg-[#ececef]/90 p-1 font-[family-name:var(--font-inter)] text-[12.5px] font-medium tracking-[-0.01em] shadow-[0_8px_24px_-8px_rgba(0,0,0,0.25)] backdrop-blur print:hidden"
    >
      {opt("new", "New look")}
      {opt("classic", "Classic")}
    </div>
  );
}
