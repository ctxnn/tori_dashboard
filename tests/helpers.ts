import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { closeDatabase } from "../src/lib/db";
import { resetDemo } from "../src/lib/seed";

/** Point Torii at a throwaway data directory and seed it. */
export async function freshDemo(): Promise<string> {
  closeDatabase();
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "torii-test-"));
  process.env.TORII_DATA_DIR = dir;
  await resetDemo();
  return dir;
}
