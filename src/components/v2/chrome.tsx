import Link from "next/link";
import { Suspense, type ReactNode } from "react";
import type { User } from "@/lib/domain/core";
import { ROLE_LABEL, ROLE_LABEL_JA } from "@/lib/labels";
import { makeT, type T } from "@/lib/i18n-shared";
import { ToriiMark } from "@/components/ui";
import { V2NavLinks } from "./nav-links";
import { UiSwitch } from "./ui-switch";

const ROLE_RING: Record<string, string> = { owner: "#e8402f", creator: "#2f8a62", fan: "#d4a13a", operator: "#2d5bd2" };

export function V2Logo({ className = "" }: { className?: string }) {
  return (
    <span className={`flex items-center gap-2 ${className}`}>
      <ToriiMark className="h-[22px] w-[22px] text-[var(--torii-red)]" />
      <span className="text-[20px] font-medium leading-none tracking-[-0.05em]">torii</span>
    </span>
  );
}

/** The workspace's header and footer in the new look. Same links and routes as the classic chrome. */
export function V2Chrome({ user, links, children, t = makeT("en") }: { user?: User; links: { href: string; label: string }[]; children: ReactNode; t?: T }) {
  const role = user ? t(ROLE_LABEL[user.role], ROLE_LABEL_JA[user.role]) : "";
  return (
    <>
      <a href="#main" className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:rounded-full focus:bg-ink focus:px-4 focus:py-2 focus:text-paper">
        Skip to content
      </a>
      <div className="border-b border-black/[0.05] text-[12px] tracking-[-0.01em] text-black/50">
        <div className="mx-auto flex max-w-7xl items-center justify-center gap-2 px-4 py-1.5 text-center sm:px-6">
          <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-[var(--torii-red)]" aria-hidden />
          <span className="truncate">{t("demo build · fictional property, partners & terms · test-mode payments", "デモ版 · 作品・企業・条件はすべて架空です · 決済はテストモードです")}</span>
          <Link href="/#reset" className="shrink-0 text-[#2d5bd2] hover:underline">{t("reset demo", "デモをリセット")}</Link>
        </div>
      </div>
      <header className="sticky top-0 z-30 border-b border-black/[0.06] bg-[#f5f5f5]/80 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-7xl items-center gap-4 px-4 sm:gap-7 sm:px-6">
          <Link href="/" aria-label="Torii home" className="shrink-0 text-ink">
            <V2Logo />
          </Link>
          <div className="min-w-0 flex-1 [&_a]:lowercase">
            <V2NavLinks links={links} />
          </div>
          {user ? (
            <Link
              href="/switch"
              className="group flex shrink-0 items-center gap-2.5 rounded-full py-1 pl-1 pr-1 transition-colors hover:bg-white sm:pr-3.5"
              aria-label={`Signed in as ${user.name}, ${role}. Switch role`}
            >
              <span
                className="grid h-8 w-8 place-items-center rounded-full bg-[linear-gradient(180deg,#fff,#e9e9ee)] text-[11.5px] font-semibold text-ink shadow-[inset_0_1px_0_#fff,0_1px_3px_rgba(0,0,0,0.18)]"
                style={{ boxShadow: `0 0 0 2px ${ROLE_RING[user.role]}, inset 0 1px 0 #fff` }}
              >
                {user.name.split(" ").map((p) => p[0]).join("")}
              </span>
              <span className="hidden leading-tight sm:block">
                <span className="block text-[13.5px] font-medium tracking-[-0.02em] text-ink">{user.name}</span>
                <span className={`block text-[11.5px] text-black/50 ${t.ja ? "" : "lowercase"}`}>{role} · {t("switch", "切り替え")}</span>
              </span>
            </Link>
          ) : (
            <Link href="/#enter" className="gel gel-blue inline-flex h-9 shrink-0 items-center px-4 text-[14px]">
              try the demo
            </Link>
          )}
        </div>
      </header>
      <main id="main" className="mx-auto w-full max-w-7xl flex-1 px-4 py-10 sm:px-6 sm:py-12">
        {children}
      </main>
      <V2Footer t={t} />
      <Suspense>
        <UiSwitch mode="new" />
      </Suspense>
    </>
  );
}

const COLUMNS: { title: [string, string]; links: [string, string, string][] }[] = [
  {
    title: ["for fans", "ファンの方へ"],
    links: [
      ["/read", "read manga, officially", "公式マンガを読む"],
      ["/figures", "volumes & figures", "単行本・フィギュア"],
      ["/campaigns", "live campaigns", "実施中のキャンペーン"],
      ["/pulse", "answer the fan pulse", "ファンアンケート"],
      ["/verify", "verify a product", "正規品の確認"],
    ],
  },
  {
    title: ["for teams", "事業者の方へ"],
    links: [
      ["/switch", "enter the workspace", "ワークスペースへ"],
      ["/partner", "partner portal for publishers", "出版社向けパートナーポータル"],
      ["/how-it-works", "how it works", "ご利用の流れ"],
      ["/proof", "proof dashboard", "実績データ"],
    ],
  },
  {
    title: ["about", "Toriiについて"],
    links: [
      ["/pitch", "the pitch", "ピッチ資料"],
      ["/#faq", "faq", "よくあるご質問"],
      ["/#reset", "reset the demo", "デモをリセット"],
    ],
  },
];

export function V2Footer({ t = makeT("en") }: { t?: T }) {
  return (
    <footer className="mt-24 overflow-hidden border-t border-black/[0.06] print:hidden">
      <div className="mx-auto grid max-w-7xl gap-10 px-4 pb-6 pt-14 sm:px-6 md:grid-cols-[1.5fr_1fr_1fr_1fr]">
        <div>
          <V2Logo className="text-ink" />
          <p className="mt-4 max-w-xs text-[14px] leading-relaxed tracking-[-0.01em] text-black/55">
            {t(
              "official japanese ip in india: owners, creators and fans making merch together, from fandom to revenue.",
              "日本の公式IPをインドへ。権利者さま・クリエイター・ファンが共に公式グッズをつくる場です。",
            )}
          </p>
          <p className="mt-4 text-[12px] text-black/40">{t("prototype · thapar japan hackathon · JETRO-PS-02", "試作版 · Thapar Japan Hackathon · JETRO-PS-02")}</p>
        </div>
        {COLUMNS.map((c) => (
          <nav key={c.title[0]} aria-label={t(...c.title)} className="space-y-2.5 text-[14px] tracking-[-0.01em]">
            <div className="pb-1 text-[15px] font-medium text-ink">{t(...c.title)}</div>
            {c.links.map(([href, label, ja]) => (
              <Link key={href} href={href} className="block text-black/55 transition-colors hover:text-ink">
                {t(label, ja)}
              </Link>
            ))}
          </nav>
        ))}
      </div>
      <div aria-hidden className="wordmark-fade mx-auto -mb-[0.2em] max-w-7xl select-none px-4 text-center font-[family-name:var(--font-averia)] text-[clamp(120px,27vw,380px)] font-bold leading-[0.9] tracking-[-0.06em] sm:px-6">
        torii
      </div>
      <p className="mx-auto max-w-7xl px-4 pb-6 text-center text-[11.5px] text-black/40 sm:px-6">
        {t(
          "rule checks enforce declared kit rules. they don’t establish copyright ownership or replace human judgement.",
          "ルールチェックは、キットで定められたルールへの適合を確認するものです。著作権の帰属を証明したり、人による判断に代わったりするものではございません。",
        )}{" "}
        · <span lang="ja">鳥居</span>
      </p>
    </footer>
  );
}
