import CoverImg from "./CoverImg";
import { AutoCover, AutoFigure } from "./AutoArt";
/* Original generated artwork: manga-panel book jackets and studio renders of an abstract
   figure. No copyrighted covers, characters or product photos. If a publisher supplies
   official art, pass `image` and it is used instead. */

const hash = (s: string) => { let h = 2166136261; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; };
const rng = (seed: number) => () => ((seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0) / 4294967296);

export function shade(hex: string, pct: number) {
  const n = parseInt(hex.slice(1), 16);
  const f = (c: number) => Math.max(0, Math.min(255, Math.round(pct < 0 ? c * (1 + pct / 100) : c + (255 - c) * (pct / 100))));
  const r = f(n >> 16), g = f((n >> 8) & 255), b = f(n & 255);
  return `#${((1 << 24) | (r << 16) | (g << 8) | b).toString(16).slice(1)}`;
}
export function hueShift(hex: string, deg: number) {
  const n = parseInt(hex.slice(1), 16); let r = (n >> 16) / 255, g = ((n >> 8) & 255) / 255, b = (n & 255) / 255;
  const mx = Math.max(r, g, b), mn = Math.min(r, g, b); let h = 0; const l = (mx + mn) / 2; const d = mx - mn;
  const s = d === 0 ? 0 : d / (1 - Math.abs(2 * l - 1));
  if (d) h = mx === r ? ((g - b) / d) % 6 : mx === g ? (b - r) / d + 2 : (r - g) / d + 4;
  h = (h * 60 + deg + 360) % 360;
  const c = (1 - Math.abs(2 * l - 1)) * s, x = c * (1 - Math.abs(((h / 60) % 2) - 1)), m = l - c / 2;
  [r, g, b] = h < 60 ? [c, x, 0] : h < 120 ? [x, c, 0] : h < 180 ? [0, c, x] : h < 240 ? [0, x, c] : h < 300 ? [x, 0, c] : [c, 0, x];
  const to = (v: number) => Math.round((v + m) * 255);
  return `#${((1 << 24) | (to(r) << 16) | (to(g) << 8) | to(b)).toString(16).slice(1)}`;
}
function wrap(title: string, max: number) {
  const words = title.replace(/:.*/, "").split(" "); const lines: string[] = []; let cur = "";
  for (const w of words) { if ((cur + " " + w).trim().length > max && cur) { lines.push(cur); cur = w; } else cur = (cur + " " + w).trim(); }
  if (cur) lines.push(cur);
  return lines.slice(0, 4);
}

const INK = "#1a1625";
const q = (n: number) => Math.round(n * 100) / 100;

