import { mutate, now, read } from "@/store/lib/db";
import { body, fail, ok } from "@/store/lib/api";
import { toriiStaff } from "@/store/lib/partner-api";
import { releasedChapters } from "@/store/lib/partner";

/**
 * Torii's review of a partner title.
 *  approve: it goes live (chapters that are out appear in Read straight away)
 *  changes: back to the publisher with a note; on a live title this takes it down until it's fixed
 *  reject:  not accepted, with a note
 */
export async function POST(req: Request, { params: paramsIn }: { params: Promise<{ id: string }> }) { const params = await paramsIn;
  const staff = await toriiStaff();
  if (!staff) return fail("Torii staff only", 403);
  const { action, note } = await body<{ action: string; note?: string }>(req);
  const n = String(note ?? "").trim().slice(0, 1000);
  const db = await read();
  const sub = db.submissions.find((s) => s.id === params.id);
  if (!sub) return fail("Title not found", 404);
  const org = db.partners.find((o) => o.id === sub.orgId);
  if (action === "approve") {
    if (sub.status !== "submitted") return fail("Only titles waiting for review can be approved.", 409);
    if (!org?.verified) return fail("Verify the publisher before approving its titles.", 409);
  } else if (action === "changes") {
    if (sub.status !== "submitted" && sub.status !== "approved") return fail("This title isn't in review or live.", 409);
    if (n.length < 5) return fail("Tell the publisher what to change.");
  } else if (action === "reject") {
    if (sub.status !== "submitted") return fail("Only titles waiting for review can be rejected.", 409);
    if (n.length < 5) return fail("Give the publisher a reason.");
  } else return fail("Unknown action");

  const res = await mutate((d) => {
    const s = d.submissions.find((x) => x.id === sub.id)!;
    const ts = now(), by = staff.name || "Torii review team";
    if (action === "approve") {
      s.status = "approved"; s.publishedAt ??= ts;
      const out = releasedChapters(s).length;
      s.history.push({ at: ts, who: "torii", by, action: out ? `Approved. Live on Torii with ${out} chapter${out === 1 ? "" : "s"}` : "Approved. Goes live when chapter 1 is released", note: n || undefined });
    } else if (action === "changes") {
      const wasLive = s.status === "approved";
      s.status = "changes_requested";
      s.history.push({ at: ts, who: "torii", by, action: wasLive ? "Taken down until changes are made" : "Asked for changes", note: n });
    } else {
      s.status = "rejected";
      s.history.push({ at: ts, who: "torii", by, action: "Not accepted", note: n });
    }
    s.updatedAt = ts;
    return { status: s.status, slug: s.slug };
  });
  return ok(res);
}
