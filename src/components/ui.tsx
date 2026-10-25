import Link from "next/link";
import type { ComponentProps, ReactNode } from "react";

export function cx(...parts: (string | false | null | undefined)[]): string {
  return parts.filter(Boolean).join(" ");
}

type Tone = "neutral" | "ok" | "warn" | "fail" | "info" | "pine" | "vermilion" | "gold";

const DOT: Record<Tone, string> = {
  neutral: "bg-moss",
  ok: "bg-ok",
  warn: "bg-warn",
  fail: "bg-fail",
  info: "bg-info",
  pine: "bg-pine",
  vermilion: "bg-vermilion",
  gold: "bg-gold",
};

const TONE_TEXT: Record<Tone, string> = {
  neutral: "text-ink-2 bg-ivory",
  ok: "text-ok bg-ok-soft",
  warn: "text-warn bg-warn-soft",
  fail: "text-fail bg-fail-soft",
  info: "text-info bg-info-soft",
  pine: "text-paper bg-pine",
  vermilion: "text-vermilion-2 bg-vermilion-soft",
  gold: "text-[#7a5a18] bg-gold-soft",
};

/** Status tag: a coloured dot and a short label. */
export function Badge({ tone = "neutral", children, className }: { tone?: Tone; children: ReactNode; className?: string }) {
  return (
    <span className={cx("ui-badge inline-flex items-center gap-1.5 whitespace-nowrap rounded-[5px] px-2 py-[3px] text-[12px] font-medium leading-none", TONE_TEXT[tone], className)}>
      <span className={cx("h-1.5 w-1.5 shrink-0 rounded-full", tone === "pine" ? "bg-vermilion" : DOT[tone])} aria-hidden />
      {children}
    </span>
  );
}

const BTN = {
  primary: "bg-ink text-paper hover:bg-pine",
  accent: "bg-vermilion text-white hover:bg-vermilion-2",
  secondary: "bg-card text-ink ring-1 ring-inset ring-sand-2 hover:ring-ink",
  ghost: "text-ink-2 hover:bg-ivory hover:text-ink",
  danger: "bg-card text-fail ring-1 ring-inset ring-fail/35 hover:bg-fail-soft",
};

export type ButtonVariant = keyof typeof BTN;

export function buttonClass(variant: ButtonVariant = "primary", size: "sm" | "md" | "lg" = "md") {
  const sizes = { sm: "h-8 px-3 text-[13px]", md: "h-10 px-4 text-sm", lg: "h-12 px-6 text-[15px]" };
  return cx(
    `ui-btn ui-btn-${variant}`,
    "group/btn inline-flex items-center justify-center gap-2 rounded-lg font-medium tracking-[-0.01em] transition-[background-color,box-shadow,color,transform] active:translate-y-px disabled:pointer-events-none disabled:opacity-45",
    sizes[size],
    BTN[variant],
  );
}

export function Button({ variant = "primary", size = "md", className, ...props }: ComponentProps<"button"> & { variant?: ButtonVariant; size?: "sm" | "md" | "lg" }) {
  return <button className={cx(buttonClass(variant, size), className)} {...props} />;
}

export function LinkButton({ variant = "primary", size = "md", className, ...props }: ComponentProps<typeof Link> & { variant?: ButtonVariant; size?: "sm" | "md" | "lg" }) {
  return <Link className={cx(buttonClass(variant, size), className)} {...props} />;
}

