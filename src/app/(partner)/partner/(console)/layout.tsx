import Link from "next/link";
import { requirePartner } from "@/store/lib/partner-auth";
import PartnerNav from "@/store/components/partner/PartnerNav";
import SignOut from "@/store/components/partner/SignOut";
import { Brand } from "@/store/components/partner/ui";
import { uiMode } from "@/lib/ui-mode";
import { V2PartnerNav } from "@/components/v2/partner-nav";

export const dynamic = "force-dynamic";

/** Signed-in publisher console: a dark sidebar on desktop, a top bar on phones. */
export default async function ConsoleLayout({ children }: { children: React.ReactNode }) {
  const { user, org, db } = await requirePartner();
  const mine = db.submissions.filter((s) => s.orgId === org.id);
  const needs = mine.filter((s) => s.status === "changes_requested").length;
  if ((await uiMode()) === "new") {
    return (
      <div className="lg:grid lg:min-h-screen lg:grid-cols-[264px_1fr]">
        <aside className="sticky top-0 z-30 border-b border-black/[0.06] bg-[#ececef]/85 backdrop-blur-xl lg:static lg:border-b-0 lg:border-r">
          <div className="flex flex-col gap-4 px-4 py-3 lg:sticky lg:top-0 lg:h-screen lg:gap-6 lg:overflow-y-auto lg:px-4 lg:py-6">
            <div className="flex items-center gap-3 px-1">
              <Brand href="/partner/dashboard" />
              <div className="ml-auto lg:hidden"><SignOut className="gel gel-white px-3 py-1 text-[13px]" /></div>
            </div>
            <V2PartnerNav badge={needs ? { "/partner/titles": needs } : undefined} />
            <Link href="/partner/titles/new" className="gel gel-blue hidden h-10 items-center justify-center gap-2 px-4 text-[14.5px] lg:flex">
              <span aria-hidden className="text-[17px] leading-none">＋</span> new title <span className="jp text-[11.5px] opacity-80">新規申請</span>
            </Link>
            <div className="mt-auto hidden space-y-3 lg:block">
              <div className="soft-card rounded-[18px] p-4 text-[13px]">
                <div className="font-medium tracking-[-0.02em]">{org.name}</div>
                {org.nameJa && <div className="jp text-black/50">{org.nameJa}</div>}
                <div className={`mt-2 inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[11.5px] font-medium ${org.verified ? "bg-[#dff2e6] text-[#1d7552]" : "bg-[#f8ecd3] text-[#a2650b]"}`}>
                  {org.verified ? "✓ verified partner" : "verification pending"}
                </div>
                <div className="mt-3 text-black/55">{user.name} · {user.role === "owner" ? "owner" : "editor"}<br /><span className="text-black/40">{user.email}</span></div>
              </div>
              <div className="flex flex-wrap gap-x-3 gap-y-1 px-1 text-[13px] text-black/55">
                <Link href="/read" className="hover:text-[#0c0c0f]">fan app ↗</Link>
                <Link href="/" className="hover:text-[#0c0c0f]">workspace ↗</Link>
                <SignOut className="hover:text-[#0c0c0f]" />
              </div>
            </div>
          </div>
        </aside>
        <div className="min-w-0">
          <div className="mx-auto max-w-[1180px] px-5 pb-24 pt-8 sm:px-8 lg:pt-10">
            <div key="page" className="animate-page-in">{children}</div>
          </div>
        </div>
      </div>
    );
  }
  return (
    <div className="lg:grid lg:min-h-screen lg:grid-cols-[256px_1fr]">
      <aside className="sticky top-0 z-30 bg-ink text-white lg:static dark:bg-[rgb(10,9,16)]">
        <div className="flex flex-col gap-4 px-4 py-3 lg:sticky lg:top-0 lg:h-screen lg:gap-6 lg:overflow-y-auto lg:px-5 lg:py-6">
          <div className="flex items-center gap-3">
            <Brand href="/partner/dashboard" />
            <div className="ml-auto lg:hidden"><SignOut className="rounded-full px-3 py-1.5 text-[13px] font-semibold text-white/75 ring-1 ring-white/20" /></div>
          </div>
          <PartnerNav badge={needs ? { "/partner/titles": needs } : undefined} />
          <Link href="/partner/titles/new" className="hidden items-center justify-center gap-2 rounded-xl bg-[rgb(222,0,52)] px-3 py-2.5 text-[14px] font-bold text-white shadow-panel-sm transition hover:brightness-110 lg:flex">
            <span aria-hidden className="text-[18px] leading-none">＋</span> New title <span className="jp text-[11.5px] font-normal opacity-80">新規申請</span>
          </Link>
          <div className="mt-auto hidden space-y-3 border-t border-white/10 pt-5 text-[13px] lg:block">
            <div>
              <div className="font-bold">{org.name}</div>
              {org.nameJa && <div className="jp text-white/55">{org.nameJa}</div>}
              <div className={`mt-2 inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[11.5px] font-semibold ${org.verified ? "bg-[rgb(0_135_90/.25)] text-[rgb(120,230,180)]" : "bg-[rgb(200_120_0/.25)] text-[rgb(255,200,120)]"}`}>
                {org.verified ? "✓ Verified partner" : "Verification pending"}
              </div>
            </div>
            <div className="text-white/60">{user.name} · {user.role === "owner" ? "Owner" : "Editor"}<br /><span className="text-white/40">{user.email}</span></div>
            <div className="flex gap-3">
              <Link href="/read" className="text-white/70 underline-offset-2 hover:underline">Fan app ↗</Link>
              <Link href="/" className="text-white/70 underline-offset-2 hover:underline">Workspace ↗</Link>
              <SignOut className="text-white/70 underline-offset-2 hover:underline" />
            </div>
          </div>
        </div>
      </aside>
      <div className="min-w-0">
        <div className="mx-auto max-w-[1180px] px-5 pb-24 pt-8 sm:px-8 lg:pt-10">
          <div key="page" className="animate-page-in">{children}</div>
        </div>
      </div>
    </div>
  );
}
