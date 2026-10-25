import "server-only";
import crypto from "node:crypto";
import catalogJson from "@/store/data/catalog.json";
import initialStateJson from "@/store/data/initial-state.json";
import type { Catalog, DB, Publisher, State } from "./types";
import { toSeries } from "./partner";
import { get, run, tx } from "@/lib/db";

/**
 * Storage for the fan store and the Partner Portal.
 *
 * - The catalogue (series, chapters, volumes, figures, seeded analytics) is static and
 *   bundled with the app from src/store/data/catalog.json.
 * - Everything that changes (users, carts, orders, unlocks, tags, settings, stock, partner
 *   submissions) is one small "state" document, kept in the same SQLite database as the
 *   collaboration workspace (table store_state). "Reset demo" wipes it with everything else.
 *
 * Callers see one merged DB object through read() and mutate().
 */
const catalog = catalogJson as unknown as Catalog;
const initialState = initialStateJson as unknown as State;

const clone = <T,>(x: T): T => JSON.parse(JSON.stringify(x));

/** State saved before the Partner Portal existed has no partner collections: start them from the seed. */
function normalize(s: State): State {
  for (const k of ["partners", "partnerUsers", "submissions"] as const) {
    if (!Array.isArray(s[k])) (s as unknown as Record<string, unknown>)[k] = clone(initialState[k] ?? []);
  }
  return s;
}

function loadState(): State {
  const row = get<{ doc: string }>("SELECT doc FROM store_state WHERE id = 1");
  return row ? normalize(JSON.parse(row.doc)) : clone(initialState);
}

function saveState(s: State) {
  run(
    "INSERT INTO store_state (id, doc, updated_at) VALUES (1, ?, ?) ON CONFLICT(id) DO UPDATE SET doc = excluded.doc, updated_at = excluded.updated_at",
    JSON.stringify(s), new Date().toISOString(),
  );
}

/** Merge static catalogue + state. `deep` copies figures so mutate() can edit them safely. */
function compose(s: State, deep: boolean): DB {
  const figures = catalog.figures.map((f) => {
    const st = s.stock[f.id], ed = s.editionSold[f.id];
    return st === undefined && ed === undefined ? (deep ? { ...f } : f) : { ...f, stock: st ?? f.stock, editionSold: ed ?? f.editionSold };
  });
  // Series that partners submitted and Torii approved join the catalogue, under their publisher.
  const at = Date.now();
  const partnerSeries = s.submissions.map((x) => toSeries(x, at)).filter((x): x is NonNullable<typeof x> => !!x);
  const known = new Set(catalog.publishers.map((p) => p.id));
  const publishers: Publisher[] = [...catalog.publishers];
  for (const o of s.partners) if (!known.has(o.publisherId)) { known.add(o.publisherId); publishers.push({ id: o.publisherId, name: o.name }); }
  const figIds = new Set(catalog.figures.map((f) => f.id));
  const stock: Record<string, number> = {};
  for (const [k, v] of Object.entries(s.stock)) if (!figIds.has(k)) stock[k] = v;
  return {
    publishers, series: partnerSeries.length ? [...catalog.series, ...partnerSeries] : catalog.series, figures,
    users: s.users, unlocks: s.unlocks, progress: s.progress, cart: s.cart, orders: s.orders, tags: s.tags,
    ownership: s.ownership, settings: s.settings, events: [...catalog.events, ...s.events],
    chapterOverrides: deep ? { ...s.chapterOverrides } : s.chapterOverrides, stock,
    partners: s.partners, partnerUsers: s.partnerUsers, submissions: s.submissions,
  };
}

/** Pull the changed parts of a DB back out into a State document. */
function decompose(db: DB): State {
  const stock: Record<string, number> = { ...db.stock }, editionSold: Record<string, number> = {};
  db.figures.forEach((f, i) => {
    if (f.stock !== catalog.figures[i].stock) stock[f.id] = f.stock;
    if (f.editionSold !== catalog.figures[i].editionSold) editionSold[f.id] = f.editionSold;
  });
  return {
    users: db.users, unlocks: db.unlocks, progress: db.progress, cart: db.cart, orders: db.orders, tags: db.tags,
    ownership: db.ownership, settings: db.settings, events: db.events.slice(catalog.events.length),
    chapterOverrides: db.chapterOverrides, stock, editionSold,
    partners: db.partners, partnerUsers: db.partnerUsers, submissions: db.submissions,
  };
}

export const catalogMeta = () => catalog.meta;

export async function read(): Promise<DB> {
  return compose(loadState(), false);
}

/** Load, change and save in one SQLite transaction, so concurrent requests can't lose writes. */
export async function mutate<T>(fn: (db: DB) => T): Promise<T> {
  return tx(() => {
    const db = compose(loadState(), true);
    const result = fn(db);
    saveState(decompose(db));
    return result;
  });
}

export async function resetState() {
  saveState(clone(initialState));
}

export const id = (prefix = "") => prefix + crypto.randomBytes(6).toString("hex");
export const now = () => new Date().toISOString();
