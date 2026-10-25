/** Little objects for the new look's sticker desktop. Pure SVG/HTML, no external images. */

/** heyclicky's "HELLO my name is" badge, in torii red. */
export function NameTag({ name = "torii", jp = "鳥居" }: { name?: string; jp?: string }) {
  return (
    <div className="w-[150px] overflow-hidden rounded-[10px] bg-[#e8402f] shadow-[inset_0_0_0_1px_rgba(0,0,0,0.08)]">
      <div className="px-2 pt-1.5 text-center leading-none text-white">
        <div className="text-[17px] font-black tracking-[0.02em]">HELLO</div>
        <div className="mt-0.5 text-[9px] font-semibold">my name is</div>
      </div>
      <div className="mx-1.5 mb-1.5 mt-1.5 rounded-[5px] bg-white px-2 py-2 text-center">
        <span className="font-[family-name:var(--font-averia)] text-[24px] font-bold leading-none tracking-[-0.04em] text-[#0c0c0f]">{name}</span>
        <span className="ml-1 align-top text-[10px] text-black/45" lang="ja">{jp}</span>
      </div>
    </div>
  );
}

/** A hanko approval stamp. */
export function HankoSticker({ size = 84 }: { size?: number }) {
  return (
    <svg viewBox="0 0 100 100" width={size} height={size} className="-rotate-6">
      <circle cx="50" cy="50" r="46" fill="#fff" />
      <circle cx="50" cy="50" r="42" fill="none" stroke="#e8402f" strokeWidth="4" />
      <circle cx="50" cy="50" r="35" fill="none" stroke="#e8402f" strokeWidth="1.4" />
      <text x="50" y="58" textAnchor="middle" fill="#e8402f" style={{ fontSize: 26, fontWeight: 700, fontFamily: "Hiragino Mincho ProN, Yu Mincho, serif" }}>
        承認
      </text>
      <text x="50" y="74" textAnchor="middle" fill="#e8402f" style={{ fontSize: 7.5, letterSpacing: 1.6, fontFamily: "var(--font-inter)", fontWeight: 600 }}>
        APPROVED
      </text>
    </svg>
  );
}

/** A macOS-style folder holding the asset kit. */
export function FolderSticker({ label = "kit v3" }: { label?: string }) {
  return (
    <div className="flex w-[92px] flex-col items-center">
      <svg viewBox="0 0 64 50" width="78" height="61">
        <defs>
          <linearGradient id="fold-back" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#7cbdf6" />
            <stop offset="1" stopColor="#4e9be8" />
          </linearGradient>
          <linearGradient id="fold-front" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#a6d6ff" />
            <stop offset="1" stopColor="#6db4f5" />
          </linearGradient>
        </defs>
        <path d="M3 8a4 4 0 0 1 4-4h16l5 5h29a4 4 0 0 1 4 4v31a4 4 0 0 1-4 4H7a4 4 0 0 1-4-4z" fill="url(#fold-back)" />
        <path d="M3 17a4 4 0 0 1 4-4h50a4 4 0 0 1 4 4v27a4 4 0 0 1-4 4H7a4 4 0 0 1-4-4z" fill="url(#fold-front)" />
        <path d="M5 16h54" stroke="#fff" strokeOpacity="0.55" strokeWidth="1.2" />
      </svg>
      <span className="mt-1 rounded-[4px] bg-[#2d5bd2] px-1.5 py-[1px] text-[11px] font-medium text-white">{label}</span>
    </div>
  );
}

/** A kraft hang tag with a price. */
export function PriceTag({ price }: { price: string }) {
  return (
    <svg viewBox="0 0 120 64" width="124" height="66">
      <path d="M22 4h90a5 5 0 0 1 5 5v46a5 5 0 0 1-5 5H22L4 32z" fill="#d9b37a" />
      <path d="M22 4h90a5 5 0 0 1 5 5v46a5 5 0 0 1-5 5H22L4 32z" fill="none" stroke="#b88f52" strokeWidth="1.2" />
      <circle cx="20" cy="32" r="4.5" fill="#fff" stroke="#b88f52" />
      <text x="70" y="40" textAnchor="middle" fill="#3b2a12" style={{ fontSize: 22, fontWeight: 700, fontFamily: "var(--font-inter)", letterSpacing: -0.8 }}>
        {price}
      </text>
    </svg>
  );
}

/** The authenticity tag every collab item ships with. */
export function QrTag({ code = "T1-7KQ2" }: { code?: string }) {
  // a fixed, QR-looking pattern (decorative)
  const cells = "1110111010001101010110111010110001011101111011001011010110111011101101001011101110100110110111".split("");
  return (
    <div className="w-[98px] rounded-[12px] bg-white p-2 shadow-[inset_0_0_0_1px_rgba(0,0,0,0.08)]">
      <div className="grid grid-cols-[repeat(12,1fr)] gap-[1px]">
        {cells.slice(0, 96).map((c, i) => (
          <span key={i} className={`aspect-square rounded-[1px] ${c === "1" ? "bg-[#0c0c0f]" : "bg-transparent"}`} />
        ))}
      </div>
      <div className="mt-1.5 text-center font-mono text-[9.5px] tracking-[0.04em] text-black/60">{code}</div>
      <div className="text-center text-[8.5px] font-semibold uppercase tracking-[0.12em] text-[#2f8a62]">official</div>
    </div>
  );
}

/** A torii gate in vermilion. */
export function GateSticker({ size = 76 }: { size?: number }) {
  return (
    <svg viewBox="0 0 32 32" width={size} height={size} fill="#e8402f">
      <path d="M1.5 5.2 Q16 9.6 30.5 5.2 L29.6 8.6 Q16 11.6 2.4 8.6 Z" />
      <rect x="4.6" y="13" width="22.8" height="2.4" rx="0.4" />
      <rect x="7.6" y="9.6" width="2.8" height="19.4" rx="0.4" />
      <rect x="21.6" y="9.6" width="2.8" height="19.4" rx="0.4" />
      <rect x="14.8" y="10.4" width="2.4" height="2.8" />
    </svg>
  );
}

/** A five-petal sakura blossom. */
export function SakuraSticker({ size = 58 }: { size?: number }) {
  return (
    <svg viewBox="-50 -50 100 100" width={size} height={size}>
      {[0, 72, 144, 216, 288].map((a) => (
        <path key={a} transform={`rotate(${a})`} d="M0 -6 C-16 -18 -18 -38 -6 -46 L0 -40 L6 -46 C18 -38 16 -18 0 -6Z" fill="#f6b8c6" stroke="#ec93a8" strokeWidth="1.5" />
      ))}
      <circle r="8" fill="#ffe08a" />
    </svg>
  );
}

/** A "made in india" rubber stamp. */
export function IndiaStamp() {
  return (
    <div className="rotate-[-8deg] rounded-[8px] border-[2.5px] border-[#2f8a62] bg-white px-2.5 py-1.5 text-center leading-none text-[#2f8a62]">
      <div className="text-[9px] font-bold uppercase tracking-[0.16em]">made in</div>
      <div className="mt-0.5 text-[17px] font-black uppercase tracking-[0.04em]">india</div>
    </div>
  );
}

/** A manga volume cover, framed like a printed sticker. */
export function CoverSticker({ src, alt, width = 104 }: { src: string; alt: string; width?: number }) {
  return (
    <div className="overflow-hidden rounded-[6px] border-[4px] border-white bg-white shadow-[0_14px_22px_-8px_rgba(0,0,0,0.3)]" style={{ width }}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={src} alt={alt} draggable={false} className="block aspect-[2/3] w-full object-cover" />
    </div>
  );
}
