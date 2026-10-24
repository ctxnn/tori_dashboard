import { DatabaseSync } from "node:sqlite";
import fs from "node:fs";
import path from "node:path";
import { SCHEMA, SCHEMA_VERSION } from "./schema";

type Row = Record<string, unknown>;
type Param = string | number | bigint | null | Uint8Array;

interface DbState {
  db: DatabaseSync;
  depth: number;
}

const g = globalThis as unknown as { __torii?: DbState };

export function dataDir(): string {
  return path.resolve(process.env.TORII_DATA_DIR || path.join(process.cwd(), "data"));
}

export function uploadsDir(): string {
  return path.join(dataDir(), "uploads");
}

function open(): DbState {
  fs.mkdirSync(uploadsDir(), { recursive: true });
  const db = new DatabaseSync(path.join(dataDir(), "torii.db"));
  db.exec("PRAGMA journal_mode = WAL; PRAGMA foreign_keys = ON; PRAGMA busy_timeout = 5000;");
  db.exec(SCHEMA);
  db.prepare("INSERT OR IGNORE INTO meta (key, value) VALUES ('schema_version', ?)").run(String(SCHEMA_VERSION));
  return { db, depth: 0 };
}

function state(): DbState {
  if (!g.__torii) g.__torii = open();
  return g.__torii;
}

export function db(): DatabaseSync {
  return state().db;
}

export function all<T = Row>(sql: string, ...params: Param[]): T[] {
  return db().prepare(sql).all(...params) as T[];
}

export function get<T = Row>(sql: string, ...params: Param[]): T | undefined {
  return db().prepare(sql).get(...params) as T | undefined;
}

export function run(sql: string, ...params: Param[]): { changes: number; lastInsertRowid: number } {
  const r = db().prepare(sql).run(...params);
  return { changes: Number(r.changes), lastInsertRowid: Number(r.lastInsertRowid) };
}

/**
 * Run `fn` inside a transaction. Nested calls become savepoints, so domain
 * functions can compose freely. `fn` must be synchronous: no awaits inside.
 */
export function tx<T>(fn: () => T): T {
  const s = state();
  const name = `sp${s.depth}`;
  s.db.exec(s.depth === 0 ? "BEGIN IMMEDIATE" : `SAVEPOINT ${name}`);
  s.depth++;
  try {
    const result = fn();
    if (result instanceof Promise) throw new Error("tx() callback must be synchronous");
    s.depth--;
    s.db.exec(s.depth === 0 ? "COMMIT" : `RELEASE ${name}`);
    return result;
  } catch (err) {
    s.depth--;
    s.db.exec(s.depth === 0 ? "ROLLBACK" : `ROLLBACK TO ${name}; RELEASE ${name}`);
    throw err;
  }
}

export function isEmpty(): boolean {
  return (get<{ n: number }>("SELECT COUNT(*) AS n FROM users")?.n ?? 0) === 0;
}

/** Wipe every table and uploaded file. Only touches the local demo data directory. */
export function wipeDatabase(): void {
  const s = state();
  const tables = all<{ name: string }>(
    "SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'",
  );
  s.db.exec("PRAGMA foreign_keys = OFF");
  s.db.exec("BEGIN");
  for (const t of tables) s.db.exec(`DELETE FROM "${t.name}"`);
  s.db.exec("DELETE FROM sqlite_sequence");
  s.db.exec("COMMIT");
  s.db.exec("PRAGMA foreign_keys = ON");
  for (const f of fs.readdirSync(uploadsDir())) fs.rmSync(path.join(uploadsDir(), f), { force: true });
}

/** Test helper: drop the cached connection so a fresh data dir can be used. */
export function closeDatabase(): void {
  g.__torii?.db.close();
  g.__torii = undefined;
}
