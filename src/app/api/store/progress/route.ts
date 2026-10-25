import { mutate, read, now } from "@/store/lib/db";
import { currentUser } from "@/store/lib/auth";
import { canRead, } from "@/store/lib/catalog";
import { logRead } from "@/store/lib/payments";
import { chapterAt } from "@/store/lib/derive";
import { body, fail, ok } from "@/store/lib/api";
import type { Lang } from "@/store/lib/types";

export async function POST(req: Request) {
  const { slug, chapter, language } = await body<{ slug: string; chapter: number; language: Lang }>(req);
  const db0 = await read();
  const s = db0.series.find((x) => x.slug === slug);
  const ch = s && chapterAt(db0, s, Number(chapter));
  if (!s || !ch) return fail("Not found", 404);
  const user = await currentUser();
  if (!canRead(db0, ch, user)) return fail("Locked", 403);
  const lang: Lang = s.languages.includes(language) ? language : "en";
  await mutate((db) => {
    logRead(db, user?.id ?? null, s.id, lang);
    if (!user) return;
    const p = db.progress.find((x) => x.userId === user.id && x.seriesId === s.id);
    if (p) { p.chapter = ch.number; p.language = lang; p.updatedAt = now(); }
    else db.progress.push({ userId: user.id, seriesId: s.id, chapter: ch.number, language: lang, updatedAt: now() });
  });
  return ok();
}
