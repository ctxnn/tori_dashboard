import { formatINR } from "@/lib/money";

export interface Slice {
  label: string;
  sub: string;
  value: number;
  className: string;
}

/** Where every rupee of net item sales goes, as one stacked bar. */
export function AllocationBar({ total, slices }: { total: number; slices: Slice[] }) {
  if (total <= 0) {
    return <div className="grid-paper flex h-14 items-center justify-center rounded-md border border-dashed border-sand-2 text-sm text-moss">Nothing delivered yet — earnings appear here on delivery.</div>;
  }
  return (
    <figure>
      <div className="flex h-14 w-full overflow-hidden rounded-md" role="img" aria-label={slices.map((s) => `${s.label} ${formatINR(s.value)}`).join(", ")}>
        {slices.map((s) => (
          <div key={s.label} className={`${s.className} relative h-full border-r border-paper/40 last:border-r-0`} style={{ width: `${(s.value / total) * 100}%` }}>
            <span className="label absolute bottom-1.5 left-2 hidden text-[10px] opacity-80 sm:block">{Math.round((s.value / total) * 100)}%</span>
          </div>
        ))}
      </div>
      <figcaption className="mt-4 grid grid-cols-2 gap-x-6 gap-y-4 sm:grid-cols-4">
        {slices.map((s) => (
          <div key={s.label} className="min-w-0">
            <div className="flex items-center gap-2">
              <span className={`h-2.5 w-2.5 shrink-0 rounded-sm ${s.className}`} aria-hidden />
              <span className="label truncate text-moss">{s.label}</span>
            </div>
            <div className="mt-1 text-[22px] font-semibold leading-none tracking-[-0.03em] tabular-nums">{formatINR(s.value)}</div>
            <div className="mt-1 text-xs text-moss">{s.sub}</div>
          </div>
        ))}
      </figcaption>
    </figure>
  );
}
