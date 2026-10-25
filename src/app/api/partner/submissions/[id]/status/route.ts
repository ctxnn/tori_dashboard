import { mutate, now } from "@/store/lib/db";
import { body, fail, ok } from "@/store/lib/api";
import { ownSubmission, partnerOr401 } from "@/store/lib/partner-api";
import { checklist } from "@/store/lib/partner";

/** submit: send the title to Torii for review. withdraw: take it back to draft while it waits. */
export async function POST(req: Request, { params: paramsIn }: { params: Promise<{ id: string }> }) { const params = await paramsIn;
  const p = await partnerOr401(); if (p instanceof Response) return p;
  const { action, note } = await body<{ action: string; note?: string }>(req);
  const cur = ownSubmission(p.db, p.org.id, params.id);
  if (!cur) return fail("Title not found", 404);
  if (action === "submit") {
    if (cur.status !== "draft" && cur.status !== "changes_requested") return fail("This title has already been sent for review.", 409);
    const missing = checklist(cur).filter((c) => !c.done);
    if (missing.length) return fail(`Before sending: ${missing.map((m) => m.label.toLowerCase()).join("; ")}.`);
  } else if (action === "withdraw") {
    if (cur.status !== "submitted") return fail("Only titles waiting for review can be withdrawn.", 409);
  } else return fail("Unknown action");
  await mutate((db) => {
    const s = db.submissions.find((x) => x.id === cur.id)!;
    const ts = now();
    if (action === "submit") {
      const again = s.status === "changes_requested";
      s.status = "submitted"; s.submittedAt = ts;
      s.history.push({ at: ts, who: "partner", by: p.user.name, action: again ? "Sent back for review with changes" : "Sent for review", note: String(note ?? "").trim().slice(0, 600) || undefined });
    } else {
      s.status = "draft";
      s.history.push({ at: ts, who: "partner", by: p.user.name, action: "Withdrew from review" });
    }
    s.updatedAt = ts;
  });
  return ok();
}
