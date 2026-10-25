import Link from "next/link";
import { Brand } from "@/store/components/partner/ui";
import { currentPartner } from "@/store/lib/partner-auth";
import { getT } from "@/lib/i18n";

export default async function SiteLayout({ children }: { children: React.ReactNode }) {
  const p = await currentPartner();
  const t = await getT("partner");
  return (
    <div className="flex min-h-screen flex-col">
      <header className="sticky top-0 z-30 border-b border-line bg-[rgb(var(--bg)/.88)] backdrop-blur">
        <div className="mx-auto flex h-16 max-w-6xl items-center gap-3 px-5 sm:px-8">
          <Brand />
          <nav className="ml-auto flex items-center gap-1.5 text-[14px] font-semibold">
            <Link href="/partner#terms" className="hidden rounded-full px-3 py-2 hover:bg-fg/5 sm:block">{t("Terms", "契約条件")}</Link>
            <Link href="/read" className="hidden rounded-full px-3 py-2 hover:bg-fg/5 sm:block">{t("Reader app", "リーダーアプリ")}</Link>
            {p ? <Link href="/partner/dashboard" className="btn-ink min-h-[40px] px-4 text-[14px]">{t("Open console", "管理画面へ")}</Link> : (
              <>
                <Link href="/partner/login" className="rounded-full px-3 py-2 hover:bg-fg/5">{t("Sign in", "ログイン")}</Link>
                <Link href="/partner/apply" className="btn-primary min-h-[40px] px-4 text-[14px]">{t("Join", "新規登録")}</Link>
              </>
            )}
          </nav>
        </div>
      </header>
      <main className="flex-1">{children}</main>
      <footer className="border-t border-line">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-x-6 gap-y-2 px-5 py-6 text-[12.5px] text-muted sm:px-8">
          <span>{t("Torii Partner Programme · prototype", "Toriiパートナープログラム · 試作版")}</span>
          <span className="jp">トリイ・パートナープログラム</span>
          <Link href="/publisher/review" className="ml-auto underline underline-offset-2">{t("Torii staff: review queue", "Torii担当者用：審査一覧")}</Link>
        </div>
      </footer>
    </div>
  );
}
