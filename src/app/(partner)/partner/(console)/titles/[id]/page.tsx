import { notFound } from "next/navigation";
import { requirePartner } from "@/store/lib/partner-auth";
import { chapterState, toSeries } from "@/store/lib/partner";
import { publisherName } from "@/store/lib/catalog";
import { CHAPTER_PRICE, PARTNER_TERMS } from "@/store/lib/config";
import TitleEditor from "@/store/components/partner/TitleEditor";

export const dynamic = "force-dynamic";
export const metadata = { title: "Title" };

export default async function TitlePage({ params: paramsIn }: { params: Promise<{ id: string }> }) { const params = await paramsIn;
  const { org, db } = await requirePartner(`/partner/titles/${params.id}`);
  const sub = db.submissions.find((s) => s.id === params.id && s.orgId === org.id);
  if (!sub) notFound();
  const chapterStates = Object.fromEntries(sub.chapters.map((c) => [c.id, chapterState(sub, c)]));
  return (
    <TitleEditor sub={sub} chapterStates={chapterStates} liveSlug={toSeries(sub) ? sub.slug : null} verified={org.verified}
      chapterPrice={CHAPTER_PRICE} unlockShare={PARTNER_TERMS.unlockShare} printShare={PARTNER_TERMS.printShare} figureShare={PARTNER_TERMS.figureShare}
      publisherName={publisherName(db, org.publisherId) || org.name} />
  );
}
