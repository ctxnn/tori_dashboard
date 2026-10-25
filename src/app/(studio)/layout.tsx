import Link from "next/link";
import { Suspense } from "react";
import { currentUser } from "@/lib/auth";
import { ROLE_LABEL, ROLE_LABEL_JA } from "@/lib/labels";
import { getT } from "@/lib/i18n";
import { LangProvider, LangSwitch } from "@/components/i18n-client";
import { ToriiMark } from "@/components/ui";
import { NavLinks } from "@/components/nav-links";
import { HeaderShell } from "@/components/header-shell";
import { Fuji, ToriiGate } from "@/components/japan";
import { NAV, GUEST_NAV } from "@/components/nav-config";
import { uiMode } from "@/lib/ui-mode";
import { V2Chrome } from "@/components/v2/chrome";
import { UiSwitch } from "@/components/v2/ui-switch";

const ROLE_DOT: Record<string, string> = { owner: "bg-vermilion", creator: "bg-pine", fan: "bg-gold", operator: "bg-info" };

/** The collaboration workspace: IP owners, creators, Torii operations, and fans' collab pages. */
export default async function StudioLayout({ children }: { children: React.ReactNode }) {
  const user = await currentUser();
  const t = await getT("owner");
  const links = (user ? NAV[user.role] : GUEST_NAV).map((l) => ({ href: l.href, label: t(l.label, l.ja ?? l.label) }));
  const roleLabel = user ? t(ROLE_LABEL[user.role], ROLE_LABEL_JA[user.role]) : "";
  const body =
    (await uiMode()) === "new" ? (
      <V2Chrome user={user} links={links} t={t}>
        {children}
      </V2Chrome>
    ) : (
    <>
        <a href="#main" className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:rounded-lg focus:bg-ink focus:px-4 focus:py-2 focus:text-paper">
          Skip to content
        </a>
        <div className="bg-ink text-paper/70">
          <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-1.5 font-mono text-[10.5px] uppercase tracking-[0.08em] sm:px-6">
            <span className="truncate">
              <span className="mr-2 inline-block h-1.5 w-1.5 rounded-full bg-vermilion align-middle" aria-hidden />
              {t("Demo build · fictional property, partners & terms · test-mode payments", "デモ版 · 作品・企業・条件は架空です · 決済はテストモード")}
            </span>
            <Link href="/#reset" className="shrink-0 text-paper/90 underline decoration-paper/30 underline-offset-2 hover:decoration-paper">
              {t("Reset demo", "デモをリセット")}
            </Link>
          </div>
        </div>
        <HeaderShell>
          <div className="mx-auto flex h-14 max-w-7xl items-center gap-4 px-4 sm:gap-8 sm:px-6">
            <Link href="/" className="flex shrink-0 items-center gap-2.5 text-ink transition-colors group-data-[tone=dark]/header:text-paper" aria-label="Torii home">
              <ToriiMark className="h-[22px] w-[22px] text-vermilion" />
              <span className="text-[17px] font-semibold tracking-[-0.03em]">Torii</span>
            </Link>
            <NavLinks links={links} />
            <Link
              href="/switch"
              className="group ml-auto flex shrink-0 items-center gap-2.5 rounded-lg py-1 pl-1 pr-2 text-sm transition-colors hover:bg-ivory group-data-[tone=dark]/header:hover:bg-paper/10"
              aria-label={user ? `Signed in as ${user.name}, ${roleLabel}. Switch role` : "Choose a demo role"}
            >
              <span className="relative grid h-8 w-8 place-items-center rounded-full bg-ink text-[11px] font-semibold text-paper group-data-[tone=dark]/header:bg-paper group-data-[tone=dark]/header:text-ink">
                {user ? user.name.split(" ").map((p) => p[0]).join("") : "?"}
                {user && <span className={`absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-paper group-data-[tone=dark]/header:border-ink ${ROLE_DOT[user.role]}`} aria-hidden />}
              </span>
              <span className="hidden leading-tight sm:block">
                <span className="block text-[13px] font-medium text-ink group-data-[tone=dark]/header:text-paper">{user ? user.name : "Choose a role"}</span>
                <span className="label block text-[9.5px] text-moss group-data-[tone=dark]/header:text-paper/50">{user ? roleLabel : "Demo access"} · {t("switch", "切替")}</span>
              </span>
            </Link>
          </div>
        </HeaderShell>
        <main id="main" className="mx-auto w-full max-w-7xl flex-1 px-4 py-10 sm:px-6 sm:py-12">
          {children}
        </main>
        <footer className="relative mt-16 overflow-hidden bg-ink text-paper/70 print:hidden">
          <div className="seigaiha-ink absolute inset-0 opacity-90" aria-hidden />
          <div className="absolute inset-x-0 top-0 h-px bg-vermilion" aria-hidden />
          <Fuji className="pointer-events-none absolute -bottom-2 right-[-4%] h-40 w-[52%] text-[#1a221e] sm:h-56 sm:w-[38%]" snow="#2b3430" />
          <ToriiGate className="pointer-events-none absolute bottom-0 right-[22%] hidden h-24 w-28 text-vermilion/80 sm:block" />
          <div className="relative mx-auto grid max-w-7xl gap-8 px-4 py-12 text-[13px] sm:grid-cols-[1.2fr_1fr_1fr] sm:px-6">
            <div>
              <div className="flex items-center gap-2 text-paper">
                <ToriiMark className="h-5 w-5 text-vermilion" />
                <span className="text-[16px] font-semibold tracking-[-0.02em]">Torii</span>
              </div>
              <p className="mt-3 max-w-xs leading-relaxed">From fandom to revenue, officially: Japanese IP owners and Indian creators, one shared workspace.</p>
              <p className="label mt-4 text-[10px] text-paper/40">Prototype · Thapar Japan Hackathon · JETRO-PS-02</p>
            </div>
            <nav aria-label="For fans" className="space-y-2">
              <div className="label text-[10px] text-paper/40">For fans</div>
              <Link href="/read" className="block hover:text-paper">Read manga, officially</Link>
              <Link href="/figures" className="block hover:text-paper">Volumes &amp; figures</Link>
              <Link href="/campaigns" className="block hover:text-paper">Live campaigns</Link>
              <Link href="/pulse" className="block hover:text-paper">Answer the fan pulse</Link>
              <Link href="/verify" className="block hover:text-paper">Verify a product</Link>
            </nav>
            <nav aria-label="About" className="space-y-2">
              <div className="label text-[10px] text-paper/40">About</div>
              <Link href="/how-it-works" className="block hover:text-paper">How it works</Link>
              <Link href="/proof" className="block hover:text-paper">Proof dashboard</Link>
              <Link href="/pitch" className="block hover:text-paper">The pitch</Link>
              <Link href="/partner" className="block hover:text-paper">Partner Portal for publishers</Link>
            </nav>
          </div>
          <p className="relative mx-auto max-w-7xl px-4 pb-8 text-[11.5px] text-paper/40 sm:px-6">Rule checks enforce declared kit rules. They don’t establish copyright ownership or replace human judgement.</p>
        </footer>
        <Suspense>
          <UiSwitch mode="classic" />
        </Suspense>
    </>
  );
  return (
    <div lang={t.lang} className="contents">
      <LangProvider lang={t.lang}>
        {body}
        {user?.role === "owner" && (
          <Suspense>
            <LangSwitch lang={t.lang} />
          </Suspense>
        )}
      </LangProvider>
    </div>
  );
}