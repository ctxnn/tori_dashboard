import { mutate, read, id } from "@/store/lib/db";
import { currentUser } from "@/store/lib/auth";
import { itemInfo } from "@/store/lib/catalog";
import { body, fail, ok } from "@/store/lib/api";
import type { ItemKind } from "@/store/lib/types";

type Line = { kind: ItemKind; refId: string; qty?: number };

// POST: add one or more items. PATCH: set quantity (0 removes).
export async function POST(req: Request) {
  const user = await currentUser();
  if (!user) return fail("Please sign in", 401);
  const b = await body<{ items?: Line[] } & Line>(req);
  const items: Line[] = b.items ?? [{ kind: b.kind, refId: b.refId, qty: b.qty }];
  const db0 = await read();
  for (const it of items) {
    const info = itemInfo(db0, it.kind, it.refId);
    if (!info) return fail("Item not found", 404);
    if (!info.available) return fail(`${info.title} is out of stock`);
  }
  const count = await mutate((db) => {
    for (const it of items) {
      const ex = db.cart.find((c) => c.userId === user.id && c.kind === it.kind && c.refId === it.refId);
      if (ex) ex.qty = Math.min(10, ex.qty + (it.qty ?? 1));
      else db.cart.push({ id: id("ci_"), userId: user.id, kind: it.kind, refId: it.refId, qty: Math.min(10, it.qty ?? 1) });
    }
    return db.cart.filter((c) => c.userId === user.id).reduce((s, c) => s + c.qty, 0);
  });
  return ok({ count });
}

export async function PATCH(req: Request) {
  const user = await currentUser();
  if (!user) return fail("Please sign in", 401);
  const { id: lineId, qty } = await body<{ id: string; qty: number }>(req);
  await mutate((db) => {
    const l = db.cart.find((c) => c.id === lineId && c.userId === user.id);
    if (!l) return;
    if (qty <= 0) db.cart = db.cart.filter((c) => c !== l);
    else l.qty = Math.min(10, Math.floor(qty));
  });
  return ok();
}
