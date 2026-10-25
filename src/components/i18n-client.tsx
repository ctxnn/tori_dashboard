"use client";

import { createContext, useContext, useMemo, type ReactNode } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import { makeT, type Lang, type T } from "@/lib/i18n-shared";

const LangContext = createContext<Lang>("en");

export function LangProvider({ lang, children }: { lang: Lang; children: ReactNode }) {
  return <LangContext.Provider value={lang}>{children}</LangContext.Provider>;
}

/** The language picker's choice inside client components. */
export function useT(): T {
  const lang = useContext(LangContext);
  return useMemo(() => makeT(lang), [lang]);
}

/** Floating EN / 日本語 toggle, stacked above the look switch. Fixed colours so it reads the same in either look. */
export function LangSwitch({ lang }: { lang: Lang }) {
  const path = usePathname() || "/";
  const qs = useSearchParams()?.toString();
  const next = encodeURIComponent(qs ? `${path}?${qs}` : path);
  const opt = (l: Lang, label: string) =>
    l === lang ? (
      <span aria-current="true" className="rounded-full bg-white px-3 py-1 text-[#0c0c0f] shadow-[0_1px_2px_rgba(0,0,0,0.12),0_2px_6px_rgba(0,0,0,0.08)]">{label}</span>
    ) : (
      <a href={`/api/lang?lang=${l}&next=${next}`} lang={l} className="rounded-full px-3 py-1 text-[#5d5f66] transition-colors hover:text-[#0c0c0f]">{label}</a>
    );
  return (
    <div
      role="group"
      aria-label="Language"
      className="fixed bottom-[62px] right-4 z-40 flex items-center gap-0.5 rounded-full border border-black/10 bg-[#ececef]/90 p-1 font-[family-name:var(--font-inter)] text-[12.5px] font-medium tracking-[-0.01em] shadow-[0_8px_24px_-8px_rgba(0,0,0,0.25)] backdrop-blur print:hidden"
    >
      {opt("en", "EN")}
      {opt("ja", "日本語")}
    </div>
  );
}
