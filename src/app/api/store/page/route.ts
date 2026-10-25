import { read } from "@/store/lib/db";
import { currentUser } from "@/store/lib/auth";
import { canRead } from "@/store/lib/catalog";
import { chapterAt } from "@/store/lib/derive";
import { LANGS, type DB, type Lang } from "@/store/lib/types";
import { pickPages, releasedChapters } from "@/store/lib/partner";
import { blobResponse, getBlob } from "@/store/lib/blobs";

/** A page the publisher uploaded through the Partner Portal, in the reader's language when it exists. */
async function partnerPage(db: DB, seriesId: string, c: number, p: number, l: string) {
  const sub = db.submissions.find((x) => `ps_${x.id}` === seriesId);
  const ch = sub && releasedChapters(sub)[c - 1];
  const pick = ch && pickPages(ch, l as Lang);
  const blob = pick && pick.ids[p - 1] ? await getBlob(pick.ids[p - 1]) : null;
  return blob ? blobResponse(blob, "private, max-age=3600") : new Response("Not found", { status: 404 });
}

// Generates placeholder manga pages as SVG. Locked chapters return 403, so pages can't be fetched directly.
export async function GET(req: Request) {
  const u = new URL(req.url);
  const slug = u.searchParams.get("s") || "", c = Number(u.searchParams.get("c")), p = Number(u.searchParams.get("p")), l = u.searchParams.get("l") || "en";
  const db = await read();
  const s = db.series.find((x) => x.slug === slug);
  const ch = s && chapterAt(db, s, c);
  if (!s || !ch || !(p >= 1 && p <= ch.pages)) return new Response("Not found", { status: 404 });
  if (!canRead(db, ch, (await currentUser()))) return new Response("Locked", { status: 403 });
  if (s.source === "partner") return partnerPage(db, s.id, c, p, l);
  const lang = LANGS.find((x) => x.code === l) ?? LANGS[0];
  const seed = (c * 31 + p * 7) % 4;
  let st = c * 7919 + p * 104729 + slug.length;
  const r = () => ((st = (st * 1664525 + 1013904223) % 4294967296) / 4294967296);
  const q = (n: number) => Math.round(n * 10) / 10;
  const layouts = [
    [[24, 24, 552, 290], [24, 330, 268, 430], [308, 330, 268, 430]],
    [[24, 24, 268, 380], [308, 24, 268, 380], [24, 420, 552, 340]],
    [[24, 24, 552, 220], [24, 260, 552, 270], [24, 546, 552, 214]],
    [[24, 24, 352, 470], [392, 24, 184, 470], [24, 510, 552, 250]],
  ][seed];
  const SFX = ["DOOM", "BAM!", "ZZT", "GO!", "WHAM"];
  const panels = layouts.map(([x, y, w, h], i) => {
    const kind = (seed + i + p) % 4, cx = x + w * (0.3 + r() * 0.4), cy = y + h * (0.35 + r() * 0.35);
    const clip = `pc${i}`;
    let art = "";
    if (kind === 0) art = Array.from({ length: 40 }, (_, k) => { const a = (k / 40) * Math.PI * 2, d = 0.02 + r() * 0.03;
      return `<path d="M${q(cx)} ${q(cy)} L${q(cx + Math.cos(a - d) * 900)} ${q(cy + Math.sin(a - d) * 900)} L${q(cx + Math.cos(a + d) * 900)} ${q(cy + Math.sin(a + d) * 900)}Z" fill="#1a1625" opacity="${k % 2 ? 0.85 : 0.35}"/>`; }).join("") + `<circle cx="${q(cx)}" cy="${q(cy)}" r="${q(Math.min(w, h) / 5)}" fill="#fff" stroke="#1a1625" stroke-width="4"/>`;
    if (kind === 1) art = `<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="url(#tone)"/>` + Array.from({ length: 14 }, (_, k) => `<line x1="${x - 20}" y1="${q(y + (k / 13) * h)}" x2="${x + w + 20}" y2="${q(y + (k / 13) * h - h * 0.3)}" stroke="#1a1625" stroke-width="${q(1 + r() * 3)}"/>`).join("") + `<ellipse cx="${q(cx)}" cy="${q(y + h * 0.82)}" rx="${q(w * 0.32)}" ry="${q(h * 0.08)}" fill="#1a1625" opacity=".35"/>`;
    if (kind === 2) art = Array.from({ length: 9 }, (_, k) => `<circle cx="${q(cx)}" cy="${q(cy)}" r="${q(Math.max(w, h) * (1 - k * 0.11))}" fill="${k % 2 ? "#fff" : s.color}" opacity="${k % 2 ? 1 : 0.45}"/>`).join("") + `<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="url(#tone)" opacity=".6"/>`;
    if (kind === 3) art = `<path d="M${x} ${q(y + h * 0.7)} Q${q(x + w * 0.5)} ${q(y + h * 0.45)} ${x + w} ${q(y + h * 0.65)} L${x + w} ${y + h} L${x} ${y + h}Z" fill="#1a1625"/><path d="M${x} ${q(y + h * 0.7)} Q${q(x + w * 0.5)} ${q(y + h * 0.45)} ${x + w} ${q(y + h * 0.65)}" stroke="#fff" stroke-width="3" fill="none"/>` + Array.from({ length: 18 }, () => `<circle cx="${q(x + r() * w)}" cy="${q(y + r() * h * 0.5)}" r="${q(1 + r() * 2.5)}" fill="#1a1625"/>`).join("");
    const bubble = i === 0 || r() > 0.5;
    const bx = q(x + w * (0.55 + r() * 0.15)), by = q(y + 46);
    const text = i === 0 ? lang.native : ["…!", "Huh?", "Now!", "…"][Math.floor(r() * 4)];
    const sfx = kind === 0 && w > 250 ? `<text x="${q(x + 30)}" y="${q(y + h - 30)}" font-family="sans-serif" font-weight="900" font-size="64" fill="#fff" stroke="#1a1625" stroke-width="6" paint-order="stroke" transform="rotate(-8 ${q(x + 30)} ${q(y + h - 30)})">${SFX[(c + p) % SFX.length]}</text>` : "";
    return `<clipPath id="${clip}"><rect x="${x}" y="${y}" width="${w}" height="${h}"/></clipPath><g clip-path="url(#${clip})"><rect x="${x}" y="${y}" width="${w}" height="${h}" fill="#fff"/>${art}${sfx}</g>
      <rect x="${x}" y="${y}" width="${w}" height="${h}" fill="none" stroke="#1a1625" stroke-width="5"/>
      ${bubble ? `<g><ellipse cx="${bx}" cy="${by}" rx="${q(Math.min(115, w * 0.32))}" ry="34" fill="#fff" stroke="#1a1625" stroke-width="3"/><path d="M${q(bx - 14)} ${q(by + 30)} L${q(bx - 30)} ${q(by + 56)} L${q(bx + 6)} ${q(by + 32)}Z" fill="#fff" stroke="#1a1625" stroke-width="3" stroke-linejoin="round"/><rect x="${q(bx - 20)}" y="${q(by + 24)}" width="30" height="10" fill="#fff"/>
      <text x="${bx}" y="${q(by + 7)}" font-size="20" font-weight="700" text-anchor="middle" font-family="sans-serif" fill="#1a1625">${esc(text)}</text></g>` : ""}`;
  }).join("");
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 600 860" width="600" height="860">
    <defs><pattern id="tone" width="8" height="8" patternUnits="userSpaceOnUse"><circle cx="4" cy="4" r="1.7" fill="#1a1625" opacity=".55"/></pattern></defs>
    <rect width="600" height="860" fill="#fbfaf7"/>${panels}
    <text x="300" y="806" font-size="17" font-weight="700" text-anchor="middle" font-family="sans-serif" fill="#1a1625">${esc(s.title)}, chapter ${c}, page ${p} of ${ch.pages}</text>
    <text x="300" y="834" font-size="14" text-anchor="middle" font-family="sans-serif" fill="#77738a">Placeholder page in ${lang.name}. The publisher's artwork goes here.</text></svg>`;
  return new Response(svg, { headers: { "content-type": "image/svg+xml", "cache-control": "private, max-age=3600" } });
}
const esc = (t: string) => t.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
