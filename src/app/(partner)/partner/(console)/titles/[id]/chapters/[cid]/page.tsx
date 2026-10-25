import { notFound } from "next/navigation";
import { requirePartner } from "@/store/lib/partner-auth";
import { chapterState, editable } from "@/store/lib/partner";
import { LANGS } from "@/store/lib/types";
import ChapterEditor from "@/store/components/partner/ChapterEditor";

export const dynamic = "force-dynamic";
export const metadata = { title: "Chapter" };

export default async function ChapterPage({ params: paramsIn }: { params: Promise<{ id: string; cid: string }> }) { const params = await paramsIn;
  const { org, db } = await requirePartner(`/partner/titles/${params.id}/chapters/${params.cid}`);
  const sub = db.submissions.find((s) => s.id === params.id && s.orgId === org.id);
  const ch = sub?.chapters.find((c) => c.id === params.cid);
  if (!sub || !ch) notFound();
  // Licensed languages, plus any that still hold pages.
  const langs = LANGS.filter((l) => sub.rights.languages.includes(l.code) || ch.pages[l.code]?.length).map((l) => ({ code: l.code, name: l.name, native: l.native }));
  return (
    <ChapterEditor key={ch.id} subId={sub.id} subTitle={sub.title} color={sub.color} chapter={ch} state={chapterState(sub, ch)}
      canEdit={editable(sub)} seriesLive={sub.status === "approved"} langs={langs} />
  );
}
