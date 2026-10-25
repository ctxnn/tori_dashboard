import Link from "next/link";
import { Cover } from "./Art";

export type RowItem = { slug: string; title: string; color: string; image?: string; meta?: string };

/** A horizontally scrolling shelf of covers, with a See all link. */
export default function Row({ title, href, items, id }: { title: string; href?: string; items: RowItem[]; id: string }) {
  return (
    <section aria-labelledby={id} className="row-lazy">
      <div className="mb-2.5 flex items-baseline justify-between">
        <h2 id={id} className="h-section">{title}</h2>
        {href && <Link href={href} className="-mr-2 px-2 py-1 text-[13.5px] font-semibold text-accent">See all</Link>}
      </div>
      <ul className="no-scrollbar -mx-4 flex snap-x snap-mandatory gap-3 overflow-x-auto scroll-px-4 px-4 pb-1">
        {items.map((s) => (
          <li key={s.slug} className="w-[30%] min-w-[104px] max-w-[124px] shrink-0 snap-start">
            <Link href={`/read/${s.slug}`} className="group block active:opacity-80">
              <Cover title={s.title} color={s.color} image={s.image} size="sm" />
              <div className="mt-2 line-clamp-2 text-[13px] font-semibold leading-tight">{s.title}</div>
              {s.meta && <div className="mt-0.5 text-[11.5px] text-muted">{s.meta}</div>}
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
