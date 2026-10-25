"use client";
/* Browser-side helpers for the Partner Portal: optimise images before upload, unpack .cbz/.zip
   chapters, and draw sample pages for demos. Nothing here runs on the server. */

const IMG = /\.(jpe?g|png|webp)$/i;
export const naturalSort = (a: string, b: string) => a.localeCompare(b, undefined, { numeric: true, sensitivity: "base" });

async function decode(file: Blob): Promise<{ draw: CanvasImageSource; w: number; h: number; done: () => void }> {
  if ("createImageBitmap" in window) {
    try { const b = await createImageBitmap(file); return { draw: b, w: b.width, h: b.height, done: () => b.close() }; } catch { /* fall back */ }
  }
  const url = URL.createObjectURL(file);
  const img = new Image();
  await new Promise<void>((res, rej) => { img.onload = () => res(); img.onerror = () => rej(new Error("Couldn't read this image")); img.src = url; });
  return { draw: img, w: img.naturalWidth, h: img.naturalHeight, done: () => URL.revokeObjectURL(url) };
}

/** Resizes to at most `maxW` wide and re-encodes as WebP (JPEG where WebP encoding isn't supported). */
export async function optimise(file: Blob, maxW: number, quality = 0.84): Promise<Blob> {
  const { draw, w, h, done } = await decode(file);
  const scale = Math.min(1, maxW / w);
  const cw = Math.max(1, Math.round(w * scale)), ch = Math.max(1, Math.round(h * scale));
  const canvas = document.createElement("canvas");
  canvas.width = cw; canvas.height = ch;
  const ctx = canvas.getContext("2d")!;
  ctx.fillStyle = "#fff"; ctx.fillRect(0, 0, cw, ch);
  ctx.imageSmoothingQuality = "high";
  ctx.drawImage(draw, 0, 0, cw, ch);
  done();
  const enc = (type: string) => new Promise<Blob | null>((r) => canvas.toBlob(r, type, quality));
  let out = await enc("image/webp");
  if (!out || out.type !== "image/webp") out = await enc("image/jpeg");
  if (!out) throw new Error("Couldn't process this image");
  // Already small and the right size: keep the original bytes.
  if (scale === 1 && file.size <= out.size && /^image\/(jpeg|png|webp)$/.test(file.type)) return file;
  return out;
}

export type Uploaded = { id: string; url: string; size: number };
export async function uploadImage(blob: Blob, kind: "cover" | "banner" | "page"): Promise<Uploaded> {
  const fd = new FormData();
  fd.append("kind", kind);
  fd.append("file", blob, `${kind}.${blob.type.split("/")[1] ?? "img"}`);
  const r = await fetch("/api/partner/upload", { method: "POST", body: fd });
  const j = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(j.error || `Upload failed (${r.status})`);
  return j as Uploaded;
}

/** Image files from a file picker or drop, with .cbz/.zip archives unpacked, in page order. */
export async function expandFiles(files: File[]): Promise<{ name: string; blob: Blob }[]> {
  const out: { name: string; blob: Blob }[] = [];
  for (const f of files) {
    if (/\.(cbz|zip)$/i.test(f.name)) {
      const { unzip } = await import("fflate");
      const buf = new Uint8Array(await f.arrayBuffer());
      const entries = await new Promise<Record<string, Uint8Array>>((res, rej) =>
        unzip(buf, { filter: (e) => IMG.test(e.name) && !/(^|\/)(__MACOSX|\.)/.test(e.name) }, (err, data) => (err ? rej(err) : res(data))));
      for (const name of Object.keys(entries).sort(naturalSort)) {
        const ext = name.split(".").pop()!.toLowerCase();
        out.push({ name, blob: new Blob([entries[name] as BlobPart], { type: ext === "png" ? "image/png" : ext === "webp" ? "image/webp" : "image/jpeg" }) });
      }
    } else if (IMG.test(f.name) || /^image\/(jpeg|png|webp)$/.test(f.type)) out.push({ name: f.name, blob: f });
  }
  return files.some((f) => /\.(cbz|zip)$/i.test(f.name)) ? out : out.sort((a, b) => naturalSort(a.name, b.name));
}

const BUBBLE: Record<string, string[]> = {
  en: ["Let's go!", "Wait…!", "Is this it?", "Run!"], hi: ["चलो!", "रुको…!", "यही है?", "भागो!"], ta: ["போகலாம்!", "நில்…!", "இதுவா?", "ஓடு!"],
  te: ["పదండి!", "ఆగు…!", "ఇదేనా?", "పరుగెత్తు!"], bn: ["চলো!", "দাঁড়াও…!", "এটাই?", "দৌড়াও!"],
};

