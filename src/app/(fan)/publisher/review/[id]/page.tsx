import Link from "next/link";
import { notFound } from "next/navigation";
import { read } from "@/store/lib/db";
import { requireAdmin } from "@/store/lib/auth";
import { chapterState, fmtDate, mediaUrl, sortedChapters } from "@/store/lib/partner";
import { Cover } from "@/store/components/Art";
import { ChapterPill, StatusPill } from "@/store/components/partner/ui";
import ReviewActions from "@/store/components/ReviewActions";
import { LANGS } from "@/store/lib/types";

export const dynamic = "force-dynamic";
export const metadata = { title: "Review" };

export default async function ReviewTitle({ params: paramsIn }: { params: Promise<{ id: string }> }) { const params = await paramsIn;
  await requireAdmin();
  const db = await read();
  const s = db.submissions.find((x) => x.id === params.id);
  if (!s) notFound();
  const org = db.partners.find((o) => o.id === s.orgId);
  const lang = (c: string) => LANGS.find((l) => l.code === c)?.name ?? c;
  const partnerNote = [...s.history].reverse().find((h) => h.who === "partner" && h.note);
  const facts: [string, string][] = [
    ["Author", s.artist && s.artist !== s.author ? `${s.author} (story), ${s.artist} (art)` : s.author || "—"],
    ["Genres", s.genres.join(", ") || "—"], ["Demographic", s.demographic || "—"],
    ["In Japan", `${s.seriesStatus === "ongoing" ? "Ongoing" : "Completed"}, since ${s.startYear}`], ["Age rating", s.ageRating === "all" ? "All ages" : s.ageRating],
    ["Languages", s.rights.languages.map(lang).join(", ")],
    ["Rights", [s.rights.digital && "Digital", s.rights.print && "Print", s.rights.merch && "Merchandise"].filter(Boolean).join(", ") + ` · ${s.rights.termYears} yr · ${s.rights.exclusive ? "exclusive" : "non-exclusive"}`],
    ["Pricing", s.pricing === "free" ? "Free to read" : `First ${s.freeChapters} free, then ₹9`],
  ];
  return (
    <div className="space-y-6">
      <Link href="/publisher/review" className="text-[13.5px] font-semibold text-muted">← Review queue</Link>
      <section className="flex gap-4">
        <div className="w-[34%] max-w-[140px] shrink-0"><Cover title={s.title} color={s.color} image={s.coverId ? mediaUrl(s.coverId) : undefined} size="md" /></div>
        <div className="min-w-0 self-end">
          <StatusPill status={s.status} />
          <h1 className="mt-2 font-display text-[26px] leading-[1.05]">{s.title}</h1>
          {s.titleJa && <div className="jp text-[14px] text-muted">{s.titleJa}</div>}
          <div className="mt-1.5 text-[13.5px] font-semibold">{org?.name}{org?.nameJa ? ` · ${org.nameJa}` : ""}</div>
          <div className={`text-[12.5px] font-semibold ${org?.verified ? "text-ok" : "text-warn"}`}>{org?.verified ? "✓ Verified publisher" : "Publisher not verified yet"}</div>
        </div>
      </section>
      {partnerNote && <p className="rounded-xl bg-fg/[.04] px-4 py-3 text-[14px]"><b>Note from {partnerNote.by}:</b> “{partnerNote.note}”</p>}
      <ReviewActions id={s.id} status={s.status} verified={!!org?.verified} orgId={s.orgId} slug={s.slug} />
      <p className="text-[15px] leading-relaxed">{s.synopsis}</p>
      <dl className="card divide-y divide-line text-[14px]">
        {facts.map(([k, v]) => <div key={k} className="flex gap-3 px-4 py-2.5"><dt className="w-28 shrink-0 text-muted">{k}</dt><dd className="min-w-0 font-semibold">{v}</dd></div>)}
      </dl>
      <section>
        <h2 className="h-section mb-2.5">Chapters</h2>
        <ul className="space-y-2.5">
          {sortedChapters(s).map((c) => {
            const langs = LANGS.filter((l) => c.pages[l.code]?.length);
            const first = langs[0] ? c.pages[langs[0].code]! : [];
            return (
              <li key={c.id} className="card p-3.5">
                <details>
                  <summary className="flex cursor-pointer list-none items-center gap-2">
                    <span className="font-bold">{c.number}. {c.title}</span>
                    <span className="ml-auto"><ChapterPill state={chapterState(s, c)} /></span>
                  </summary>
                  <div className="mt-1 text-[12.5px] text-muted">{langs.map((l) => `${l.name} ${c.pages[l.code]!.length}p`).join(" · ") || "No pages"}{c.releaseAt ? ` · release ${fmtDate(c.releaseAt, true)}` : " · held as draft"}</div>
                  {first.length > 0 && (
                    <div className="no-scrollbar -mx-3.5 mt-3 flex gap-2 overflow-x-auto px-3.5">
                      {first.map((id, i) => (
                        <a key={id} href={mediaUrl(id)} target="_blank" className="w-[30%] shrink-0">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img src={mediaUrl(id)} alt={`Page ${i + 1}`} loading="lazy" className="aspect-[2/3] w-full rounded-md border border-line bg-white object-cover object-top" />
                        </a>
                      ))}
                    </div>
                  )}
                </details>
              </li>
            );
          })}
        </ul>
      </section>
      <section>
        <h2 className="h-section mb-2.5">History</h2>
        <ol className="space-y-2.5 text-[13.5px]">
          {[...s.history].reverse().map((h, i) => (
            <li key={i}><b>{h.who === "torii" ? "Torii" : h.by}</b>: {h.action}{h.note ? ` — “${h.note}”` : ""} <span className="text-muted">· {fmtDate(h.at, true)}</span></li>
          ))}
        </ol>
      </section>
    </div>
  );
}
