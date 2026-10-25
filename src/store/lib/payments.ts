import "server-only";
import crypto from "node:crypto";
import { id, now } from "./db";
import { cartFor, itemInfo } from "./catalog";
import { boxById, chapterById, volumeById } from "./derive";
import { pincodeInfo } from "./geo";
import { mintCode } from "./tags";
import { CHAPTER_PRICE } from "./config";
import type { DB, Order, OrderItem, User, Event } from "./types";

export const TOPUPS = [50, 100, 200, 500, 1000];
export type Purpose = "unlock" | "topup" | "order";
type Payload = Record<string, unknown>;

export class PayError extends Error {}

/** Server-side price calculation: the client never decides what it pays. */
export function quote(db: DB, user: User, purpose: Purpose, p: Payload): { amount: number; description: string } {
  if (purpose === "unlock") {
    const ch = chapterById(db, String(p.chapterId));
    if (!ch) throw new PayError("Chapter not found");
    if (db.unlocks.some((u) => u.userId === user.id && u.chapterId === ch.id)) throw new PayError("Already unlocked");
    const s = db.series.find((x) => x.id === ch.seriesId)!;
    return { amount: CHAPTER_PRICE, description: `${s.title} · Chapter ${ch.number}` };
  }
  if (purpose === "topup") {
    const amt = Number(p.amount);
    if (!TOPUPS.includes(amt)) throw new PayError("Choose a valid top-up amount");
    return { amount: amt, description: "Torii wallet top-up" };
  }
  const { lines, total } = cartFor(db, user.id);
  if (!lines.length) throw new PayError("Your cart is empty");
  for (const l of lines) if (!l.info.available) throw new PayError(`${l.info.title} is out of stock`);
  const info = pincodeInfo(String(p.pincode || ""));
  if (!info.valid) throw new PayError("Enter a valid 6-digit pincode");
  if (!String(p.name || "").trim() || String(p.address || "").trim().length < 8) throw new PayError("Enter your name and full address");
  return { amount: total, description: `Order · ${lines.reduce((s, l) => s + l.qty, 0)} item(s)` };
}

function userRegion(db: DB, userId: string) {
  const o = [...db.orders].reverse().find((x) => x.userId === userId);
  return { state: o?.state ?? "Unknown", city: o?.city ?? "Unknown" };
}

export function fulfil(db: DB, user: User, purpose: Purpose, p: Payload, paymentRef: string): Record<string, unknown> {
  const u = db.users.find((x) => x.id === user.id)!;
  const { amount } = quote(db, u, purpose, p);
  if (purpose === "unlock") return unlockChapter(db, u, String(p.chapterId), "upi");
  if (purpose === "topup") { u.wallet += amount; return { wallet: u.wallet }; }

  const info = pincodeInfo(String(p.pincode));
  const { lines } = cartFor(db, u.id);
  const items: OrderItem[] = [];
  const ts = now();
  for (const l of lines) {
    const editionNos: number[] = []; const tagCodes: string[] = [];
    const fig = l.kind === "figure" ? db.figures.find((f) => f.id === l.refId) : undefined;
    const volIds = l.kind === "volume" ? [l.refId] : l.kind === "box"
      ? (() => { const b = boxById(db, l.refId)!; const s = db.series.find((x) => x.id === b.seriesId)!; return Array.from({ length: b.toVol - b.fromVol + 1 }, (_, k) => `v_${s.slug}_${b.fromVol + k}`); })()
      : [];
    for (let q = 0; q < l.qty; q++) {
      if (fig) {
        let ed: number | null = null;
        if (fig.editionSize) { fig.editionSold += 1; ed = fig.editionSold; editionNos.push(ed); }
        if (fig.availability !== "preorder") fig.stock = Math.max(0, fig.stock - 1);
        const code = mintCode(); tagCodes.push(code);
        db.tags.push({ code, kind: "figure", refId: fig.id, title: fig.name, editionNo: ed, ownerId: null, registeredAt: null, registeredCity: null });
        addOwnership(db, u.id, "figure", fig.id, "order");
      }
      for (const vid of volIds) {
        const v = volumeById(db, vid)!; db.stock[v.id] = Math.max(0, v.stock - 1);
        const s = db.series.find((x) => x.id === v.seriesId)!;
        const code = mintCode(); tagCodes.push(code);
        db.tags.push({ code, kind: "volume", refId: v.id, title: `${s.title} Vol. ${v.number}`, editionNo: null, ownerId: null, registeredAt: null, registeredCity: null });
        addOwnership(db, u.id, "volume", v.id, "order");
      }
    }
    items.push({ id: id("oi_"), kind: l.kind, refId: l.refId, title: l.info.title, price: l.info.price, qty: l.qty, editionNos, tagCodes });
    const seriesId = l.info.series?.id ?? "";
    db.events.push({ id: id("e_"), type: l.kind === "figure" ? "figure" : "print", seriesId, language: "en", state: info.state, city: info.city, amount: l.info.price * l.qty, createdAt: ts });
  }
  const order: Order = { id: "TOR" + Date.now().toString().slice(-8), userId: u.id, total: amount, status: "Confirmed", name: String(p.name).trim(),
    address: String(p.address).trim(), pincode: String(p.pincode), city: info.city, state: info.state, eta: info.eta, paymentRef, createdAt: ts, items };
  db.orders.push(order);
  db.cart = db.cart.filter((c) => c.userId !== u.id);
  return { orderId: order.id };
}