export function Arrow({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 16 16" className={cx("h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5 group-hover/btn:translate-x-0.5", className)} fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden>
      <path d="M2 8h11M9 4l4 4-4 4" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function Card({ className, children, ...props }: ComponentProps<"section">) {
  return (
    <section className={cx("ui-card rounded-[var(--radius-card)] border border-sand bg-card", className)} {...props}>
      {children}
    </section>
  );
}

export function CardHeader({ title, subtitle, action, eyebrow }: { title: ReactNode; subtitle?: ReactNode; action?: ReactNode; eyebrow?: ReactNode }) {
  return (
    <div className="flex flex-wrap items-start justify-between gap-3 px-5 pb-3 pt-5 sm:px-6">
      <div className="min-w-0">
        {eyebrow && <div className="label mb-2 text-moss">{eyebrow}</div>}
        <h2 className="text-[17px] font-semibold leading-tight text-ink">{title}</h2>
        {subtitle && <p className="mt-1 text-[13px] leading-snug text-moss">{subtitle}</p>}
      </div>
      {action}
    </div>
  );
}

// ---------------------------------------------------------------------------
// The five-stage rail: the spine of the product, shown on every working page.
// ---------------------------------------------------------------------------

export const STAGES = [
  { n: 1, short: "Kit", title: "Authorised kit" },
  { n: 2, short: "Offer", title: "Creator offer" },
  { n: 3, short: "Approval", title: "Checks & approval" },
  { n: 4, short: "Preorders", title: "Paid validation" },
  { n: 5, short: "Results", title: "Commercial results" },
] as const;

/** Line icon for each stage: kit box, creator's pen, approval seal, preorder bag, results chart. */
const STAGE_PATHS: Record<number, ReactNode> = {
  1: (
    <>
      <path d="M3.5 8.5 12 4l8.5 4.5v8L12 21l-8.5-4.5z" />
      <path d="M3.5 8.5 12 13l8.5-4.5M12 13v8" />
    </>
  ),
  2: (
    <>
      <path d="M4 20l1-4.5L15.5 5a2.1 2.1 0 0 1 3 3L8 18.5z" />
      <path d="M13.5 7l3 3M4 20h7" />
    </>
  ),
  3: (
    <>
      <circle cx="12" cy="12" r="8.5" />
      <path d="M8.2 12.3l2.6 2.6 5-5.4" />
    </>
  ),
  4: (
    <>
      <path d="M5 8h14l-1.2 12.5H6.2z" />
      <path d="M9 10.5V7a3 3 0 0 1 6 0v3.5" />
    </>
  ),
  5: (
    <>
      <path d="M3.5 20.5h17" />
      <path d="M7 17v-4M12 17V9M17 17V5" />
    </>
  ),
};

export function StageIcon({ n, className, strokeWidth = 1.7 }: { n: number; className?: string; strokeWidth?: number }) {
  return (
    <svg viewBox="0 0 24 24" className={cx("shrink-0", className)} fill="none" stroke="currentColor" strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      {STAGE_PATHS[n]}
    </svg>
  );
}

export function StageRail({ current, className, dark = false }: { current: number; className?: string; dark?: boolean }) {
  return (
    <ol className={cx("flex items-center gap-0", className)} aria-label={`Stage ${current} of 5: ${STAGES[current - 1]?.title}`}>
      {STAGES.map((s, i) => {
        const active = s.n === current;
        const done = s.n < current;
        return (
          <li key={s.n} className="flex items-center" aria-current={active ? "step" : undefined}>
            {i > 0 && <span className={cx("h-px w-3 sm:w-6", done || active ? (dark ? "bg-paper/50" : "bg-ink/40") : dark ? "bg-paper/15" : "bg-sand-2")} aria-hidden />}
            <span
              className={cx(
                "flex items-center gap-1.5 rounded-full px-1.5 py-1 text-[11px] font-medium",
                active ? "ui-stage-on bg-vermilion text-white" : dark ? (done ? "text-paper/80" : "text-paper/40") : done ? "text-ink-2" : "text-moss/70",
              )}
            >
              <StageIcon n={s.n} className="h-4 w-4" />
              <span className={cx("hidden pr-1 sm:inline", active ? "" : "max-lg:hidden")}>{s.short}</span>
            </span>
          </li>
        );
      })}
    </ol>
  );
}

/**
 * Page masthead. Large title, a mono index line and an optional stage rail —
 * the structure of a print proof rather than a generic heading block.
 */
export function PageHeader({
  eyebrow,
  title,
  description,
  actions,
  stage,
  meta,
}: {
  eyebrow?: ReactNode;
  title: ReactNode;
  description?: ReactNode;
  actions?: ReactNode;
  stage?: number;
  meta?: [string, ReactNode][];
}) {
  return (
    <header className="ui-pagehead mb-10">
      <div className="ui-pagehead-bar mb-6 flex flex-wrap items-center justify-between gap-3 border-b border-sand pb-3">
        <div className="label flex items-center gap-2.5 text-moss">
          <span className="relative h-3 w-3 shrink-0 rounded-full bg-vermilion" aria-hidden>
            <span className="absolute inset-x-[-4px] top-1/2 h-px -translate-y-1/2 bg-ink/30" />
          </span>
          {eyebrow}
        </div>
        {stage && <StageRail current={stage} />}
      </div>
      <div className="flex flex-wrap items-end justify-between gap-6">
        <div className="min-w-0 max-w-3xl">
          <h1 className="text-[34px] font-semibold leading-[1.02] text-ink sm:text-[52px]">{title}</h1>
          {description && <p className="mt-4 max-w-2xl text-[15px] leading-relaxed text-ink-2 sm:text-base">{description}</p>}
        </div>
        {(actions || meta) && (
          <div className="flex flex-col items-start gap-4 sm:items-end">
            {meta && (
              <dl className="grid grid-cols-2 gap-x-6 gap-y-2 sm:flex sm:gap-8">
                {meta.map(([k, v]) => (
                  <div key={k}>
                    <dt className="label text-moss">{k}</dt>
                    <dd className="mt-0.5 font-mono text-sm text-ink">{v}</dd>
                  </div>
                ))}
              </dl>
            )}
            {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
          </div>
        )}
      </div>
    </header>
  );
}

export function Notice({ tone = "info", title, children, className }: { tone?: Tone; title?: ReactNode; children?: ReactNode; className?: string }) {
  return (
    <div className={cx("ui-notice flex gap-3 rounded-lg border border-sand bg-card px-4 py-3 text-sm", className)} role={tone === "fail" ? "alert" : undefined}>
      <span className={cx("mt-1.5 h-2 w-2 shrink-0 rounded-full", DOT[tone])} aria-hidden />
      <div className="min-w-0">
        {title && <div className="font-medium text-ink">{title}</div>}
        {children && <div className={cx("text-ink-2", !!title && "mt-0.5")}>{children}</div>}
      </div>
    </div>
  );
}

export function EmptyState({ title, children, action }: { title: string; children?: ReactNode; action?: ReactNode }) {
  return (
    <div className="ui-empty grid-paper flex flex-col items-center rounded-[var(--radius-card)] border border-sand px-6 py-14 text-center">
      <ToriiMark className="mb-4 h-9 w-9 text-sand-2" />
      <div className="text-lg font-semibold text-ink">{title}</div>
      {children && <p className="mt-1 max-w-md text-sm text-moss">{children}</p>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}

export function Stat({ label, value, hint, tone }: { label: string; value: ReactNode; hint?: ReactNode; tone?: "ok" | "warn" | "fail" }) {
  return (
    <div className="min-w-0">
      <div className="label text-moss">{label}</div>
      <div className={cx("mt-2 text-[28px] font-semibold leading-none tracking-[-0.03em] tabular-nums", tone === "ok" ? "text-ok" : tone === "fail" ? "text-fail" : tone === "warn" ? "text-warn" : "text-ink")}>
        {value}
      </div>
      {hint && <div className="mt-1.5 text-xs text-moss">{hint}</div>}
    </div>
  );
}

/**
 * Gate meter: progress towards the production threshold. The threshold is a
 * gate the bar passes through, not just the end of a bar.
 */
export function ProgressBar({ value, max, label, dark = false, size = "md" }: { value: number; max: number; label?: string; dark?: boolean; size?: "md" | "lg" }) {
  const scale = Math.max(max * 1.15, value, 1);
  const pct = Math.min(100, (value / scale) * 100);
  const gate = Math.min(100, (max / scale) * 100);
  const met = value >= max && max > 0;
  return (
    <div className="relative pt-1" role="progressbar" aria-valuemin={0} aria-valuemax={max} aria-valuenow={value} aria-label={label ?? "Paid units towards the production threshold"}>
      <div className={cx("ui-meter relative overflow-hidden rounded-full", size === "lg" ? "h-2.5" : "h-1.5", dark ? "bg-paper/15" : "bg-ivory")}>
        <div className={cx("ui-meter-fill absolute inset-y-0 left-0 rounded-full transition-[width] duration-700", met ? "bg-ok" : "bg-vermilion")} style={{ width: `${pct}%` }} />
        {/* stripes beyond the gate */}
        <div className="absolute inset-y-0 right-0 bg-[repeating-linear-gradient(135deg,transparent_0_3px,rgb(0_0_0/0.06)_3px_5px)]" style={{ left: `${gate}%` }} />
      </div>
      <div className={cx("absolute top-0 -translate-x-1/2", size === "lg" ? "h-[18px]" : "h-[14px]")} style={{ left: `${gate}%` }} aria-hidden>
        <div className={cx("mx-auto h-full w-[2px]", dark ? "bg-paper" : "bg-ink")} />
      </div>
    </div>
  );
}

export function ToriiMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" className={className} aria-hidden="true" fill="currentColor">
      <path d="M1.5 5.2 Q16 9.6 30.5 5.2 L29.6 8.6 Q16 11.6 2.4 8.6 Z" />
      <rect x="4.6" y="13" width="22.8" height="2.4" rx="0.4" />
      <rect x="7.6" y="9.6" width="2.8" height="19.4" rx="0.4" />
      <rect x="21.6" y="9.6" width="2.8" height="19.4" rx="0.4" />
      <rect x="14.8" y="10.4" width="2.4" height="2.8" />
    </svg>
  );
}

/** Printer's crop marks around a proof. */
export function ProofFrame({ children, className, label, corner }: { children: ReactNode; className?: string; label?: ReactNode; corner?: ReactNode }) {
  const mark = "absolute h-3 w-3 border-ink/50";
  return (
    <div className={cx("relative p-3", className)}>
      <span className={cx(mark, "left-0 top-0 border-l border-t")} aria-hidden />
      <span className={cx(mark, "right-0 top-0 border-r border-t")} aria-hidden />
      <span className={cx(mark, "bottom-0 left-0 border-b border-l")} aria-hidden />
      <span className={cx(mark, "bottom-0 right-0 border-b border-r")} aria-hidden />
      {children}
      {(label || corner) && (
        <div className="mt-2 flex items-center justify-between gap-2 px-0.5">
          <span className="label text-moss">{label}</span>
          {corner}
        </div>
      )}
    </div>
  );
}

/** Hanko-style approval seal. */
export function Seal({ label = "Approved", sub, className, tone = "vermilion" }: { label?: string; sub?: string; className?: string; tone?: "vermilion" | "moss" | "paper" }) {
  const c = tone === "vermilion" ? "text-[var(--torii-red,var(--color-vermilion))]" : tone === "paper" ? "text-paper" : "text-moss";
  return (
    <svg viewBox="0 0 120 120" className={cx("h-20 w-20 -rotate-6", c, className)} role="img" aria-label={`${label}${sub ? ` ${sub}` : ""}`}>
      <circle cx="60" cy="60" r="55" fill="none" stroke="currentColor" strokeWidth="3" />
      <circle cx="60" cy="60" r="47" fill="none" stroke="currentColor" strokeWidth="1.2" />
      <text x="60" y="56" textAnchor="middle" fill="currentColor" style={{ fontFamily: "var(--font-serif)", fontSize: 30 }}>承認</text>
      <text x="60" y="76" textAnchor="middle" fill="currentColor" style={{ fontFamily: "var(--font-mono)", fontSize: 10, letterSpacing: 1.5 }}>{label.toUpperCase()}</text>
      {sub && <text x="60" y="88" textAnchor="middle" fill="currentColor" style={{ fontFamily: "var(--font-mono)", fontSize: 7.2, letterSpacing: 0.4 }}>{sub}</text>}
    </svg>
  );
}

export function Field({ label, hint, error, children, htmlFor, optional }: { label: string; hint?: ReactNode; error?: string; children: ReactNode; htmlFor?: string; optional?: boolean }) {
  return (
    <div className="space-y-1.5">
      <label htmlFor={htmlFor} className="flex items-baseline justify-between gap-2 text-[13px] font-medium text-ink">
        <span>{label}</span>
        {optional && <span className="label text-moss/80">Optional</span>}
      </label>
      {children}
      {error ? <p className="text-xs text-fail">{error}</p> : hint ? <p className="text-xs leading-snug text-moss">{hint}</p> : null}
    </div>
  );
}

export const inputClass =
  "ui-input block w-full rounded-lg border border-sand-2 bg-card px-3 py-2 text-sm text-ink placeholder:text-moss/60 transition-colors hover:border-moss/60 focus:border-ink focus:outline-none focus:ring-4 focus:ring-ink/5 disabled:border-sand disabled:bg-ivory/60 disabled:text-moss";

export function Input(props: ComponentProps<"input">) {
  return <input {...props} className={cx(inputClass, props.className)} />;
}

export function Textarea(props: ComponentProps<"textarea">) {
  return <textarea {...props} className={cx(inputClass, "min-h-20 leading-relaxed", props.className)} />;
}

export function Select(props: ComponentProps<"select">) {
  return <select {...props} className={cx(inputClass, "pr-8", props.className)} />;
}

export function Divider() {
  return <hr className="border-sand" />;
}

export function SimBadge({ className }: { className?: string }) {
  return (
    <span className={cx("inline-flex items-center gap-1.5 rounded-[5px] border border-dashed border-gold px-2 py-[3px] font-mono text-[10.5px] font-medium uppercase tracking-[0.08em] text-[#7a5a18]", className)}>
      <span className="h-1.5 w-1.5 rounded-full bg-gold" aria-hidden /> Test mode
    </span>
  );
}

export function KeyValue({ items }: { items: [ReactNode, ReactNode][] }) {
  return (
    <dl className="divide-y divide-sand text-sm">
      {items.map(([k, v], i) => (
        <div key={i} className="flex items-start justify-between gap-4 py-2.5">
          <dt className="text-moss">{k}</dt>
          <dd className="text-right font-medium tabular-nums text-ink">{v}</dd>
        </div>
      ))}
    </dl>
  );
}
