import { mutate, read } from "@/store/lib/db";
import { currentUser } from "@/store/lib/auth";
import { body, fail, ok } from "@/store/lib/api";
import { chapterAt } from "@/store/lib/derive";
// Per-chapter override: free = true (always free), false (always paid), null (follow reading mode).
export async function POST(req: Request) {
  if (!(await currentUser())?.isAdmin) return fail("Publisher access only", 403);
  const { slug, number, free } = await body<{ slug: string; number: number; free: boolean | null }>(req);
  const s = (await read()).series.find((x) => x.slug === slug);
  if (!s) return fail("Series not found", 404);
  const res = await mutate((db) => {
    const ch = chapterAt(db, s, Number(number));
    if (!ch) return null;
    if (free === null) delete db.chapterOverrides[ch.id]; else db.chapterOverrides[ch.id] = !!free;
    return { title: s.title, number: ch.number, freeOverride: free === null ? null : !!free };
  });
  return res ? ok(res) : fail("Chapter not found", 404);
}