export function Cover({ title, color, sub, vol, size = "md", dim = false, image, className = "" }:
  { title: string; color: string; sub?: string; vol?: number; size?: "sm" | "md" | "lg"; dim?: boolean; image?: string; className?: string }) {
  const wrapCls = `relative aspect-[2/3] w-full overflow-hidden rounded-[8px] bg-ink ring-1 ring-inset ring-black/10 ${size === "sm" ? "shadow-panel-sm" : "shadow-panel"} ${dim ? "opacity-35 saturate-0" : ""} ${className}`;
  if (image) {
    return <div className={`${wrapCls} [container-type:inline-size]`}><CoverImg src={image} title={title} color={color} eager={size === "lg"} /></div>;
  }
  const seed = hash(title);
  const r = rng(seed + (vol ?? 0) * 7919);
  const base = vol ? hueShift(color, ((vol * 23) % 50) - 25) : color;
  const dark = shade(base, -45), light = shade(base, 55);
  const variant = (seed + (vol ?? 0)) % 4;
  const pid = `t${seed.toString(36)}${vol ?? ""}`;
  const lines = wrap(title, title.length > 18 ? 9 : 8);
  const fs = lines.some((l) => l.length > 7) ? 24 : 30;
  const fx = 40 + r() * 120, fy = 150 + r() * 90;

  return (
    <div className={`${wrapCls} [container-type:inline-size]`}>
      <AutoCover title={title} color={color} eager={size === "lg"}>
      <svg viewBox="0 0 200 300" className="block h-full w-full" role="img" aria-label={`${title}${vol ? ` volume ${vol}` : ""} cover`}>
        <defs>
          <pattern id={`${pid}d`} width="7" height="7" patternUnits="userSpaceOnUse"><circle cx="3.5" cy="3.5" r="1.5" fill={INK} opacity=".55" /></pattern>
          <pattern id={`${pid}w`} width="6" height="6" patternUnits="userSpaceOnUse"><circle cx="3" cy="3" r="1.2" fill="#fff" opacity=".7" /></pattern>
          <radialGradient id={`${pid}g`} cx="50%" cy="45%" r="70%"><stop offset="0" stopColor={light} /><stop offset="1" stopColor={base} /></radialGradient>
        </defs>
        <rect width="200" height="300" fill={`url(#${pid}g)`} />
        {variant === 0 && (
          <g>
            {Array.from({ length: 46 }, (_, i) => {
              const a = (i / 46) * Math.PI * 2 + r() * 0.05, w = 0.012 + r() * 0.03;
              return <path key={i} d={`M${q(fx)} ${q(fy)} L${q(fx + Math.cos(a - w) * 420)} ${q(fy + Math.sin(a - w) * 420)} L${q(fx + Math.cos(a + w) * 420)} ${q(fy + Math.sin(a + w) * 420)}Z`} fill={i % 3 ? dark : INK} opacity={i % 3 ? 0.55 : 0.8} />;
            })}
            <circle cx={q(fx)} cy={q(fy)} r="34" fill={light} />
            <circle cx={q(fx)} cy={q(fy)} r="34" fill={`url(#${pid}d)`} opacity=".5" />
          </g>
        )}
        {variant === 1 && (
          <g>
            <path d={`M0 ${q(120 + r() * 60)} L200 ${q(60 + r() * 50)} L200 300 L0 300Z`} fill={dark} />
            <path d={`M0 ${q(120 + r() * 60)} L200 ${q(60 + r() * 50)} L200 300 L0 300Z`} fill={`url(#${pid}d)`} opacity=".6" />
            <path d={`M-10 ${q(190 + r() * 30)} L210 ${q(150 + r() * 30)}`} stroke={INK} strokeWidth="6" />
            <path d={`M-10 ${q(200 + r() * 30)} L210 ${q(160 + r() * 30)}`} stroke="#fff" strokeWidth="2" opacity=".8" />
          </g>
        )}
        {variant === 2 && (
          <g>
            {Array.from({ length: 9 }, (_, i) => <circle key={i} cx={q(fx)} cy={q(fy)} r={110 - i * 12} fill={i % 2 ? light : dark} opacity={i % 2 ? 0.9 : 0.6} />)}
            <circle cx={q(fx)} cy={q(fy)} r="110" fill={`url(#${pid}w)`} opacity=".35" />
          </g>
        )}
        {variant === 3 && (
          <g>
            {Array.from({ length: 7 }, (_, i) => <rect key={i} x={-60 + i * 48} y="-40" width={q(18 + r() * 14)} height="420" fill={i % 2 ? INK : dark} opacity={i % 2 ? 0.75 : 0.5} transform="rotate(24 100 150)" />)}
            <rect x="0" y="0" width="200" height="300" fill={`url(#${pid}w)`} opacity=".2" />
          </g>
        )}
        {/* manga panel gutter */}
        <rect x="8" y="8" width="184" height="284" fill="none" stroke="#fff" strokeWidth="3" />
        <rect x="0" y="0" width="12" height="300" fill={INK} opacity=".28" />
        {/* title block */}
        <g fontFamily="'Dela Gothic One', sans-serif" fill="#fff" style={{ paintOrder: "stroke" }} stroke={INK} strokeWidth={fs / 5} strokeLinejoin="round">
          {lines.map((l, i) => <text key={i} x="20" y={40 + fs * 0.95 + i * fs * 1.08} fontSize={fs}>{l}</text>)}
        </g>
        {vol !== undefined && (
          <g fontFamily="'Dela Gothic One', sans-serif">
            <text x="186" y="282" textAnchor="end" fontSize="64" fill="none" stroke="#fff" strokeWidth="2.5">{vol}</text>
          </g>
        )}
        {sub && (
          <g>
            <rect x="20" y="258" width={Math.min(150, sub.length * 6.4 + 14)} height="20" fill={INK} />
            <text x="27" y="272" fontSize="10.5" fontWeight="800" fill="#fff" fontFamily="'Hanken Grotesk Variable', sans-serif">{sub}</text>
          </g>
        )}
      </svg>
      </AutoCover>
    </div>
  );
}

