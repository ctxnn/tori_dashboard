"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ITEMS } from "@/store/components/partner/PartnerNav";
import { useT } from "@/components/i18n-client";

/** The Partner Portal's sections on a light sidebar; the current one is a raised white chip. */
export function V2PartnerNav({ badge }: { badge?: Record<string, number> }) {
  const path = usePathname() || "";
  const t = useT();
  return (
    <nav aria-label="Partner Portal" className="no-scrollbar flex gap-1 overflow-x-auto lg:flex-col lg:overflow-visible">
      {ITEMS.map((it) => {
        const on = path === it.href || path.startsWith(it.href + "/");
        const n = badge?.[it.href];
        return (
          <Link
            key={it.href}
            href={it.href}
            aria-current={on ? "page" : undefined}
            className={`flex shrink-0 items-center gap-3 rounded-[12px] px-3 py-2 text-[14px] tracking-[-0.02em] transition-[background-color,box-shadow,color] ${
              on ? "bg-white font-medium text-[#0c0c0f] shadow-[0_1px_2px_rgba(0,0,0,0.08),0_4px_12px_rgba(0,0,0,0.06)]" : "text-black/55 hover:bg-white/60 hover:text-[#0c0c0f]"
            }`}
          >
            <svg className="h-[18px] w-[18px] shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
              <path d={it.icon} />
            </svg>
            <span className="flex flex-col leading-tight">
              <span className={t.ja ? "jp" : "lowercase"}>{t(it.en, it.ja)}</span>
              <span className={`hidden text-[11px] text-black/40 lg:block ${t.ja ? "lowercase" : "jp"}`}>{t(it.ja, it.en)}</span>
            </span>
            {!!n && <span className="ml-auto rounded-full bg-[#e8402f] px-1.5 text-[11px] font-semibold text-white">{n}</span>}
          </Link>
        );
      })}
    </nav>
  );
}
