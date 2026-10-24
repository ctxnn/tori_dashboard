import Link from "next/link";
import type { ReactNode } from "react";
import { Arrow, ProgressBar, Seal } from "@/components/ui";
import { Preview } from "@/components/preview";

interface Props {
  proof: { slug: string; title: string; svg: string; price: string; versionNo: number; hash: string; paid: number; threshold: number } | null;
  ticker: string[];
}

const LINES: ReactNode[] = [
  <>The <span className="font-serif font-normal italic tracking-[-0.02em] text-vermilion">gate</span> between</>,
  <>a licensed kit</>,
  <>and a paid preorder.</>,
];

/** Solid torii silhouette. Ink on ink, so it only reads where it crosses the sun. */
function Torii() {
  return (
    <g className="fill-ink stroke-paper/20" strokeWidth="1">
      <path d="M8 66 C160 106 440 106 592 66 L584 102 C440 132 160 132 16 102 Z" />
      <path d="M62 128 H538 V150 H62 Z" />
      <path d="M282 150 H318 V200 H282 Z" />
      <path d="M36 200 H564 V226 H36 Z" />
      <path d="M116 122 H156 L164 560 H108 Z" />
      <path d="M444 122 H484 L492 560 H436 Z" />
    </g>
  );
}

export function Hero({ proof, ticker }: Props) {
  return (
    <section data-dark-band className="bleed grain relative -mt-10 overflow-hidden bg-ink text-paper sm:-mt-12" aria-label="Introduction">
      <div className="grid-paper-dark absolute inset-0 opacity-60" aria-hidden />
      <div className="relative mx-auto grid min-h-[calc(100dvh-5.2rem)] max-w-7xl items-center gap-6 px-4 pb-24 pt-14 sm:px-6 lg:grid-cols-[1.15fr_0.85fr] lg:pb-20 lg:pt-10">
        <div className="relative z-10">
          <div className="label flex items-center gap-2 text-paper/55">
            <span className="h-2 w-2 bg-vermilion" aria-hidden /> Official Japanese IP × Indian creators
          </div>
          <h1 className="mt-7 text-[44px] font-semibold leading-[0.95] tracking-[-0.05em] sm:text-[64px] lg:text-[62px] xl:text-[78px]">
            {LINES.map((l, i) => (
              <span key={i} className="lift-line">
                <span style={{ animationDelay: `${0.12 + i * 0.12}s` }}>{l}</span>
              </span>
            ))}
          </h1>
          <p className="mt-7 max-w-md animate-rise text-[16px] leading-relaxed text-paper/65 [animation-delay:0.55s]">
            One shared workspace: the owner hands over a kit, a creator proposes a product for their people, one exact version is approved, and fans pay before anything is made.
          </p>
          <div className="mt-9 flex animate-rise flex-wrap gap-3 [animation-delay:0.7s]">
            <a href="#enter" className="group inline-flex h-12 items-center gap-2 rounded-lg bg-vermilion px-6 text-[15px] font-medium text-white transition-colors hover:bg-vermilion-2">
              Step through the gate <Arrow />
            </a>
            <Link href="/how-it-works" className="group inline-flex h-12 items-center gap-2.5 rounded-lg px-5 text-[15px] font-medium text-paper ring-1 ring-inset ring-paper/25 transition-colors hover:ring-paper">
              <span className="grid h-6 w-6 place-items-center rounded-full bg-paper text-ink" aria-hidden>
                <svg viewBox="0 0 16 16" className="ml-0.5 h-2.5 w-2.5" fill="currentColor"><path d="M3 2l11 6-11 6z" /></svg>
              </span>
              Watch it work · 6 min
            </Link>
          </div>
        </div>

        {proof && (
          <div className="relative mx-auto w-full max-w-[640px]">
            <div className="relative aspect-[600/560] w-full">
              <svg viewBox="0 0 600 560" className="absolute inset-0 h-full w-full overflow-visible" aria-hidden>
                <defs>
                  <radialGradient id="sun" cx="0.5" cy="0.38" r="0.65">
                    <stop offset="0" stopColor="#f0563c" />
                    <stop offset="1" stopColor="#c8351f" />
                  </radialGradient>
                </defs>
                <circle cx="300" cy="268" r="236" fill="url(#sun)" style={{ animation: "sunrise 1.4s 0.2s cubic-bezier(0.2,0.7,0.2,1) both", transformOrigin: "300px 268px" }} />
                <Torii />
                <path d="M0 559.5 H600" className="stroke-paper/25" />
              </svg>
              {/* the product sits in the gate's opening */}
              <Link
                href={`/c/${proof.slug}`}
                className="absolute left-[29%] top-[44%] w-[42%] animate-rise overflow-hidden rounded-[4px] shadow-[0_30px_60px_-20px_rgba(0,0,0,0.8)] ring-1 ring-black/20 transition-transform duration-500 [animation-delay:0.9s] hover:-translate-y-1"
                aria-label={`Open ${proof.title}`}
              >
                <Preview svg={proof.svg} />
              </Link>
              <div className="absolute right-[1%] top-[2%] animate-rise [animation-delay:1.25s]">
                <Seal sub={`v${proof.versionNo} · ${proof.hash.slice(0, 6)}`} tone="paper" className="h-[84px] w-[84px] sm:h-[100px] sm:w-[100px]" />
              </div>
              <div className="absolute bottom-[4%] left-[-2%] hidden w-[200px] animate-rise rounded-md bg-paper p-3 text-ink shadow-2xl [animation-delay:1.1s] sm:block">
                <div className="label text-[10px] text-moss">Production gate</div>
                <div className="mt-1 font-mono">
                  <span className="text-[22px] font-semibold tracking-[-0.03em]">{proof.paid}</span>
                  <span className="text-xs text-moss"> / {proof.threshold} paid</span>
                </div>
                <div className="mt-1.5"><ProgressBar value={proof.paid} max={proof.threshold} /></div>
              </div>
            </div>
            <div className="mt-3 flex justify-between font-mono text-[10.5px] uppercase tracking-[0.08em] text-paper/50">
              <span>{proof.title} · v{proof.versionNo}</span>
              <span>{proof.price}</span>
            </div>
          </div>
        )}
      </div>

      <div className="vertical pointer-events-none absolute right-5 top-1/2 hidden -translate-y-1/2 font-serif text-[13px] tracking-[0.5em] text-paper/35 xl:block" aria-hidden>
        公式コラボレーション
      </div>

      {/* live ticker */}
      {ticker.length > 0 && (
        <div className="absolute inset-x-0 bottom-0 border-t border-paper/10 bg-ink/80 backdrop-blur" aria-label="Recent activity in the demo">
          <div className="flex items-center">
            <div className="label z-10 flex shrink-0 items-center gap-2 bg-ink px-4 py-3 text-[10px] text-paper/70 sm:px-6">
              <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-vermilion" aria-hidden /> Live ledger
            </div>
            <div className="relative min-w-0 flex-1 overflow-hidden [mask-image:linear-gradient(to_right,transparent,black_6%,black_94%,transparent)]">
              <div className="flex w-max animate-[marquee_70s_linear_infinite] hover:[animation-play-state:paused]">
                {[0, 1].map((k) => (
                  <ul key={k} className="flex shrink-0 items-center" aria-hidden={k === 1}>
                    {ticker.map((t, i) => (
                      <li key={i} className="flex items-center whitespace-nowrap px-5 py-3 font-mono text-[11.5px] text-paper/65">
                        <span className="mr-5 text-vermilion" aria-hidden>◆</span>
                        {t}
                      </li>
                    ))}
                  </ul>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
