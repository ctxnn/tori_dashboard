import { id, mutate, now } from "@/store/lib/db";
import { body, fail, ok } from "@/store/lib/api";
import { ownSubmission, partnerOr401, text } from "@/store/lib/partner-api";
import { editable } from "@/store/lib/partner";

/** Adds the next chapter (numbered automatically) to a title. */
export async function POST(req: Request, { params: paramsIn }: { params: Promise<{ id: string }> }) { const params = await paramsIn;
  const p = await partnerOr401(); if (p instanceof Response) return p;
  const cur = ownSubmission(p.db, p.org.id, params.id);
  if (!cur) return fail("Title not found", 404);
  if (!editable(cur)) return fail("This title is in review. Withdraw it to add chapters.", 409);
  if (cur.chapters.length >= 2000) return fail("A title can have up to 2,000 chapters");
  const b = await body<{ title?: string }>(req);
  const ch = await mutate((db) => {
    const s = db.submissions.find((x) => x.id === cur.id)!;
    const number = s.chapters.reduce((m, c) => Math.max(m, c.number), 0) + 1;
    const c = { id: id("pc_"), number, title: text(b.title, 100) || `Chapter ${number}`, pages: {}, releaseAt: null, createdAt: now() };
    s.chapters.push(c); s.updatedAt = now();
    return c;
  });
  return ok(ch);
}