/** Studio render of an abstract posable figure (never a specific character). */
export function FigureArt({ color, name = "", variant = 0, className = "", rounded = true, image, character }: { color: string; name?: string; variant?: 0 | 1 | 2; className?: string; rounded?: boolean; image?: string; character?: string }) {
  // eslint-disable-next-line @next/next/no-img-element
  if (image && variant === 0) return <img src={image} alt={name} loading="lazy" referrerPolicy="no-referrer" className={`block aspect-square w-full object-cover object-top ${rounded ? "rounded-[10px]" : ""} ${className}`} />;
  if (character && variant === 0) return <AutoFigure character={character} name={name} className={className} rounded={rounded}><FigureArt color={color} name={name} className={className} rounded={rounded} /></AutoFigure>;
  const seed = hash(name + variant);
  const r = rng(seed);
  const id = `f${seed.toString(36)}`;
  const light = shade(color, 78), mid = shade(color, 35), deep = shade(color, -40);
  const pose = POSES[(hash(name) + (variant === 1 ? 1 : 0)) % POSES.length];
  if (variant === 2) {
    return (
      <svg viewBox="0 0 200 200" className={`block w-full ${rounded ? "rounded-[10px]" : ""} ${className}`} role="img" aria-label="Official box">
        <defs><linearGradient id={`${id}b`} x1="0" x2="1"><stop offset="0" stopColor={light} /><stop offset="1" stopColor={mid} /></linearGradient></defs>
        <rect width="200" height="200" fill={`url(#${id}b)`} />
        <path d="M58 26 L150 26 L162 36 L162 182 L70 182 L58 172Z" fill={deep} />
        <rect x="58" y="36" width="92" height="146" fill={color} stroke={INK} strokeWidth="3" />
        <path d="M150 36 L162 26 L162 172 L150 182Z" fill={shade(color, -20)} stroke={INK} strokeWidth="3" strokeLinejoin="round" />
        <rect x="68" y="48" width="72" height="96" rx="4" fill="#fff" opacity=".9" stroke={INK} strokeWidth="2" />
        <g transform="translate(104 128) scale(.42)">{figureBody(pose, color, deep, light)}</g>
        <rect x="68" y="152" width="72" height="20" fill={INK} />
        <text x="104" y="166" textAnchor="middle" fontSize="10" fontWeight="800" fill="#fff" fontFamily="'Hanken Grotesk Variable', sans-serif" letterSpacing="1">OFFICIAL</text>
      </svg>
    );
  }
  return (
    <svg viewBox="0 0 200 200" className={`block w-full ${rounded ? "rounded-[10px]" : ""} ${className}`} role="img" aria-label="Figure render">
      <defs>
        <radialGradient id={`${id}s`} cx="50%" cy="38%" r="65%"><stop offset="0" stopColor="#fff" /><stop offset=".55" stopColor={light} /><stop offset="1" stopColor={mid} /></radialGradient>
        <pattern id={`${id}d`} width="6" height="6" patternUnits="userSpaceOnUse"><circle cx="3" cy="3" r="1" fill={INK} opacity=".18" /></pattern>
      </defs>
      <rect width="200" height="200" fill={`url(#${id}s)`} />
      <rect width="200" height="200" fill={`url(#${id}d)`} opacity=".7" />
      {Array.from({ length: 10 }, (_, i) => <path key={i} d={`M${q(100 + (r() - 0.5) * 30)} 96 L${q((i / 9) * 260 - 30)} -10`} stroke="#fff" strokeWidth={q(1 + r() * 2)} opacity=".55" />)}
      <ellipse cx="100" cy="176" rx="58" ry="11" fill={INK} opacity=".18" />
      <ellipse cx="100" cy="168" rx="48" ry="10" fill={deep} stroke={INK} strokeWidth="2.5" />
      <ellipse cx="100" cy="165" rx="48" ry="10" fill={shade(color, -10)} stroke={INK} strokeWidth="2.5" />
      <g transform={`translate(100 160) ${variant === 1 ? "scale(-1 1)" : ""}`}>{figureBody(pose, color, deep, light)}</g>
    </svg>
  );
}

