import Link from "next/link";
import { read } from "@/store/lib/db";
import { requireAdmin } from "@/store/lib/auth";
import { STATUS, fmtDate, mediaUrl, pageTotal } from "@/store/lib/partner";
import { Cover } from "@/store/components/Art";
import { StatusPill } from "@/store/components/partner/ui";
import VerifyPartner from "@/store/components/VerifyPartner";
import type { ReviewStatus } from "@/store/lib/types";

export const dynamic = "force-dynamic";
export const metadata = { title: "Review queue" };
const TABS: ReviewStatus[] = ["submitted", "approved", "changes_requested", "rejected"];

/** Torii staff: titles publishers have sent through the Partner Portal, and the publishers themselves. */
export default async function ReviewQueue({ searchParams: searchParamsIn }: { searchParams: Promise<{ s?: string }> }) { const searchParams = await searchParamsIn;
  await requireAdmin();
  const db = await read();
  const tab = (TABS as string[]).includes(searchParams.s ?? "") ? (searchParams.s as ReviewStatus) : "submitted";
  const list = db.submissions.filter((s) => s.status === tab).sort((a, b) => (b.submittedAt ?? b.updatedAt).localeCompare(a.submittedAt ?? a.updatedAt));
  const org = (id: string) => db.partners.find((o) => o.id === id);
  return (
    <div className="space-y-6">
      <div>
        <div className="label">Torii staff · Partner Portal</div>
        <h1 className="h-title mt-1">Review queue</h1>
        <p className="mt-1 text-[14px] text-muted">Series Japanese publishers have submitted. Approving one publishes it in Read.</p>
      </div>
      <div className="no-scrollbar -mx-4 flex gap-2 overflow-x-auto px-4">
        {TABS.map((t) => (
          <Link key={t} href={`/publisher/review?s=${t}`} className={tab === t ? "chip-on" : "chip"}>{STATUS[t].label} <span className="ml-1.5 opacity-60">{db.submissions.filter((s) => s.status === t).length}</span></Link>
        ))}
      </div>
      {list.length ? (
        <ul className="space-y-3">
          {list.map((s) => (
            <li key={s.id}>
              <Link href={`/publisher/review/${s.id}`} className="card flex gap-3.5 p-3.5 hover:border-fg/30">
                <div className="w-16 shrink-0"><Cover title={s.title} color={s.color} image={s.coverId ? mediaUrl(s.coverId) : undefined} size="sm" /></div>
                <div className="min-w-0 flex-1">
                  <div className="truncate font-bold">{s.title}</div>
                  {s.titleJa && <div className="jp truncate text-[12.5px] text-muted">{s.titleJa}</div>}
                  <div className="mt-0.5 truncate text-[13px]">{org(s.orgId)?.name}{org(s.orgId)?.verified ? "" : " · unverified"}</div>
                  <div className="mt-1 text-[12px] text-muted">{s.chapters.length} ch · {s.chapters.reduce((a, c) => a + pageTotal(c), 0)} pages · {fmtDate(s.submittedAt ?? s.updatedAt)}</div>
                </div>
                <div className="self-start"><StatusPill status={s.status} ja={false} /></div>
              </Link>
            </li>
          ))}
        </ul>
      ) : (
        <div className="card p-6 text-center text-[14.5px] text-muted">
          {tab === "submitted" ? <>Nothing waiting. Publishers submit at <Link href="/partner" className="font-semibold text-fg underline">/partner</Link>.</> : "Nothing here."}
        </div>
      )}
      <section>
        <h2 className="h-section mb-2.5">Partner publishers</h2>
        <ul className="card divide-y divide-line">
          {db.partners.map((o) => (
            <li key={o.id} className="flex items-center gap-3 px-4 py-3">
              <div className="min-w-0 flex-1">
                <div className="truncate font-semibold">{o.name} {o.nameJa && <span className="jp font-normal text-muted">{o.nameJa}</span>}</div>
                <div className="truncate text-[12.5px] text-muted">{o.contactName} · {o.email} · {o.country}</div>
              </div>
              <VerifyPartner id={o.id} verified={o.verified} />
            </li>
          ))}
        </ul>
      </section>
      <Link href="/publisher" className="btn-ghost w-full">Back to the dashboard</Link>
    </div>
  );
}
