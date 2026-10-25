import Link from "next/link";
import { Brand } from "@/store/components/partner/ui";
import { currentPartner } from "@/store/lib/partner-auth";

export default async function SiteLayout({ children }: { children: React.ReactNode }) {
  const p = await currentPartner();
  return (
    <div className="flex min-h-screen flex-col">
      <header className="sticky top-0 z-30 border-b border-line bg-[rgb(var(--bg)/.88)] backdrop-blur">
        <div className="mx-auto flex h-16 max-w-6xl items-center gap-3 px-5 sm:px-8">
          <Brand />
          <nav className="ml-auto flex items-center gap-1.5 text-[14px] font-semibold">
            <Link href="/partner#terms" className="hidden rounded-full px-3 py-2 hover:bg-fg/5 sm:block">Terms</Link>
            <Link href="/read" className="hidden rounded-full px-3 py-2 hover:bg-fg/5 sm:block">Reader app</Link>
            {p ? <Link href="/partner/dashboard" className="btn-ink min-h-[40px] px-4 text-[14px]">Open console</Link> : (
              <>
                <Link href="/partner/login" className="rounded-full px-3 py-2 hover:bg-fg/5">Sign in</Link>
                <Link href="/partner/apply" className="btn-primary min-h-[40px] px-4 text-[14px]">Join</Link>
              </>
            )}
          </nav>
        </div>
      </header>
      <main className="flex-1">{children}</main>
      <footer className="border-t border-line">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-x-6 gap-y-2 px-5 py-6 text-[12.5px] text-muted sm:px-8">
          <span>Torii Partner Programme · prototype</span>
          <span className="jp">トリイ・パートナープログラム</span>
          <Link href="/publisher/review" className="ml-auto underline underline-offset-2">Torii staff: review queue</Link>
        </div>
      </footer>
    </div>
  );
}