export function unlockChapter(db: DB, u: User, chapterId: string, via: "wallet" | "upi") {
  const ch = chapterById(db, chapterId);
  if (!ch) throw new PayError("Chapter not found");
  if (db.unlocks.some((x) => x.userId === u.id && x.chapterId === ch.id)) return { ok: true, already: true };
  if (via === "wallet") {
    if (u.wallet < CHAPTER_PRICE) throw new PayError("Not enough wallet balance");
    u.wallet -= CHAPTER_PRICE;
  }
  db.unlocks.push({ userId: u.id, chapterId: ch.id, createdAt: now() });
  const prog = db.progress.find((x) => x.userId === u.id && x.seriesId === ch.seriesId);
  const ev: Event = { id: id("e_"), type: "unlock", seriesId: ch.seriesId, language: prog?.language ?? "en", ...userRegion(db, u.id), amount: CHAPTER_PRICE, createdAt: now() };
  db.events.push(ev);
  return { ok: true, wallet: u.wallet };
}

export function addOwnership(db: DB, userId: string, kind: "volume" | "figure", refId: string, source: "order" | "verify") {
  if (!db.ownership.some((o) => o.userId === userId && o.kind === kind && o.refId === refId))
    db.ownership.push({ userId, kind, refId, source, createdAt: now() });
}

export function logRead(db: DB, userId: string | null, seriesId: string, language: Event["language"]) {
  const r = userId ? userRegion(db, userId) : { state: "Unknown", city: "Unknown" };
  db.events.push({ id: id("e_"), type: "read", seriesId, language, ...r, amount: 0, createdAt: now() });
}

// ---- Razorpay (test mode). Used only when both keys are configured. ----
export const razorpayEnabled = () => !!(process.env.RAZORPAY_KEY_ID && process.env.RAZORPAY_KEY_SECRET);
export async function razorpayCreateOrder(amount: number, receipt: string) {
  const auth = Buffer.from(`${process.env.RAZORPAY_KEY_ID}:${process.env.RAZORPAY_KEY_SECRET}`).toString("base64");
  const r = await fetch("https://api.razorpay.com/v1/orders", {
    method: "POST", headers: { "content-type": "application/json", authorization: `Basic ${auth}` },
    body: JSON.stringify({ amount: amount * 100, currency: "INR", receipt }),
  });
  if (!r.ok) throw new PayError("Razorpay order could not be created");
  return (await r.json()) as { id: string };
}
export function razorpayVerify(orderId: string, paymentId: string, signature: string) {
  const exp = crypto.createHmac("sha256", process.env.RAZORPAY_KEY_SECRET!).update(`${orderId}|${paymentId}`).digest("hex");
  return exp.length === signature.length && crypto.timingSafeEqual(Buffer.from(exp), Buffer.from(signature));
}
export { itemInfo };
