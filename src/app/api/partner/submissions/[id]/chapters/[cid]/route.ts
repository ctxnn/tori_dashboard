import { mutate, now } from "@/store/lib/db";
import { body, fail, ok } from "@/store/lib/api";
import { ownSubmission, partnerOr401, text } from "@/store/lib/partner-api";
import { blobMetas } from "@/store/lib/blobs";
import { chapterState, editable, fmtDate } from "@/store/lib/partner";
import { UPLOAD } from "@/store/lib/config";
import { LANGS, type Lang } from "@/store/lib/types";

/**
 * Edits one chapter:
 *  - title
 *  - lang + pages: the full ordered list of page image ids for that language (upload, reorder, remove)
 *  - releaseAt: "now", an ISO date to schedule it, or null to hold it back
 */
export async function PATCH(req: Request, { params: paramsIn }: { params: Promise<{ id: string; cid: string }> }) { const params = await paramsIn;
  const p = await partnerOr401(); if (p instanceof Response) return p;
  const cur = ownSubmission(p.db, p.org.id, params.id);
  const ch0 = cur?.chapters.find((c) => c.id === params.cid);
  if (!cur || !ch0) return fail("Chapter not found", 404);
  if (!editable(cur)) return fail("This title is in review. Withdraw it to change chapters.", 409);
  const b = await body<{ title?: string; lang?: string; pages?: unknown; releaseAt?: string | null }>(req);

  let pages: string[] | undefined, lang: Lang | undefined;
  if (b.pages !== undefined) {
    lang = b.lang as Lang;
    if (!LANGS.some((l) => l.code === lang)) return fail("Choose a language for these pages");
    if (!cur.rights.languages.includes(lang)) return fail(`Add ${LANGS.find((l) => l.code === lang)!.name} to the title's licensed languages first.`);
    if (!Array.isArray(b.pages) || b.pages.length > UPLOAD.maxPagesPerChapter) return fail(`A chapter can have up to ${UPLOAD.maxPagesPerChapter} pages`);
    pages = b.pages.map(String);
    if (new Set(pages).size !== pages.length) return fail("A page is listed twice");
    const metas = await blobMetas(pages);
    if (metas.some((m) => !m || m.kind !== "page" || m.orgId !== p.org.id)) return fail("Some pages weren't found. Upload them again.");
    if (!pages.length && chapterState(cur, ch0) === "live" && Object.entries(ch0.pages).every(([l, v]) => l === lang || !v?.length))
      return fail("This chapter is live. Readers need at least one language of it.", 409);
  }

  let releaseAt: string | null | undefined;
  if (b.releaseAt !== undefined) {
    if (b.releaseAt === null) {
      if (chapterState(cur, ch0) === "live") return fail("This chapter is already live and can't be held back.", 409);
      releaseAt = null;
    } else if (b.releaseAt === "now") releaseAt = now();
    else {
      const t = Date.parse(String(b.releaseAt));
      if (Number.isNaN(t)) return fail("Enter a valid release date and time");
      if (t > Date.now() + 366 * 864e5) return fail("Schedule releases up to a year ahead");
      if (chapterState(cur, ch0) === "live") return fail("This chapter is already live.", 409);
      releaseAt = new Date(t).toISOString();
    }
  }

  const res = await mutate((db) => {
    const s = db.submissions.find((x) => x.id === cur.id);
    const c = s?.chapters.find((x) => x.id === ch0.id);
    if (!s || !c) return null;
    if (b.title !== undefined) c.title = text(b.title, 100) || `Chapter ${c.number}`;
    if (pages && lang) { if (pages.length) c.pages[lang] = pages; else delete c.pages[lang]; }
    if (releaseAt !== undefined) {
      c.releaseAt = releaseAt;
      if (s.status === "approved" && releaseAt) {
        const future = Date.parse(releaseAt) > Date.now();
        s.history.push({ at: now(), who: "partner", by: p.user.name, action: future ? `Scheduled chapter ${c.number} for ${fmtDate(releaseAt, true)}` : `Released chapter ${c.number}` });
      }
    }
    s.updatedAt = now();
    return { chapter: c, state: chapterState(s, c) };
  });
  return res ? ok(res) : fail("Chapter not found", 404);
}

/** Removes a chapter that isn't live yet. Later chapters move up a number. */
export async function DELETE(_: Request, { params: paramsIn }: { params: Promise<{ id: string; cid: string }> }) { const params = await paramsIn;
  const p = await partnerOr401(); if (p instanceof Response) return p;
  const cur = ownSubmission(p.db, p.org.id, params.id);
  const ch0 = cur?.chapters.find((c) => c.id === params.cid);
  if (!cur || !ch0) return fail("Chapter not found", 404);
  if (!editable(cur)) return fail("This title is in review. Withdraw it to change chapters.", 409);
  if (chapterState(cur, ch0) === "live") return fail("Live chapters can't be deleted. Contact Torii if something is wrong with one.", 409);
  await mutate((db) => {
    const s = db.submissions.find((x) => x.id === cur.id)!;
    s.chapters = s.chapters.filter((c) => c.id !== ch0.id).sort((a, b) => a.number - b.number);
    s.chapters.forEach((c, i) => { if (c.title === `Chapter ${c.number}`) c.title = `Chapter ${i + 1}`; c.number = i + 1; });
    s.updatedAt = now();
  });
  return ok();
}
