import { mutate, now } from "@/store/lib/db";
import { body, fail, ok } from "@/store/lib/api";
import { ownSubmission, partnerOr401 } from "@/store/lib/partner-api";
import { applyEdits, uniqueSlug } from "@/store/lib/submission-input";
import { editable } from "@/store/lib/partner";
import type { Submission } from "@/store/lib/types";

/** Saves edits to a title. Locked while Torii is reviewing it. Live titles update in the store at once. */
export async function PATCH(req: Request, { params: paramsIn }: { params: Promise<{ id: string }> }) { const params = await paramsIn;
  const p = await partnerOr401(); if (p instanceof Response) return p;
  const cur = ownSubmission(p.db, p.org.id, params.id);
  if (!cur) return fail("Title not found", 404);
  if (!editable(cur)) return fail(cur.status === "submitted" ? "This title is in review. Withdraw it to make changes." : "This title can't be edited.", 409);
  const b = await body<Record<string, unknown>>(req);
  // Check uploads and values against a copy first (blob checks are async; mutate() is not).
  const draft = structuredClone(cur);
  const err = await applyEdits(draft, b, p.org.id);
  if (err) return fail(err);
  const saved = await mutate((db) => {
    const i = db.submissions.findIndex((s) => s.id === cur.id);
    if (i < 0) return null;
    const live = db.submissions[i];
    const next = { ...live, ...pick(draft), updatedAt: now() };
    if (!live.publishedAt && draft.title !== live.title) next.slug = uniqueSlug(db, draft.title, live.id);
    db.submissions[i] = next;
    return next;
  });
  return saved ? ok({ ok: true, slug: saved.slug, updatedAt: saved.updatedAt }) : fail("Title not found", 404);
}

/** Only the editable fields: chapters, status and history are changed by their own endpoints. */
function pick(s: Submission) {
  const { title, titleJa, author, artist, genres, demographic, seriesStatus, synopsis, startYear, ageRating, color, coverId, bannerId, rights, pricing, freeChapters } = s;
  return { title, titleJa, author, artist, genres, demographic, seriesStatus, synopsis, startYear, ageRating, color, coverId, bannerId, rights, pricing, freeChapters };
}

/** Deletes a title that has never been live. */
export async function DELETE(_: Request, { params: paramsIn }: { params: Promise<{ id: string }> }) { const params = await paramsIn;
  const p = await partnerOr401(); if (p instanceof Response) return p;
  const cur = ownSubmission(p.db, p.org.id, params.id);
  if (!cur) return fail("Title not found", 404);
  if (cur.publishedAt || cur.status === "submitted" || cur.status === "approved") return fail("Titles that are in review or have been live can't be deleted. Contact Torii to take one down.", 409);
  await mutate((db) => { db.submissions = db.submissions.filter((s) => s.id !== cur.id); });
  return ok();
}
