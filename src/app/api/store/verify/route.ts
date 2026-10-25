import { mutate, read, now } from "@/store/lib/db";
import { currentUser } from "@/store/lib/auth";
import { normalizeCode, signatureValid } from "@/store/lib/tags";
import { addOwnership } from "@/store/lib/payments";
import { volumeById } from "@/store/lib/derive";
import { fmtDate } from "@/store/lib/format";
import { body, ok } from "@/store/lib/api";
import { verifyCode } from "@/lib/domain/authenticity";

export type VerifyResult =
  | { state: "genuine"; title: string; kind: string; editionNo: number | null; registered: boolean; mine: boolean; needsLogin: boolean; href: string; licensor: string; manufacturer?: string }
  | { state: "claimed"; title: string; kind: string; when: string; city: string; href: string }
  | { state: "collab"; code: string; title: string; property: string; href: string }
  | { state: "invalid"; code: string };

export async function POST(req: Request) {
  const { code: input } = await body<{ code: string }>(req);
  // A scanned QR may hold the whole verify link rather than the bare code.
  const raw = decodeURIComponent(String(input || "").trim().replace(/^.*\/verify\//, "").replace(/[?#].*$/, ""));
  const code = normalizeCode(raw);
  const db0 = await read();
  const tag = signatureValid(code) ? db0.tags.find((t) => t.code === code) : undefined;
  if (!tag) {
    // Not a store tag: it may be a tag from an official collab run, which has its own full record.
    const collab = verifyCode(raw);
    if (collab.found) return ok({ state: "collab", code: collab.code, title: collab.title, property: collab.property, href: `/verify/${encodeURIComponent(collab.code)}` } satisfies VerifyResult);
    return ok({ state: "invalid", code } satisfies VerifyResult);
  }

  const user = await currentUser();
  const fig = tag.kind === "figure" ? db0.figures.find((f) => f.id === tag.refId) : undefined;
  const vol = tag.kind === "volume" ? volumeById(db0, tag.refId) : undefined;
  const series = db0.series.find((s) => s.id === (fig?.seriesId ?? vol?.seriesId));
  const href = fig ? `/figures/${fig.slug}` : `/manga/${series?.slug}`;
  const licensor = fig ? fig.licensor : db0.publishers.find((p) => p.id === series?.publisherId)?.name ?? "";
  const base = { title: tag.title, kind: tag.kind, editionNo: tag.editionNo, href, licensor, manufacturer: fig?.manufacturer };

  if (tag.ownerId && tag.ownerId !== user?.id)
    return ok({ state: "claimed", title: tag.title, kind: tag.kind, when: fmtDate(tag.registeredAt!), city: tag.registeredCity ?? "another city", href } satisfies VerifyResult);
  if (tag.ownerId && tag.ownerId === user?.id)
    return ok({ state: "genuine", ...base, registered: true, mine: true, needsLogin: false } satisfies VerifyResult);
  if (!user) return ok({ state: "genuine", ...base, registered: false, mine: false, needsLogin: true } satisfies VerifyResult);

  // First scan by a signed-in user: register ownership and add it to their shelf.
  await mutate((db) => {
    const t = db.tags.find((x) => x.code === code)!;
    const lastOrder = [...db.orders].reverse().find((o) => o.userId === user.id);
    t.ownerId = user.id; t.registeredAt = now(); t.registeredCity = lastOrder?.city || "India";
    addOwnership(db, user.id, tag.kind, tag.refId, "verify");
  });
  return ok({ state: "genuine", ...base, registered: true, mine: true, needsLogin: false } satisfies VerifyResult);
}
