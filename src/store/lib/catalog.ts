import "server-only";
import { FREE_CHAPTERS_IN_PAID_MODE } from "./config";
import type { Chapter, DB, Figure, ItemKind, Series, User } from "./types";
import { boxById, volumeById } from "./derive";

export function isChapterFree(db: DB, ch: Chapter): boolean {
  if (ch.freeOverride !== null) return ch.freeOverride;
  if (db.settings.readingMode === "free") return true;
  // Partner series can be kept free (a promotion) or choose how many opening chapters are free.
  const s = ch.seriesId.startsWith("ps_") ? db.series.find((x) => x.id === ch.seriesId) : undefined;
  if (s?.pricing === "free") return true;
  return ch.number <= (s?.freeChapters ?? FREE_CHAPTERS_IN_PAID_MODE);
}

export function canRead(db: DB, ch: Chapter, user: User | null): boolean {
  if (isChapterFree(db, ch)) return true;
  if (!user) return false;
  return db.unlocks.some((u) => u.userId === user.id && u.chapterId === ch.id);
}

export const publisherName = (db: DB, id: string) => db.publishers.find((p) => p.id === id)?.name ?? "";

export function itemInfo(db: DB, kind: ItemKind, refId: string):
  | { title: string; subtitle: string; price: number; color: string; href: string; series?: Series; figure?: Figure; available: boolean }
  | null {
  if (kind === "volume") {
    const v = volumeById(db, refId); if (!v) return null;
    const s = db.series.find((x) => x.id === v.seriesId)!;
    return { title: `${s.title} Vol. ${v.number}`, subtitle: v.edition === "india" ? "India-printed edition" : "Imported edition",
      price: v.price, color: s.color, href: `/manga/${s.slug}`, series: s, available: v.stock > 0 };
  }
  if (kind === "box") {
    const b = boxById(db, refId); if (!b) return null;
    const s = db.series.find((x) => x.id === b.seriesId)!;
    return { title: b.title, subtitle: `Volumes ${b.fromVol}–${b.toVol} · box set`, price: b.price, color: s.color, href: `/manga/${s.slug}`, series: s, available: true };
  }
  const f = db.figures.find((x) => x.id === refId); if (!f) return null;
  const s = db.series.find((x) => x.id === f.seriesId)!;
  const soldOut = f.editionSize !== null && f.editionSold >= f.editionSize;
  return { title: f.name, subtitle: `${f.manufacturer} · ${s.title}`, price: f.price, color: f.color, href: `/figures/${f.slug}`, series: s, figure: f, available: !soldOut && f.stock > 0 };
}

export function cartFor(db: DB, userId: string) {
  const lines = db.cart.filter((c) => c.userId === userId).map((c) => ({ ...c, info: itemInfo(db, c.kind, c.refId) })).filter((l) => l.info);
  const total = lines.reduce((s, l) => s + l.info!.price * l.qty, 0);
  return { lines: lines as (typeof lines[number] & { info: NonNullable<ReturnType<typeof itemInfo>> })[], total, count: lines.reduce((s, l) => s + l.qty, 0) };
}

export function ownedVolumes(db: DB, userId: string, seriesId: string): Set<number> {
  const s = db.series.find((x) => x.id === seriesId); if (!s) return new Set();
  const prefix = `v_${s.slug}_`;
  return new Set(db.ownership.filter((o) => o.userId === userId && o.kind === "volume" && o.refId.startsWith(prefix)).map((o) => Number(o.refId.slice(prefix.length))));
}
