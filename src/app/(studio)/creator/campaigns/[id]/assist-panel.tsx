"use client";

import { useMemo, useState } from "react";
import type { ContentInput } from "@/lib/content";
import type { CheckResult } from "@/lib/domain/rules";
import { renderPreviewSvg } from "@/lib/preview";
import { formatINR } from "@/lib/money";
import { layoutName, productName } from "@/lib/catalog";
import { api } from "@/components/client-api";
import { Button, Textarea, cx } from "@/components/ui";

interface Direction {
  name: string;
  rationale: string;
  reviewNote: string;
  content: ContentInput;
  valid: boolean;
  problems: string[];
  checks: CheckResult[];
}

interface Result {
  source: "claude" | "offline";
  model?: string;
  note?: string;
  directions: Direction[];
}

const EXAMPLE = "Prepare two streetwear directions for my college audience using the supplied assets.";

export function AssistPanel({ campaignId, aiEnabled, current, onApply }: { campaignId: string; aiEnabled: boolean; assets: { id: string; name: string }[]; current: ContentInput; onApply: (c: ContentInput) => void }) {
  const [open, setOpen] = useState(false);
  const [brief, setBrief] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<Result | null>(null);
  const [applied, setApplied] = useState<number | null>(null);

  async function run(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    setApplied(null);
    try {
      setResult(await api<Result>(`/api/campaigns/${campaignId}/assist`, { brief: brief || EXAMPLE, current }));
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="overflow-hidden rounded-[var(--radius-card)] border border-ink bg-ink text-paper">
      <button type="button" onClick={() => setOpen((o) => !o)} aria-expanded={open} className="flex w-full items-center justify-between gap-3 px-5 py-4 text-left">
        <span className="flex items-center gap-3">
          <span className="grid h-8 w-8 place-items-center rounded-full bg-vermilion font-serif text-base" aria-hidden>案</span>
          <span>
            <span className="block text-[15px] font-semibold">Brief assistant</span>
            <span className="block text-xs text-paper/60">Describe the idea; get two directions built only from this kit. Optional.</span>
          </span>
        </span>
        <span className="label text-paper/60">{open ? "Close" : aiEnabled ? "Claude" : "Offline"}</span>
      </button>
      {open && (
        <div className="border-t border-paper/10 bg-[#141a17] px-5 pb-5 pt-4">
          <form onSubmit={run} className="space-y-3">
            <label htmlFor="brief" className="sr-only">Your brief</label>
            <Textarea
              id="brief"
              rows={2}
              value={brief}
              onChange={(e) => setBrief(e.target.value)}
              placeholder={EXAMPLE}
              className="border-paper/15 bg-paper/5 text-paper placeholder:text-paper/40 hover:border-paper/30 focus:border-paper focus:ring-paper/10"
            />
            <div className="flex flex-wrap items-center justify-between gap-3">
              <p className="text-xs text-paper/50">
                {aiEnabled ? "Uses Claude Opus 5.5." : "No AI key set — uses Torii’s built-in templates."} Suggestions are checked against the kit; nothing is saved until you save, and the owner still approves.
              </p>
              <Button type="submit" variant="accent" size="sm" disabled={busy}>{busy ? "Thinking…" : "Suggest directions"}</Button>
            </div>
          </form>
          {error && <p className="mt-3 text-sm text-[#ffb4a6]" role="alert">{error}</p>}
          {result && (
            <div className="mt-5">
              {result.note && <p className="mb-3 text-xs text-paper/60">{result.note}</p>}
              <ul className="grid gap-4 sm:grid-cols-2">
                {result.directions.map((d, i) => (
                  <DirectionCard key={i} d={d} applied={applied === i} onApply={() => { onApply(d.content); setApplied(i); }} />
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </section>
  );
}

function DirectionCard({ d, applied, onApply }: { d: Direction; applied: boolean; onApply: () => void }) {
  const svg = useMemo(
    () =>
      renderPreviewSvg({ productId: d.content.productId, layoutId: d.content.layoutId, design: d.content.design, artworkHref: `/api/assets/${d.content.design.artworkAssetId}`, uid: `assist-${d.name.replace(/\W/g, "")}` }),
    [d],
  );
  const passes = d.checks.filter((c) => c.status === "pass").length;
  return (
    <li className="flex flex-col overflow-hidden rounded-lg bg-paper text-ink">
      <div className="preview" dangerouslySetInnerHTML={{ __html: svg }} />
      <div className="flex flex-1 flex-col gap-2 p-4">
        <div className="flex items-baseline justify-between gap-2">
          <h3 className="font-semibold tracking-[-0.02em]">{d.name}</h3>
          <span className="font-mono text-xs text-moss">{formatINR(d.content.offer.priceMinor)}</span>
        </div>
        <p className="font-mono text-[11px] text-moss">{productName(d.content.productId)} · {layoutName(d.content.productId, d.content.layoutId)}</p>
        <p className="text-[13px] leading-snug text-ink-2">{d.rationale}</p>
        <p className="rounded-md bg-ivory px-2.5 py-2 text-[12px] leading-snug text-ink-2"><span className="label mr-1 text-moss">For the reviewer</span>{d.reviewNote}</p>
        <p className={cx("text-xs", d.valid ? "text-ok" : "text-fail")}>
          {d.valid ? `Passes every declared rule (${passes} checks)` : `Won’t pass: ${d.problems[0]}`}
        </p>
        <Button size="sm" variant={applied ? "secondary" : "primary"} className="mt-auto" onClick={onApply} disabled={!d.valid}>
          {applied ? "Applied — review and save" : "Use this direction"}
        </Button>
      </div>
    </li>
  );
}