type Pose = { lean: number; armL: [number, number]; armR: [number, number]; legL: number; legR: number };
const POSES: Pose[] = [
  { lean: -4, armL: [-140, -100], armR: [-40, -70], legL: 12, legR: -18 },
  { lean: 6, armL: [150, 120], armR: [-20, 20], legL: 22, legR: -6 },
  { lean: -8, armL: [-160, -175], armR: [-30, -10], legL: 8, legR: -28 },
  { lean: 2, armL: [200, 160], armR: [-60, -100], legL: 18, legR: -14 },
];
function limb(x: number, y: number, a1: number, a2: number, l1: number, l2: number) {
  const rad = (d: number) => (d * Math.PI) / 180;
  const ex = x + Math.cos(rad(a1)) * l1, ey = y + Math.sin(rad(a1)) * l1;
  return { d: `M${q(x)} ${q(y)} L${q(ex)} ${q(ey)} L${q(ex + Math.cos(rad(a2)) * l2)} ${q(ey + Math.sin(rad(a2)) * l2)}` };
}
function figureBody(p: Pose, color: string, deep: string, light: string) {
  const hip = { x: 0, y: -52 }, sh = { x: p.lean, y: -96 };
  const legL = limb(hip.x - 7, hip.y, 90 + p.legL, 92 + p.legL / 2, 28, 26), legR = limb(hip.x + 7, hip.y, 90 + p.legR, 90 + p.legR / 3, 28, 26);
  const armL = limb(sh.x - 13, sh.y + 2, p.armL[0], p.armL[1], 24, 22), armR = limb(sh.x + 13, sh.y + 2, p.armR[0], p.armR[1], 24, 22);
  const S = { fill: "none", strokeLinecap: "round" as const, strokeLinejoin: "round" as const };
  return (
    <g>
      {/* outline pass */}
      <g stroke={INK} strokeWidth="17" {...S}><path d={legL.d} /><path d={legR.d} /><path d={armL.d} /><path d={armR.d} /></g>
      <path d={`M${hip.x - 15} ${hip.y + 4} Q${sh.x - 24} ${sh.y + 22} ${sh.x - 18} ${sh.y} L${sh.x + 18} ${sh.y} Q${sh.x + 24} ${sh.y + 22} ${hip.x + 15} ${hip.y + 4}Z`} fill={INK} stroke={INK} strokeWidth="6" strokeLinejoin="round" />
      <circle cx={sh.x + p.lean * 0.4} cy={sh.y - 19} r="15" fill={INK} />
      {/* colour pass */}
      <g strokeWidth="11" {...S}><path d={legL.d} stroke={deep} /><path d={armL.d} stroke={deep} /><path d={legR.d} stroke={color} /><path d={armR.d} stroke={color} /></g>
      <path d={`M${hip.x - 13} ${hip.y + 2} Q${sh.x - 21} ${sh.y + 22} ${sh.x - 16} ${sh.y + 2} L${sh.x + 16} ${sh.y + 2} Q${sh.x + 21} ${sh.y + 22} ${hip.x + 13} ${hip.y + 2}Z`} fill={color} />
      <path d={`M${sh.x + 10} ${sh.y + 6} Q${sh.x + 15} ${sh.y + 22} ${hip.x + 9} ${hip.y - 2}`} stroke={light} strokeWidth="3" fill="none" strokeLinecap="round" opacity=".8" />
      <circle cx={sh.x + p.lean * 0.4} cy={sh.y - 19} r="12" fill={color} />
      <circle cx={sh.x + p.lean * 0.4 + 4} cy={sh.y - 23} r="4" fill={light} opacity=".8" />
    </g>
  );
}
