import Link from "next/link";
import { requirePartner } from "@/store/lib/partner-auth";
import { STATUS, fmtDate, mediaUrl, releasedChapters } from "@/store/lib/partner";
import { PageHead, StatusPill } from "@/store/components/partner/ui";
import { Cover } from "@/store/components/Art";
import { LANGS, type ReviewStatus } from "@/store/lib/types";

export const dynamic = "force-dynamic";
export const metadata = { title: "Titles" };

const TABS: (ReviewStatus | "all")[] = ["all", "draft", "submitted", "changes_requested", "approved", "rejected"];

export default async function Titles({ searchParams: searchParamsIn }: { searchParams: Promise<{ s?: string }> }) { const searchParams = await searchParamsIn;
  const { org, db } = await requirePartner();
  const tab = (TABS as string[]).includes(searchParams.s ?? "") ? (searchParams.s as ReviewStatus | "all") : "all";
  const mine = db.submissions.filter((s) => s.orgId === org.id).sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  const list = tab === "all" ? mine : mine.filter((s) => s.status === tab);
  const count = (t: ReviewStatus | "all") => (t === "all" ? mine.length : mine.filter((s) => s.status === t).length);
  // Series Torii already carries for this publisher (licensed before the portal existed).
  const catalogue = org.verified ? db.series.filter((s) => s.publisherId === org.publisherId && s.source !== "partner") : [];
  const reads = new Map<string, number>();
  for (const e of db.events) if (e.type === "read") reads.set(e.seriesId, (reads.get(e.seriesId) ?? 0) + 1);
  const langName = (c: string) => LANGS.find((l) => l.code === c)?.name ?? c;

  return (
    <div>
      <PageHead en="Titles" ja="作品管理" sub="Every series you've brought to Torii, from first draft to live.">
        <Link href="/partner/titles/new" className="btn-primary">＋ New title</Link>
      </PageHead>
      <div className="no-scrollbar -mx-1 mb-5 flex gap-2 overflow-x-auto px-1">
        {TABS.map((t) => (
          <Link key={t} href={t === "all" ? "/partner/titles" : `/partner/titles?s=${t}`} className={tab === t ? "chip-on" : "chip"} aria-current={tab === t ? "true" : undefined}>
            {t === "all" ? "All" : STATUS[t].label} <span className="ml-1.5 tabular-nums opacity-60">{count(t)}</span>
          </Link>
        ))}
      </div>

      {list.length ? (
        <div className="card overflow-hidden">
          <table className="w-full text-left text-[14px]">
            <thead className="border-b border-line bg-fg/[.025] text-[12.5px] text-muted">
              <tr><th className="px-4 py-3 font-semibold">Series</th><th className="hidden px-4 py-3 font-semibold md:table-cell">Chapters</th><th className="hidden px-4 py-3 font-semibold lg:table-cell">Languages</th><th className="hidden px-4 py-3 font-semibold sm:table-cell">Updated</th><th className="px-4 py-3 font-semibold">Status</th></tr>
            </thead>
            <tbody className="divide-y divide-line">
              {list.map((s) => (
                <tr key={s.id} className="transition-colors hover:bg-fg/[.02]">
                  <td className="px-4 py-3">
                    <Link href={`/partner/titles/${s.id}`} className="flex items-center gap-3.5">
                      <div className="w-10 shrink-0"><Cover title={s.title} color={s.color} image={s.coverId ? mediaUrl(s.coverId) : undefined} size="sm" /></div>
                      <div className="min-w-0"><div className="truncate font-semibold">{s.title}</div><div className="jp truncate text-[12.5px] text-muted">{s.titleJa || s.author || "—"}</div></div>
                    </Link>
                  </td>
                  <td className="hidden px-4 py-3 tabular-nums md:table-cell">{s.chapters.length}{s.status === "approved" && <span className="text-muted"> · {releasedChapters(s).length} live</span>}</td>
                  <td className="hidden px-4 py-3 text-muted lg:table-cell">{s.rights.languages.map(langName).join(", ")}</td>
                  <td className="hidden px-4 py-3 text-muted sm:table-cell">{fmtDate(s.updatedAt)}</td>
                  <td className="px-4 py-3"><StatusPill status={s.status} ja={false} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="card p-10 text-center">
          <p className="font-semibold">{tab === "all" ? "No titles yet" : `No titles are “${STATUS[tab as ReviewStatus].label}”`}</p>
          {tab === "all" && <Link href="/partner/titles/new" className="btn-primary mt-4">Start your first title</Link>}
        </div>
      )}

      {catalogue.length > 0 && (
        <section className="mt-10">
          <div className="mb-3 flex items-baseline gap-2"><h2 className="text-[17px] font-bold">Already on Torii</h2><span className="jp text-[12.5px] text-muted">配信中のカタログ</span></div>
          <p className="mb-4 max-w-2xl text-[14px] text-muted">Series Torii carries under your existing licence. Their reading and sales data is in India insights and Earnings.</p>
          <ul className="grid grid-cols-3 gap-3 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8">
            {catalogue.slice(0, 32).map((s) => (
              <li key={s.id}>
                <Link href={`/read/${s.slug}`} className="block hover:opacity-85">
                  <Cover title={s.title} color={s.color} image={s.image} size="sm" />
                  <div className="mt-1.5 truncate text-[12.5px] font-semibold">{s.title}</div>
                  <div className="text-[11.5px] text-muted">{(reads.get(s.id) ?? 0).toLocaleString("en-IN")} reads</div>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
