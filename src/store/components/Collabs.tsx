import Link from "next/link";
import type { CollabCard } from "@/store/lib/collabs";

/** Paid units against the production gate. Nothing is made until the bar is full. */
export function GateBar({ c, className = "" }: { c: Pick<CollabCard, "paidUnits" | "threshold" | "thresholdMet">; className?: string }) {
  const pct = c.threshold ? Math.min(100, (c.paidUnits / c.threshold) * 100) : 0;
  return (
    <div className={className}>
      <div className="h-1.5 overflow-hidden rounded-full bg-line" role="progressbar" aria-valuemin={0} aria-valuemax={c.threshold} aria-valuenow={c.paidUnits} aria-label="Paid preorders towards the production gate">
        <div className={`h-full rounded-full ${c.thresholdMet ? "bg-ok" : "bg-accent"}`} style={{ width: `${Math.max(3, pct)}%` }} />
      </div>
    </div>
  );
}

/** The approved design, exactly as the licensor signed it off. Server-generated SVG. */
export function CollabArt({ svg, className = "" }: { svg: string; className?: string }) {
  return <div className={`overflow-hidden rounded-panel bg-[#ECEBE5] [&_svg]:block [&_svg]:h-auto [&_svg]:w-full ${className}`} aria-hidden dangerouslySetInnerHTML={{ __html: svg }} />;
}

export function CollabTile({ c, wide = false }: { c: CollabCard; wide?: boolean }) {
  return (
    <Link href={c.href} className="group block active:opacity-80" aria-label={`${c.title} by ${c.creator}, ${c.price}, ${c.paidUnits} of ${c.threshold} paid`}>
      <div className="relative">
        <CollabArt svg={c.previewSvg} className="border border-line transition-transform duration-500 ease-out group-hover:-translate-y-0.5" />
        <span className={`absolute left-2 top-2 rounded-full px-2 py-0.5 text-[11px] font-bold ${c.open ? "bg-[rgb(222,0,52)] text-white" : "bg-white/90 text-[rgb(24,21,34)]"}`}>{c.open ? `${c.daysLeft}d left` : c.status}</span>
      </div>
      <div className={`mt-2 font-semibold leading-tight ${wide ? "text-[16px]" : "line-clamp-2 text-[13px]"}`}>{c.title}</div>
      <div className="mt-0.5 truncate text-[11.5px] text-muted">{c.creator} · {c.product}</div>
      <GateBar c={c} className="mt-2" />
      <div className="mt-1.5 flex items-baseline justify-between text-[11.5px]">
        <span className="price text-[13px]">{c.price}</span>
        <span className="tabular-nums text-muted">{c.paidUnits}/{c.threshold} paid</span>
      </div>
    </Link>
  );
}

/** A horizontally scrolling row of official collabs, to sit between the manga rows. */
export function CollabRow({ items, title = "Official collabs, made in India", id = "row-collabs", note }: { items: CollabCard[]; title?: string; id?: string; note?: string }) {
  if (!items.length) return null;
  return (
    <section aria-labelledby={id} className="row-lazy">
      <div className="mb-1 flex items-baseline justify-between">
        <h2 id={id} className="h-section">{title}</h2>
        <Link href="/collabs" className="-mr-2 px-2 py-1 text-[13.5px] font-semibold text-accent">See all</Link>
      </div>
      <p className="mb-2.5 text-[13px] leading-snug text-muted">{note ?? "Designed by Indian creators from the publisher’s own kit. Pay now; it’s made only if enough fans join."}</p>
      <ul className="no-scrollbar -mx-4 flex snap-x snap-mandatory gap-3 overflow-x-auto scroll-px-4 px-4 pb-1">
        {items.map((c) => (
          <li key={c.slug} className="w-[44%] min-w-[150px] max-w-[190px] shrink-0 snap-start">
            <CollabTile c={c} />
          </li>
        ))}
      </ul>
    </section>
  );
}
