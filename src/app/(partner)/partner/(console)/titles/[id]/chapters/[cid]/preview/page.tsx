import Link from "next/link";
import { notFound } from "next/navigation";
import { requirePartner } from "@/store/lib/partner-auth";
import { pickPages, mediaUrl } from "@/store/lib/partner";
import { LANGS, type Lang } from "@/store/lib/types";

export const dynamic = "force-dynamic";
export const metadata = { title: "Preview" };

/** The chapter as a reader would scroll it, before it's released. Only the publisher (and Torii) can load these pages. */
export default async function Preview({ params: paramsIn, searchParams: searchParamsIn }: { params: Promise<{ id: string; cid: string }>; searchParams: Promise<{ lang?: string }> }) { const params = await paramsIn; const searchParams = await searchParamsIn;
  const { org, db } = await requirePartner();
  const sub = db.submissions.find((s) => s.id === params.id && s.orgId === org.id);
  const ch = sub?.chapters.find((c) => c.id === params.cid);
  if (!sub || !ch) notFound();
  const pick = pickPages(ch, (searchParams.lang as Lang) || "en");
  const langs = LANGS.filter((l) => ch.pages[l.code]?.length);
  return (
    <div className="-mx-5 -mt-8 bg-[#111] text-white sm:-mx-8 lg:-mt-10">
      <div className="sticky top-0 z-10 flex flex-wrap items-center gap-3 bg-black/85 px-5 py-3 backdrop-blur sm:px-8">
        <Link href={`/partner/titles/${sub.id}/chapters/${ch.id}`} className="text-[14px] font-semibold text-white/80 hover:text-white">← Back</Link>
        <div className="min-w-0 flex-1 truncate text-[14px]"><b>{sub.title}</b> · Chapter {ch.number}: {ch.title} <span className="text-white/50">(preview)</span></div>
        <div className="flex gap-1.5">{langs.map((l) => (
          <Link key={l.code} href={`?lang=${l.code}`} className={`rounded-full px-3 py-1 text-[12.5px] font-semibold ${pick?.lang === l.code ? "bg-white text-black" : "bg-white/10"}`}>{l.native}</Link>
        ))}</div>
      </div>
      <div className="mx-auto max-w-2xl">
        {pick ? pick.ids.map((id, i) => (
          // eslint-disable-next-line @next/next/no-img-element
          <img key={id} src={mediaUrl(id)} alt={`Page ${i + 1}`} className="block w-full" loading={i < 2 ? "eager" : "lazy"} />
        )) : <p className="py-24 text-center text-white/60">No pages uploaded yet.</p>}
        <p className="py-10 text-center text-[13px] text-white/50">End of chapter {ch.number}</p>
      </div>
    </div>
  );
}
