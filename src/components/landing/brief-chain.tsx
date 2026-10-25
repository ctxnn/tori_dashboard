// "From fandom to revenue": the JETRO brief's four stages, each answered by a
// working part of Torii with a live number from this demo. Server component.
import Link from "next/link";
import { Arrow } from "@/components/ui";
import { BrushStroke } from "@/components/japan";

export interface ChainStage {
  step: string;
  brief: string;
  answer: string;
  body: string;
  figure: string;
  figureLabel: string;
  href: string;
  cta: string;
  pattern: "seigaiha" | "shippo" | "seigaiha-red" | "seigaiha-indigo";
}

export function BriefChain({ stages }: { stages: ChainStage[] }) {
  return (
    <section aria-labelledby="chain" className="pt-28">
      <div className="grid gap-6 border-b border-ink pb-8 lg:grid-cols-[1fr_auto] lg:items-end">
        <div>
          <div className="label text-moss">The brief · JETRO-PS-02</div>
          <h2 id="chain" className="mt-4 max-w-3xl text-[38px] font-semibold leading-[0.98] tracking-[-0.045em] sm:text-[60px]">
            From fandom <span className="font-serif font-normal italic text-vermilion">to revenue,</span> in four stages.
          </h2>
          <BrushStroke className="mt-3 h-3 w-48" />
        </div>
        <p className="max-w-sm text-[15px] leading-relaxed text-ink-2">
          The challenge asks how Japanese content companies turn popularity in India into sustainable business. Each stage of its own chain is a working part of Torii — with a live number from this demo.
        </p>
      </div>

      <ol className="mt-10 grid gap-5 md:grid-cols-2 xl:grid-cols-4">
        {stages.map((s, i) => {
          const dark = s.pattern === "seigaiha-red" || s.pattern === "seigaiha-indigo";
          return (
            <li key={s.step} className="relative">
              {i < stages.length - 1 && (
                <span className="absolute -right-4 top-14 z-10 hidden h-px w-3 bg-ink xl:block" aria-hidden />
              )}
              <Link
                href={s.href}
                className={`group relative flex h-full flex-col overflow-hidden rounded-[16px] border p-6 transition hover:-translate-y-0.5 hover:shadow-[var(--shadow-lift)] ${dark ? `border-transparent text-paper ${s.pattern === "seigaiha-red" ? "bg-vermilion" : "bg-indigo"}` : "border-sand bg-card text-ink"}`}
              >
                <div className={`${s.pattern} pointer-events-none absolute inset-x-0 top-0 h-28 [mask-image:linear-gradient(to_bottom,black,transparent)]`} aria-hidden />
                <div className="relative">
                  <div className={`label text-[10px] ${dark ? "text-paper/70" : "text-moss"}`}>{s.step}</div>
                  <div className={`mt-14 text-[13px] ${dark ? "text-paper/75" : "text-moss"}`}>{s.brief}</div>
                  <h3 className="mt-1 text-[24px] font-semibold leading-[1.05] tracking-[-0.035em]">{s.answer}</h3>
                  <p className={`mt-3 text-[14px] leading-relaxed ${dark ? "text-paper/80" : "text-ink-2"}`}>{s.body}</p>
                </div>
                <div className={`relative mt-auto border-t pt-4 ${dark ? "border-paper/25" : "border-sand"}`}>
                  <div className="mt-2 flex items-end justify-between gap-3">
                    <div>
                      <div className="font-mono text-[30px] font-semibold leading-none tracking-[-0.04em]">{s.figure}</div>
                      <div className={`mt-1.5 text-[12px] ${dark ? "text-paper/70" : "text-moss"}`}>{s.figureLabel}</div>
                    </div>
                    <span className="flex shrink-0 items-center gap-1.5 whitespace-nowrap text-[13px] font-medium">{s.cta} <Arrow /></span>
                  </div>
                </div>
              </Link>
            </li>
          );
        })}
      </ol>
    </section>
  );
}
