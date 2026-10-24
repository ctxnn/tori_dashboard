import type { CheckResult } from "@/lib/domain/rules";
import { CHECK_STATUS } from "@/lib/labels";
import { cx } from "./ui";

const ICON_TONE: Record<string, string> = {
  pass: "bg-ok text-white",
  fail: "bg-fail text-white",
  warn: "bg-warn text-white",
  pending: "bg-info-soft text-info ring-1 ring-inset ring-info/30",
  skipped: "bg-ivory text-moss ring-1 ring-inset ring-sand-2",
};

const GROUPS: { key: CheckResult["source"]; title: string }[] = [
  { key: "kit", title: "Owner's kit rules" },
  { key: "platform", title: "Torii template checks" },
  { key: "approval", title: "Human approval" },
];

export function CheckSummary({ checks }: { checks: CheckResult[] }) {
  const fails = checks.filter((c) => c.status === "fail").length;
  const warns = checks.filter((c) => c.status === "warn").length;
  const passes = checks.filter((c) => c.status === "pass").length;
  return (
    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm">
      {fails > 0 ? (
        <span className="font-semibold text-fail">{fails} rule{fails > 1 ? "s" : ""} failing</span>
      ) : (
        <span className="font-semibold text-ok">All declared rules pass</span>
      )}
      <span className="text-moss">{passes} passed{warns ? ` · ${warns} advisory` : ""}</span>
    </div>
  );
}

export function CheckList({ checks, compact = false }: { checks: CheckResult[]; compact?: boolean }) {
  if (!checks.length) return <p className="text-sm text-moss">No checks run yet.</p>;
  return (
    <div className="space-y-4">
      {GROUPS.map((g) => {
        const items = checks.filter((c) => c.source === g.key);
        if (!items.length) return null;
        return (
          <div key={g.key}>
            <div className="mb-1.5 text-[11px] font-semibold uppercase tracking-[0.14em] text-moss">{g.title}</div>
            <ul className="space-y-1.5">
              {items.map((c) => {
                const s = CHECK_STATUS[c.status];
                return (
                  <li
                    key={c.id}
                    className={cx(
                      "flex gap-2.5 rounded-lg px-2.5 py-2",
                      c.status === "fail" ? "bg-fail-soft/70" : c.status === "warn" ? "bg-warn-soft/50" : "",
                    )}
                  >
                    <span className={cx("mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-full text-[11px] font-bold", ICON_TONE[c.status])} aria-hidden>
                      {s.icon}
                    </span>
                    <div className="min-w-0 text-sm">
                      <div className="flex flex-wrap items-baseline gap-x-2">
                        <span className="font-medium text-ink">{c.label}</span>
                        <span className="sr-only">: {s.label}.</span>
                        {c.status !== "pass" && <span className={cx("text-xs font-medium", c.status === "fail" ? "text-fail" : c.status === "warn" ? "text-warn" : "text-moss")}>{s.label}</span>}
                      </div>
                      {(!compact || c.status !== "pass") && <p className="mt-0.5 leading-snug text-ink-2">{c.message}</p>}
                    </div>
                  </li>
                );
              })}
            </ul>
          </div>
        );
      })}
    </div>
  );
}
