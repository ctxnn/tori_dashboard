import type { CheckResult } from "@/lib/domain/rules";
import { CHECK_STATUS } from "@/lib/labels";
import { cx } from "./ui";
import { makeT, type T } from "@/lib/i18n-shared";

const ICON_TONE: Record<string, string> = {
  pass: "bg-ok text-white",
  fail: "bg-fail text-white",
  warn: "bg-warn text-white",
  pending: "bg-info-soft text-info ring-1 ring-inset ring-info/30",
  skipped: "bg-ivory text-moss ring-1 ring-inset ring-sand-2",
};

const GROUPS: { key: CheckResult["source"]; title: string; ja: string }[] = [
  { key: "kit", title: "Owner's kit rules", ja: "権利者さまのキットのルール" },
  { key: "platform", title: "Torii template checks", ja: "Toriiのテンプレート確認" },
  { key: "approval", title: "Human approval", ja: "ご担当者による承認" },
];

export function CheckSummary({ checks, t = makeT("en") }: { checks: CheckResult[]; t?: T }) {
  const fails = checks.filter((c) => c.status === "fail").length;
  const warns = checks.filter((c) => c.status === "warn").length;
  const passes = checks.filter((c) => c.status === "pass").length;
  return (
    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm">
      {fails > 0 ? (
        <span className="font-semibold text-fail">{t(`${fails} rule${fails > 1 ? "s" : ""} failing`, `${fails}件のルールに不適合`)}</span>
      ) : (
        <span className="font-semibold text-ok">{t("All declared rules pass", "すべてのルールに適合")}</span>
      )}
      <span className="text-moss">{t(`${passes} passed${warns ? ` · ${warns} advisory` : ""}`, `適合${passes}件${warns ? ` · 注意${warns}件` : ""}`)}</span>
    </div>
  );
}

export function CheckList({ checks, compact = false, t = makeT("en") }: { checks: CheckResult[]; compact?: boolean; t?: T }) {
  if (!checks.length) return <p className="text-sm text-moss">{t("No checks run yet.", "まだ確認は行われておりません。")}</p>;
  return (
    <div className="space-y-4">
      {GROUPS.map((g) => {
        const items = checks.filter((c) => c.source === g.key);
        if (!items.length) return null;
        return (
          <div key={g.key}>
            <div className="mb-1.5 text-[11px] font-semibold uppercase tracking-[0.14em] text-moss">{t(g.title, g.ja)}</div>
            <ul className="space-y-1.5">
              {items.map((c) => {
                const s = CHECK_STATUS[c.status];
                const label = t.ja && c.ja ? c.ja.label : c.label;
                const message = t.ja && c.ja ? c.ja.message : c.message;
                const status = t(s.label, s.ja);
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
                        <span className="font-medium text-ink">{label}</span>
                        <span className="sr-only">: {status}.</span>
                        {c.status !== "pass" && <span className={cx("text-xs font-medium", c.status === "fail" ? "text-fail" : c.status === "warn" ? "text-warn" : "text-moss")}>{status}</span>}
                      </div>
                      {(!compact || c.status !== "pass") && <p className="mt-0.5 leading-snug text-ink-2">{message}</p>}
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
