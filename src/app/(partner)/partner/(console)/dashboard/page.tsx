import Link from "next/link";
import { requirePartner } from "@/store/lib/partner-auth";
import { checklist, fmtDate, mediaUrl, publisherEvents, releasedChapters, shareOf } from "@/store/lib/partner";
import { Card, PageHead, Stat, StatusPill, inr } from "@/store/components/partner/ui";
import { Cover } from "@/store/components/Art";
import { merchForOwner } from "@/store/lib/collabs";

export const dynamic = "force-dynamic";
export const metadata = { title: "Overview" };

export default async function Overview({ searchParams: searchParamsIn }: { searchParams: Promise<{ welcome?: string }> }) { const searchParams = await searchParamsIn;
  const { user, org, db } = await requirePartner();
  const mine = db.submissions.filter((s) => s.orgId === org.id).sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  const since = Date.now() - 90 * 864e5;
  const ev = org.verified ? publisherEvents(db, org.publisherId).filter((e) => Date.parse(e.createdAt) > since) : [];
  const earned = ev.reduce((a, e) => a + shareOf(e), 0);
  const liveCount = db.series.filter((s) => s.publisherId === org.publisherId).length;
  const changes = mine.filter((s) => s.status === "changes_requested");
  const drafts = mine.filter((s) => s.status === "draft");
  const review = mine.filter((s) => s.status === "submitted");
  const activity = mine.flatMap((s) => s.history.map((h) => ({ ...h, title: s.title, id: s.id }))).sort((a, b) => b.at.localeCompare(a.at)).slice(0, 8);
  const first = user.name.split(" ")[0];
  const merch = merchForOwner(org.name);

  return (
    <div className="space-y-6">
      <PageHead en={`Welcome, ${first}`} ja="概要" sub={`${org.name}${org.nameJa ? ` · ${org.nameJa}` : ""} on Torii. Here is what needs you and how your titles are doing in India.`}>
        <Link href="/partner/titles/new" className="btn-primary">＋ New title</Link>
      </PageHead>

      {searchParams.welcome && (
        <div className="panel paper-band p-5">
          <div className="text-[17px] font-bold">Your partner account is ready.</div>
          <p className="mt-1 text-[14.5px] text-muted">Start your first title now. Torii is verifying {org.name}; titles go live once that&apos;s done.</p>
        </div>
      )}
      {!org.verified && (
        <div role="status" className="flex flex-wrap items-center gap-3 rounded-panel border border-warn/30 bg-warn/10 px-5 py-4 text-[14.5px]">
          <b className="text-warn">Verification pending</b>
          <span className="text-fg/80">Torii is checking {org.name}&apos;s company and rights details (usually two working days). You can prepare and submit titles meanwhile. Sales data appears once you&apos;re verified.</span>
        </div>
      )}

      {(changes.length > 0 || drafts.length > 0 || review.length > 0) && (
        <Card title="Needs your attention" ja="対応が必要な作品">
          <ul className="divide-y divide-line">
            {changes.map((s) => {
              const note = [...s.history].reverse().find((h) => h.who === "torii")?.note;
              return (
                <li key={s.id} className="flex flex-wrap items-center gap-3 py-3">
                  <StatusPill status={s.status} /><span className="font-semibold">{s.title}</span>
                  {note && <span className="w-full text-[14px] text-muted sm:w-auto sm:flex-1">“{note}”</span>}
                  <Link href={`/partner/titles/${s.id}`} className="btn-ghost ml-auto min-h-[38px] px-4 text-[13.5px]">Fix and resend</Link>
                </li>
              );
            })}
            {drafts.map((s) => {
              const c = checklist(s), done = c.filter((x) => x.done).length;
              return (
                <li key={s.id} className="flex flex-wrap items-center gap-3 py-3">
                  <StatusPill status={s.status} /><span className="font-semibold">{s.title}</span>
                  <span className="text-[13.5px] text-muted">{done} of {c.length} steps done</span>
                  <Link href={`/partner/titles/${s.id}`} className="btn-ghost ml-auto min-h-[38px] px-4 text-[13.5px]">Continue</Link>
                </li>
              );
            })}
            {review.map((s) => (
              <li key={s.id} className="flex flex-wrap items-center gap-3 py-3">
                <StatusPill status={s.status} /><span className="font-semibold">{s.title}</span>
                <span className="text-[13.5px] text-muted">Sent {fmtDate(s.submittedAt)}. Torii usually replies within 3 working days.</span>
              </li>
            ))}
          </ul>
        </Card>
      )}

      {org.verified ? (
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <Stat label="Chapters read, 90 days" value={ev.filter((e) => e.type === "read").length.toLocaleString("en-IN")} sub="across all your titles" />
          <Stat label="Paid unlocks, 90 days" value={ev.filter((e) => e.type === "unlock").length.toLocaleString("en-IN")} sub="₹9 each" />
          <Stat label="Titles live on Torii" value={String(liveCount)} sub={`${mine.filter((s) => s.status === "approved").length} added through the portal`} />
          <Stat strong label="Your earnings, 90 days" value={inr(earned)} sub="unlocks, print and merchandise" />
        </div>
      ) : null}

      {merch.kits.length > 0 && (
        <Link href="/partner/merch" className="panel paper-band flex flex-wrap items-center gap-x-6 gap-y-2 p-5 transition hover:brightness-[1.02]">
          <div className="min-w-0">
            <div className="jp text-[12.5px] text-accent">グッズ・コラボ</div>
            <div className="text-[17px] font-bold tracking-[-0.02em]">Merch collabs from {merch.kits.map((k) => k.property).join(", ")}</div>
            <div className="text-[14px] text-muted">{merch.collabs.length} collaborations by Indian creators · {merch.unitsBacked} units backed · {merch.royalty} royalty</div>
          </div>
          {merch.awaitingApproval > 0 && <span className="pill bg-warn/10 text-warn ring-warn/30">{merch.awaitingApproval} to approve</span>}
          <span className="ml-auto font-semibold text-accent">Open →</span>
        </Link>
      )}

      <div className="grid gap-6 lg:grid-cols-[1.4fr_1fr]">
        <Card title="Your titles" ja="作品" action={<Link href="/partner/titles" className="text-[13.5px] font-semibold text-accent">All titles</Link>}>
          {mine.length ? (
            <ul className="divide-y divide-line">
              {mine.slice(0, 6).map((s) => (
                <li key={s.id}>
                  <Link href={`/partner/titles/${s.id}`} className="flex items-center gap-4 py-3 hover:opacity-80">
                    <div className="w-11 shrink-0"><Cover title={s.title} color={s.color} image={s.coverId ? mediaUrl(s.coverId) : undefined} size="sm" /></div>
                    <div className="min-w-0 flex-1">
                      <div className="truncate font-semibold">{s.title}</div>
                      <div className="truncate text-[13px] text-muted">{s.titleJa && <span className="jp mr-2">{s.titleJa}</span>}{s.chapters.length} chapter{s.chapters.length === 1 ? "" : "s"}{s.status === "approved" ? `, ${releasedChapters(s).length} live` : ""}</div>
                    </div>
                    <StatusPill status={s.status} ja={false} />
                  </Link>
                </li>
              ))}
            </ul>
          ) : (
            <div className="rounded-xl border border-dashed border-line p-8 text-center">
              <p className="font-semibold">No titles yet</p>
              <p className="mt-1 text-[14px] text-muted">Add your first series: details, cover, rights, then chapters.</p>
              <Link href="/partner/titles/new" className="btn-primary mt-4">Start a title</Link>
            </div>
          )}
        </Card>
        <Card title="Recent activity" ja="履歴">
          {activity.length ? (
            <ol className="space-y-3.5">
              {activity.map((a, i) => (
                <li key={i} className="flex gap-3 text-[14px]">
                  <span aria-hidden className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${a.who === "torii" ? "bg-accent" : "bg-fg/30"}`} />
                  <div className="min-w-0">
                    <div><Link href={`/partner/titles/${a.id}`} className="font-semibold hover:underline">{a.title}</Link>: {a.action}</div>
                    {a.note && <div className="mt-0.5 text-[13.5px] text-muted">“{a.note}”</div>}
                    <div className="mt-0.5 text-[12px] text-muted">{a.who === "torii" ? "Torii" : a.by} · {fmtDate(a.at, true)}</div>
                  </div>
                </li>
              ))}
            </ol>
          ) : <p className="text-[14px] text-muted">Reviews, releases and changes to your titles show up here.</p>}
        </Card>
      </div>
    </div>
  );
}
