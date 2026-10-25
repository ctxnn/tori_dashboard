// Deterministic SVG preview renderer. The same function draws the live editor
// preview in the browser and the frozen preview stored with each version.
// Protected artwork is placed as an untouched <image> layer; only the creator's
// text layer and template choices vary.
import { FONTS, PRODUCTS, TEXT_COLOURS, swatch, type FontId } from "./catalog";
import type { Design } from "./content";

export interface PreviewInput {
  productId: string;
  layoutId: string;
  design: Design;
  /** URL or data: URI for the approved artwork. */
  artworkHref: string | null;
  creditLine?: string;
  /** Unique suffix for SVG ids when several previews share a page. */
  uid?: string;
  backdrop?: boolean;
}

export function escapeXml(s: string): string {
  return s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);
}

function fitSize(text: string, base: number, maxWidth: number, charWidth = 0.56): number {
  if (!text) return base;
  return Math.max(9, Math.min(base, maxWidth / (text.length * charWidth)));
}

function textEl(text: string, x: number, y: number, size: number, font: FontId, fill: string, extra = ""): string {
  if (!text.trim()) return "";
  const weight = font === "display" ? 400 : 600;
  return `<text x="${x}" y="${y}" text-anchor="middle" fill="${fill}" style="font-family:${FONTS[font].css};font-size:${size.toFixed(1)}px;font-weight:${weight}" ${extra}>${escapeXml(text)}</text>`;
}

function artwork(href: string | null, x: number, y: number, size: number, placeholderFill: string): string {
  if (!href) {
    return `<rect x="${x}" y="${y}" width="${size}" height="${size}" rx="8" fill="none" stroke="${placeholderFill}" stroke-dasharray="6 6" stroke-width="2"/>
<text x="${x + size / 2}" y="${y + size / 2}" text-anchor="middle" fill="${placeholderFill}" style="font-family:system-ui;font-size:13px">Choose artwork</text>`;
  }
  return `<image href="${escapeXml(href)}" x="${x}" y="${y}" width="${size}" height="${size}" preserveAspectRatio="xMidYMid meet"/>`;
}

const SHIRT_PATH =
  "M228 52 C252 88 348 88 372 52 L470 84 C500 96 528 128 562 178 L500 238 L456 210 L458 590 C458 600 452 606 442 606 L158 606 C148 606 142 600 142 590 L144 210 L100 238 L38 178 C72 128 100 96 130 84 Z";

function tshirt(input: PreviewInput, base: string, ink: string, uid: string): string {
  const { design, layoutId } = input;
  const t = design.text;
  const font = t.font;
  let print = "";
  if (layoutId === "pocket") {
    const size = 64 * design.artworkScale;
    const cx = 380;
    const top = 150 + (64 - size) / 2;
    print += artwork(input.artworkHref, cx - size / 2, top, size, ink);
    print += textEl(t.line1, cx, 238, fitSize(t.line1, 11, 96, 0.62), font, ink, 'letter-spacing="0.6"');
  } else {
    const size = 210 * design.artworkScale;
    const box = 210;
    if (t.position === "above") {
      print += textEl(t.line1, 300, 168, fitSize(t.line1, 28, 260), font, ink);
      print += textEl(t.line2, 300, 194, fitSize(t.line2, 14, 280, 0.52), "sans", ink, 'letter-spacing="1.2"');
      print += artwork(input.artworkHref, 300 - size / 2, 214 + (box - size) / 2, size, ink);
    } else {
      print += artwork(input.artworkHref, 300 - size / 2, 138 + (box - size) / 2, size, ink);
      print += textEl(t.line1, 300, 392, fitSize(t.line1, 28, 260), font, ink);
      print += textEl(t.line2, 300, 418, fitSize(t.line2, 14, 280, 0.52), "sans", ink, 'letter-spacing="1.2"');
    }
  }
  return `
<defs>
  <linearGradient id="shade-${uid}" x1="0" x2="1" y1="0" y2="0">
    <stop offset="0" stop-color="#000" stop-opacity="0.10"/>
    <stop offset="0.28" stop-color="#000" stop-opacity="0"/>
    <stop offset="0.5" stop-color="#fff" stop-opacity="0.07"/>
    <stop offset="0.72" stop-color="#000" stop-opacity="0"/>
    <stop offset="1" stop-color="#000" stop-opacity="0.12"/>
  </linearGradient>
  <clipPath id="body-${uid}"><path d="${SHIRT_PATH}"/></clipPath>
</defs>
<ellipse cx="300" cy="618" rx="190" ry="12" fill="#000" opacity="0.08"/>
<path d="${SHIRT_PATH}" fill="${base}" stroke="#000" stroke-opacity="0.18" stroke-width="2"/>
<g clip-path="url(#body-${uid})">${print}</g>
<path d="${SHIRT_PATH}" fill="url(#shade-${uid})" pointer-events="none"/>
<path d="M228 52 C252 94 348 94 372 52" fill="none" stroke="#000" stroke-opacity="0.16" stroke-width="9"/>
<path d="M144 210 L130 84 M456 210 L470 84" stroke="#000" stroke-opacity="0.07" stroke-width="2" fill="none"/>
<path d="M210 300 C230 420 220 520 236 600 M392 320 C382 430 396 520 380 600" stroke="#000" stroke-opacity="0.035" stroke-width="10" fill="none"/>`;
}

