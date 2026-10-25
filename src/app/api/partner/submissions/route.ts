import { id, mutate, now } from "@/store/lib/db";
import { body, fail, ok } from "@/store/lib/api";
import { partnerOr401, text } from "@/store/lib/partner-api";
import { randomColor, uniqueSlug } from "@/store/lib/submission-input";
import { FREE_CHAPTERS_IN_PAID_MODE } from "@/store/lib/config";

/** Starts a new title as a draft. Everything else is filled in on the title's page. */
export async function POST(req: Request) {
  const p = await partnerOr401(); if (p instanceof Response) return p;
  const b = await body<{ title?: string; titleJa?: string }>(req);
  const title = text(b.title, 120);
  if (!title) return fail("Enter the series title");
  if (p.db.submissions.filter((s) => s.orgId === p.org.id && s.status === "draft").length >= 25) return fail("You have 25 drafts already. Finish or delete some first.");
  const sid = await mutate((db) => {
    const ts = now(), sid = id("sub_");
    db.submissions.push({
      id: sid, orgId: p.org.id, publisherId: p.org.publisherId, slug: uniqueSlug(db, title),
      title, titleJa: text(b.titleJa, 120), author: "", artist: "", genres: [], demographic: "", seriesStatus: "ongoing", synopsis: "",
      startYear: new Date().getFullYear(), ageRating: "13+", color: randomColor(), coverId: null, bannerId: null,
      rights: { languages: ["en"], digital: true, print: false, merch: false, termYears: 3, exclusive: true },
      pricing: "platform", freeChapters: FREE_CHAPTERS_IN_PAID_MODE, status: "draft", chapters: [],
      history: [{ at: ts, who: "partner", by: p.user.name, action: "Created the draft" }],
      createdAt: ts, updatedAt: ts, submittedAt: null, publishedAt: null,
    });
    return sid;
  });
  return ok({ id: sid });
}
