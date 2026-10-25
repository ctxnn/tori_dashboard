"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";

export const ITEMS = [
  { href: "/partner/dashboard", en: "Overview", ja: "概要", icon: "M3 12h7V3H3zM14 21h7v-9h-7zM14 3v5h7V3zM3 21h7v-5H3z" },
  { href: "/partner/titles", en: "Titles", ja: "作品管理", icon: "M4 19.5V5a2 2 0 0 1 2-2h13v16H6.5A2.5 2.5 0 0 0 4 21.5ZM8 7h7" },
  { href: "/partner/merch", en: "Merch collabs", ja: "グッズ・コラボ", icon: "M8.5 3 4 5.5 2.5 10l3.5 1.5V21h12v-9.5l3.5-1.5L20 5.5 15.5 3a3.5 3.5 0 0 1-7 0Z" },
  { href: "/partner/insights", en: "India insights", ja: "市場データ", icon: "M3 3v18h18M7 15l4-4 3 3 5-6" },
  { href: "/partner/earnings", en: "Earnings", ja: "収益・明細", icon: "M12 2v20M17 6.5C17 4.6 14.8 3 12 3S7 4.6 7 6.5 9.2 10 12 10s5 1.6 5 3.5S14.8 17 12 17s-5-1.6-5-3.5" },
];

export default function PartnerNav({ badge }: { badge?: Record<string, number> }) {
  const path = usePathname() || "";
  return (
    <nav aria-label="Partner Portal" className="no-scrollbar flex gap-1 overflow-x-auto lg:flex-col lg:overflow-visible">
      {ITEMS.map((it) => {
        const on = path === it.href || path.startsWith(it.href + "/");
        const n = badge?.[it.href];
        return (
          <Link key={it.href} href={it.href} aria-current={on ? "page" : undefined}
            className={`group flex shrink-0 items-center gap-3 rounded-xl px-3 py-2.5 text-[14px] font-semibold transition-colors duration-300 ${on ? "bg-white text-[rgb(24,21,34)] shadow-panel-sm" : "text-white/70 hover:bg-white/10 hover:text-white"}`}>
            <svg className="h-[18px] w-[18px] shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden><path d={it.icon} /></svg>
            <span className="flex flex-col leading-tight">
              <span>{it.en}</span>
              <span className={`jp hidden text-[11px] font-normal lg:block ${on ? "text-[rgb(24,21,34)]/55" : "text-white/45"}`}>{it.ja}</span>
            </span>
            {!!n && <span className="ml-auto rounded-full bg-[rgb(222,0,52)] px-1.5 text-[11px] font-bold text-white">{n}</span>}
          </Link>
        );
      })}
    </nav>
  );
}
