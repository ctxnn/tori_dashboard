import { notFound } from "next/navigation";
import { read } from "@/store/lib/db";
import { currentUser } from "@/store/lib/auth";
import { canRead, isChapterFree, ownedVolumes } from "@/store/lib/catalog";
import { chapterAt, partnerPageCount, volumeAt } from "@/store/lib/derive";
import Reader from "@/store/components/Reader";
import UnlockGate from "@/store/components/UnlockGate";
import { LANGS, type Lang } from "@/store/lib/types";
import { CHAPTER_PRICE } from "@/store/lib/config";

export const dynamic = "force-dynamic";
export async function generateMetadata({ params: paramsIn }: { params: Promise<{ slug: string; chapter: string }> }) { const params = await paramsIn;
  const s = (await read()).series.find((x) => x.slug === params.slug);
  return { title: s ? `${s.title} · Ch. ${params.chapter}` : "Not found" };
}

export default async function ChapterPage({ params: paramsIn, searchParams: searchParamsIn }: { params: Promise<{ slug: string; chapter: string }>; searchParams: Promise<{ lang?: string }> }) { const params = await paramsIn; const searchParams = await searchParamsIn;
  const db = await read();
  const s = db.series.find((x) => x.slug === params.slug);
  const n = parseInt(params.chapter, 10);
  const ch = s && chapterAt(db, s, n);
  if (!s || !ch) notFound();
  const user = await currentUser();
  const lang: Lang = s.languages.includes(searchParams.lang as Lang) ? (searchParams.lang as Lang) : "en";
  const langs = LANGS.filter((l) => s.languages.includes(l.code)).map((l) => ({ code: l.code, native: l.native }));
  const next = chapterAt(db, s, n + 1);

  if (!canRead(db, ch, user)) {
    return <UnlockGate slug={s.slug} title={s.title} chapter={n} chapterId={ch.id} lang={lang} price={CHAPTER_PRICE}
      signedIn={!!user} wallet={user?.wallet ?? 0} color={s.color} />;
  }

  // End-of-volume bridge to print: this chapter is the last one collected in its volume.
  const isVolumeEnd = ch.volumeNumber > 0 && (!next || next.volumeNumber !== ch.volumeNumber);
  const vol = isVolumeEnd ? volumeAt(db, s, ch.volumeNumber) : undefined;
  const owns = vol && user ? ownedVolumes(db, user.id, s.id).has(vol.number) : false;

  return (
    <Reader
      slug={s.slug} title={s.title} chapter={n} pages={partnerPageCount(s, n, lang)?.count ?? ch.pages}
      chapterTitle={s.source === "partner" && ch.title !== `Chapter ${n}` ? ch.title : undefined} lang={lang} langs={langs} total={s.totalChapters}
      next={next ? { number: next.number, locked: !canRead(db, next, user), free: isChapterFree(db, next) } : null}
      bridge={vol ? { volumeId: vol.id, number: vol.number, price: vol.price, edition: vol.edition, inStock: vol.stock > 0, owned: owns } : null}
      signedIn={!!user}
    />
  );
}