function poster(input: PreviewInput, base: string, ink: string): string {
  const { design, layoutId } = input;
  const t = design.text;
  const x = 135, y = 28, w = 330, h = 466;
  let inner = "";
  if (layoutId === "framed") {
    const size = 210 * design.artworkScale;
    inner += `<rect x="${x + 16}" y="${y + 16}" width="${w - 32}" height="${h - 32}" fill="none" stroke="${ink}" stroke-width="2"/>`;
    inner += artwork(input.artworkHref, 300 - size / 2, 70 + (210 - size) / 2, size, ink);
    inner += `<rect x="${x + 16}" y="320" width="${w - 32}" height="104" fill="${ink}" opacity="0.08"/>`;
    inner += textEl(t.line1, 300, 366, fitSize(t.line1, 30, 270), t.font, ink);
    inner += textEl(t.line2, 300, 396, fitSize(t.line2, 13, 270, 0.52), "sans", ink, 'letter-spacing="1.4"');
  } else {
    const size = 250 * design.artworkScale;
    inner += artwork(input.artworkHref, 300 - size / 2, 62 + (250 - size) / 2, size, ink);
    inner += textEl(t.line1, 300, 372, fitSize(t.line1, 32, 280), t.font, ink);
    inner += textEl(t.line2, 300, 402, fitSize(t.line2, 13, 280, 0.52), "sans", ink, 'letter-spacing="1.4"');
  }
  if (input.creditLine) {
    // Fit inside the poster (or its frame), never across the border.
    const room = layoutId === "framed" ? w - 56 : w - 30;
    const credit = input.creditLine.toUpperCase();
    const fs = Math.min(8.5, room / (credit.length * 0.74)).toFixed(2);
    inner += `<text x="300" y="${layoutId === "framed" ? 464 : 472}" text-anchor="middle" fill="${ink}" opacity="0.6" style="font-family:${FONTS.sans.css};font-size:${fs}px;letter-spacing:0.8px">${escapeXml(credit)}</text>`;
  }
  return `
<rect x="${x + 8}" y="${y + 10}" width="${w}" height="${h}" fill="#000" opacity="0.12" rx="2"/>
<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="${base}" stroke="#000" stroke-opacity="0.12"/>
${inner}
<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="none" stroke="#fff" stroke-opacity="0.25"/>`;
}

function glassware(input: PreviewInput, base: string, ink: string): string {
  const { design } = input;
  const size = 150 * design.artworkScale;
  return `
<ellipse cx="300" cy="560" rx="150" ry="14" fill="#000" opacity="0.08"/>
<path d="M170 120 L430 120 L405 540 Q300 558 195 540 Z" fill="${base}" fill-opacity="0.85" stroke="#000" stroke-opacity="0.2" stroke-width="2"/>
<ellipse cx="300" cy="120" rx="130" ry="16" fill="#fff" fill-opacity="0.5" stroke="#000" stroke-opacity="0.15"/>
${artwork(input.artworkHref, 300 - size / 2, 200 + (150 - size) / 2, size, ink)}
${textEl(design.text.line1, 300, 410, fitSize(design.text.line1, 20, 200), design.text.font, ink)}
<path d="M196 150 L222 520" stroke="#fff" stroke-opacity="0.5" stroke-width="10" stroke-linecap="round"/>`;
}

export function renderPreviewSvg(input: PreviewInput): string {
  const product = PRODUCTS[input.productId];
  const uid = (input.uid ?? "p").replace(/[^\w-]/g, "");
  const base = product ? swatch(product.baseColours, input.design.baseColour)?.hex ?? product.baseColours[0].hex : "#ddd";
  const ink = swatch(TEXT_COLOURS, input.design.text.colour)?.hex ?? TEXT_COLOURS[0].hex;
  let body: string;
  if (input.productId === "poster") body = poster(input, base, ink);
  else if (input.productId === "glassware") body = glassware(input, base, ink);
  else body = tshirt(input, base, ink, uid);
  const label = `${product?.name ?? input.productId} preview`;
  const backdrop =
    input.backdrop === false
      ? ""
      : `<defs><radialGradient id="spot-${uid}" cx="0.5" cy="0.42" r="0.75"><stop offset="0" stop-color="#FAFAF7"/><stop offset="0.7" stop-color="#ECEBE5"/><stop offset="1" stop-color="#E2E0D8"/></radialGradient></defs>` +
        `<rect width="600" height="640" fill="url(#spot-${uid})"/>` +
        `<g stroke="#0E1311" stroke-opacity="0.22" stroke-width="1" fill="none"><circle cx="572" cy="28" r="7"/><path d="M560 28h24M572 16v24"/></g>`;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 600 640" role="img" aria-label="${escapeXml(label)}"><title>${escapeXml(label)}</title>${backdrop}${body}</svg>`;
}