/** Draws simple manga-style placeholder pages, so the whole flow can be tried without real artwork. */
export async function samplePages(count: number, title: string, chapter: number, lang: string, color: string): Promise<Blob[]> {
  const W = 1200, H = 1760, out: Blob[] = [];
  for (let p = 1; p <= count; p++) {
    let seed = chapter * 9973 + p * 7919 + title.length;
    const rnd = () => ((seed = (seed * 1664525 + 1013904223) % 4294967296) / 4294967296);
    const c = document.createElement("canvas"); c.width = W; c.height = H;
    const g = c.getContext("2d")!;
    g.fillStyle = "#fbfaf7"; g.fillRect(0, 0, W, H);
    const layouts = [
      [[50, 50, 1100, 560], [50, 640, 530, 940], [620, 640, 530, 940]],
      [[50, 50, 530, 800], [620, 50, 530, 800], [50, 880, 1100, 700]],
      [[50, 50, 1100, 460], [50, 540, 1100, 560], [50, 1130, 1100, 450]],
    ][p % 3];
    layouts.forEach(([x, y, w, h], i) => {
      g.save(); g.beginPath(); g.rect(x, y, w, h); g.clip();
      g.fillStyle = "#fff"; g.fillRect(x, y, w, h);
      const cx = x + w * (0.3 + rnd() * 0.4), cy = y + h * (0.35 + rnd() * 0.3);
      if ((i + p) % 3 === 0) {
        for (let k = 0; k < 48; k++) { const a = (k / 48) * Math.PI * 2, d = 0.025; g.beginPath(); g.moveTo(cx, cy); g.lineTo(cx + Math.cos(a - d) * 2000, cy + Math.sin(a - d) * 2000); g.lineTo(cx + Math.cos(a + d) * 2000, cy + Math.sin(a + d) * 2000); g.closePath(); g.fillStyle = k % 2 ? "rgba(26,22,37,.85)" : "rgba(26,22,37,.25)"; g.fill(); }
        g.beginPath(); g.arc(cx, cy, Math.min(w, h) / 5, 0, Math.PI * 2); g.fillStyle = "#fff"; g.fill(); g.lineWidth = 8; g.strokeStyle = "#1a1625"; g.stroke();
      } else if ((i + p) % 3 === 1) {
        for (let k = 0; k < 9; k++) { g.beginPath(); g.arc(cx, cy, Math.max(w, h) * (1 - k * 0.11), 0, Math.PI * 2); g.fillStyle = k % 2 ? "#fff" : color; g.globalAlpha = k % 2 ? 1 : 0.5; g.fill(); }
        g.globalAlpha = 1;
      } else {
        g.fillStyle = "rgba(26,22,37,.55)";
        for (let yy = y; yy < y + h; yy += 14) for (let xx = x + ((yy / 14) % 2) * 7; xx < x + w; xx += 14) { g.beginPath(); g.arc(xx, yy, 3, 0, Math.PI * 2); g.fill(); }
        g.beginPath(); g.moveTo(x, y + h * 0.72); g.quadraticCurveTo(x + w / 2, y + h * 0.45, x + w, y + h * 0.66); g.lineTo(x + w, y + h); g.lineTo(x, y + h); g.closePath(); g.fillStyle = "#1a1625"; g.fill();
      }
      const words = BUBBLE[lang] ?? BUBBLE.en;
      if (i === 0 || rnd() > 0.4) {
        const bx = x + w * 0.62, by = y + 110;
        g.beginPath(); g.ellipse(bx, by, Math.min(220, w * 0.33), 72, 0, 0, Math.PI * 2); g.fillStyle = "#fff"; g.fill(); g.lineWidth = 6; g.strokeStyle = "#1a1625"; g.stroke();
        g.fillStyle = "#1a1625"; g.font = "700 44px system-ui, 'Noto Sans', sans-serif"; g.textAlign = "center"; g.textBaseline = "middle";
        g.fillText(words[(p + i) % words.length], bx, by);
      }
      g.restore();
      g.lineWidth = 10; g.strokeStyle = "#1a1625"; g.strokeRect(x, y, w, h);
    });
    g.fillStyle = "#1a1625"; g.font = "700 34px system-ui, sans-serif"; g.textAlign = "center"; g.textBaseline = "alphabetic";
    g.fillText(`${title} · Chapter ${chapter} · Page ${p}`, W / 2, H - 92);
    g.fillStyle = "#77738a"; g.font = "28px system-ui, sans-serif";
    g.fillText("Sample page generated in the Torii Partner Portal", W / 2, H - 48);
    const blob = await new Promise<Blob | null>((r) => c.toBlob(r, "image/webp", 0.8)) ?? await new Promise<Blob | null>((r) => c.toBlob(r, "image/jpeg", 0.85));
    if (blob) out.push(blob);
  }
  return out;
}

/** Runs async jobs with limited concurrency, keeping results in input order. */
export async function pool<T, R>(items: T[], n: number, fn: (t: T, i: number) => Promise<R>): Promise<R[]> {
  const out = new Array<R>(items.length);
  let next = 0;
  await Promise.all(Array.from({ length: Math.min(n, items.length) }, async () => {
    while (next < items.length) { const i = next++; out[i] = await fn(items[i], i); }
  }));
  return out;
}
