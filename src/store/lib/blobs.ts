import "server-only";
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { dataDir } from "@/lib/db";

/**
 * Uploaded artwork and manga pages. Each file is stored on its own, outside the state document:
 * in <data dir>/store-uploads/ (cleared by "Reset demo").
 * In production this would be S3 or R2 behind a CDN with signed URLs.
 */
export type BlobKind = "cover" | "banner" | "page";
export interface BlobMeta { kind: BlobKind; orgId: string; ct: string; size: number; createdAt: string }

export const storeUploadsDir = () => path.join(dataDir(), "store-uploads");
const ID = /^m_[a-f0-9]{20}$/;

/** Works out the image type from the file's first bytes, never from what the browser claims. */
export function sniffImage(b: Buffer): string | null {
  if (b.length > 3 && b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff) return "image/jpeg";
  if (b.length > 8 && b.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) return "image/png";
  if (b.length > 12 && b.toString("ascii", 0, 4) === "RIFF" && b.toString("ascii", 8, 12) === "WEBP") return "image/webp";
  return null;
}

export async function putBlob(data: Buffer, meta: Omit<BlobMeta, "size" | "createdAt">): Promise<string> {
  const id = "m_" + crypto.randomBytes(10).toString("hex");
  const full: BlobMeta = { ...meta, size: data.length, createdAt: new Date().toISOString() };
  const dir = storeUploadsDir();
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, `${id}.bin`), data);
  fs.writeFileSync(path.join(dir, `${id}.json`), JSON.stringify(full));
  return id;
}

export async function getBlob(id: string): Promise<{ data: Buffer; meta: BlobMeta } | null> {
  if (!ID.test(id)) return null;
  const bin = path.join(storeUploadsDir(), `${id}.bin`), js = path.join(storeUploadsDir(), `${id}.json`);
  if (!fs.existsSync(bin) || !fs.existsSync(js)) return null;
  return { data: fs.readFileSync(bin), meta: JSON.parse(fs.readFileSync(js, "utf8")) };
}

/** Metadata only (owner, kind) for many blobs at once, without loading the images. */
export async function blobMetas(ids: string[]): Promise<(BlobMeta | null)[]> {
  if (!ids.length) return [];
  return ids.map((i) => {
    if (!ID.test(i)) return null;
    const js = path.join(storeUploadsDir(), `${i}.json`);
    return fs.existsSync(js) ? (JSON.parse(fs.readFileSync(js, "utf8")) as BlobMeta) : null;
  });
}

export function blobResponse(b: { data: Buffer; meta: BlobMeta }, cache: string) {
  return new Response(new Uint8Array(b.data), {
    headers: { "content-type": b.meta.ct, "content-length": String(b.data.length), "cache-control": cache, "x-content-type-options": "nosniff" },
  });
}
