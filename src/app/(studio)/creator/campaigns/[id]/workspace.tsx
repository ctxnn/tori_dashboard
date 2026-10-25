"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { CHANNELS, FONTS, PRODUCTS, TEXT_COLOURS, TERRITORIES, contrastRatio, swatch } from "@/lib/catalog";
import type { Content, ContentInput } from "@/lib/content";
import type { KitRules } from "@/lib/kit-rules";
import type { CheckResult } from "@/lib/domain/rules";
import { REVIEW_STATUS, SALES_STATUS, formatDateTime } from "@/lib/labels";
import { allocate, bpsToPercent, formatINR } from "@/lib/money";
import { renderPreviewSvg } from "@/lib/preview";
import { api, ApiError } from "@/components/client-api";
import { CheckList, CheckSummary } from "@/components/check-list";
import { Badge, Button, Card, Field, Input, LinkButton, Notice, ProgressBar, ProofFrame, Select, StageRail, Textarea, cx } from "@/components/ui";
import { AssistPanel } from "./assist-panel";

export interface WorkspaceKit {
  id: string;
  name: string;
  owner: string;
  creditLine: string;
  versionNo: number;
  rules: KitRules;
  assets: { id: string; code: string; name: string; description: string }[];
  approverName: string;
}

interface Props {
  campaign: { id: string; slug: string; salesStatus: string };
  latest: { id: string; versionNo: number; reviewStatus: string; content: Content; checks: CheckResult[]; kitVersionNo: number; submittedAt: string | null };
  published: { id: string; versionNo: number } | null;
  approvedUnpublished: { id: string; versionNo: number } | null;
  kit: WorkspaceKit;
  platformTerms: { creatorBps: number; platformBps: number };
  lastReview: { decision: string; comment: string; reviewerName: string; versionNo: number } | null;
  progress: { paidUnits: number; threshold: number } | null;
  aiEnabled: boolean;
}

type Tab = "design" | "story" | "distribution" | "offer";

const TABS: { id: Tab; label: string; hint: string }[] = [
  { id: "design", label: "Design", hint: "Product, layout and print" },
  { id: "story", label: "Story & audience", hint: "Why this works locally" },
  { id: "distribution", label: "Distribution", hint: "How fans will hear" },
  { id: "offer", label: "Offer & pricing", hint: "Price, threshold, dates" },
];

function toInput(c: Content): ContentInput {
  return { productId: c.productId, layoutId: c.layoutId, design: c.design, copy: c.copy, distribution: c.distribution, offer: c.offer };
}

const assetUrl = (id: string) => `/api/assets/${id}`;

export function Workspace(props: Props) {
  const { kit, latest } = props;
  const router = useRouter();
  const frozen = latest.reviewStatus !== "draft";
  const closed = ["cancelled", "cancelling", "completed"].includes(props.campaign.salesStatus);
  const [editing, setEditing] = useState(!frozen && !closed);
  const [content, setContent] = useState<ContentInput>(() => toInput(latest.content));
  const [dirty, setDirty] = useState(false);
  const [tab, setTab] = useState<Tab>("design");
  const [checks, setChecks] = useState<CheckResult[]>(latest.checks);
  const [checking, setChecking] = useState(false);
  const [issues, setIssues] = useState<{ path: string; message: string }[]>([]);
  const [busy, setBusy] = useState<null | "save" | "submit" | "publish">(null);
  const [error, setError] = useState<string | null>(null);
  const [refusal, setRefusal] = useState<{ message: string; checks: CheckResult[] } | null>(null);
  const [flash, setFlash] = useState<string | null>(null);

  // Reset local state when the server sends a new latest version.
  useEffect(() => {
    setContent(toInput(latest.content));
    setChecks(latest.checks);
    setDirty(false);
    setEditing(latest.reviewStatus === "draft" && !closed);
  }, [latest.id, latest.reviewStatus, latest.content, latest.checks, closed]);

  const update = useCallback((fn: (c: ContentInput) => ContentInput) => {
    setContent((c) => fn(structuredClone(c)));
    setDirty(true);
    setRefusal(null);
    setFlash(null);
  }, []);

  // Dry-run the backend rule checks as the creator edits.
  const seq = useRef(0);
  useEffect(() => {
    if (!dirty) return;
    const n = ++seq.current;
    setChecking(true);
    const t = setTimeout(async () => {
      try {
        const r = await api<{ checks: CheckResult[]; issues: { path: string; message: string }[] }>(`/api/campaigns/${props.campaign.id}/check`, { content });
        if (n !== seq.current) return;
        setIssues(r.issues);
        if (r.checks.length) setChecks(r.checks);
      } catch {
        /* checks are advisory while editing; submission re-checks on the server */
      } finally {
        if (n === seq.current) setChecking(false);
      }
    }, 350);
    return () => clearTimeout(t);
  }, [content, dirty, props.campaign.id]);

  useEffect(() => {
    if (!dirty) return;
    const warn = (e: BeforeUnloadEvent) => e.preventDefault();
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty]);

  const previewSvg = useMemo(
    () =>
      renderPreviewSvg({
        productId: content.productId,
        layoutId: content.layoutId,
        design: content.design,
        artworkHref: kit.assets.some((a) => a.id === content.design.artworkAssetId) ? assetUrl(content.design.artworkAssetId) : null,
        creditLine: kit.creditLine,
        uid: "editor",
      }),
    [content, kit],
  );

  async function save(): Promise<string | null> {
    setBusy("save");
    setError(null);
    try {
      const r = await api<{ version: { id: string; versionNo: number; checks: CheckResult[] } }>(`/api/campaigns/${props.campaign.id}/draft`, { content }, "PUT");
      setDirty(false);
      setChecks(r.version.checks);
      setFlash(`Saved as version ${r.version.versionNo} (draft).`);
      router.refresh();
      return r.version.id;
    } catch (e) {
      const err = e as ApiError;
      setError(err.message);
      if (Array.isArray((err.details as { message: string }[])) && (err.details as unknown[]).length) {
        setIssues((err.details as { path: (string | number)[]; message: string }[]).map((i) => ({ path: i.path.join("."), message: i.message })));
      }
      return null;
    } finally {
      setBusy(null);
    }
  }

  async function submit() {
    setError(null);
    setRefusal(null);
    let versionId: string | null = latest.id;
    if (dirty || frozen) {
      versionId = await save();
      if (!versionId) return;
    }
    setBusy("submit");
    try {
      await api(`/api/versions/${versionId}/submit`, {});
      setFlash(`Submitted for approval by ${kit.approverName}.`);
      router.refresh();
    } catch (e) {
      const err = e as ApiError;
      if (err.status === 422) {
        const c = (err.details as { checks: CheckResult[] }).checks;
        setRefusal({ message: err.message, checks: c.filter((x) => x.status === "fail") });
        setChecks(c);
      } else setError(err.message);
    } finally {
      setBusy(null);
    }
  }

  async function publish(versionId: string) {
    setBusy("publish");
    setError(null);
    try {
      await api(`/api/versions/${versionId}/publish`, {});
      setFlash("Published. Fans can now preorder this exact version.");
      router.refresh();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(null);
    }
  }

  const review = REVIEW_STATUS[latest.reviewStatus];
  const sales = SALES_STATUS[props.campaign.salesStatus];
  const productRule = kit.rules.products.find((p) => p.productId === content.productId);
  const readOnly = !editing;
  const failing = checks.filter((c) => c.status === "fail").length;
  const reviewForLatest = props.lastReview && props.lastReview.versionNo === latest.versionNo ? props.lastReview : null;

  return (
    <div>
      {/* Header */}
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3 border-b border-sand pb-3">
        <Link href="/creator" className="label flex items-center gap-2 text-moss hover:text-ink">
          <span className="h-2 w-2 bg-vermilion" aria-hidden /> Studio / {kit.name} kit v{kit.versionNo}
        </Link>
        <StageRail current={latest.reviewStatus === "submitted" ? 3 : props.published ? 4 : 2} />
      </div>
      <div className="mb-8 flex flex-wrap items-end justify-between gap-6">
        <div className="min-w-0">
          <h1 className="text-[34px] font-semibold leading-[1.02] sm:text-[48px]">{content.copy.title || "Untitled campaign"}</h1>
          <div className="mt-3 flex flex-wrap items-center gap-2 text-sm">
            <Badge tone={review.tone}>v{latest.versionNo} · {review.label}</Badge>
            {props.campaign.salesStatus !== "not_published" && <Badge tone={sales.tone}>{sales.label}</Badge>}
            {editing && frozen && <Badge tone="info">Editing → becomes v{latest.versionNo + 1}</Badge>}
            {dirty && <Badge tone="warn">Unsaved changes</Badge>}
            <span className="font-mono text-[12px] text-moss">approver · {kit.approverName}</span>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          {props.published && (
            <LinkButton href={`/c/${props.campaign.slug}`} variant="secondary">
              View live page
            </LinkButton>
          )}
          {props.approvedUnpublished && !closed && (
            <Button variant="accent" onClick={() => publish(props.approvedUnpublished!.id)} disabled={!!busy}>
              {busy === "publish" ? "Publishing…" : props.published ? `Replace live page with v${props.approvedUnpublished.versionNo}` : `Publish v${props.approvedUnpublished.versionNo}`}
            </Button>
          )}
          {readOnly && !closed && (
            <Button variant="secondary" onClick={() => setEditing(true)}>
              Edit as version {latest.versionNo + 1}
            </Button>
          )}
          {editing && (
            <>
              <Button variant="secondary" onClick={save} disabled={!!busy || !dirty}>
                {busy === "save" ? "Saving…" : "Save draft"}
              </Button>
              <Button onClick={submit} disabled={!!busy}>
                {busy === "submit" ? "Submitting…" : "Submit for approval"}
              </Button>
            </>
          )}
        </div>
      </div>

      {/* Status notices */}
      <div className="mb-6 space-y-3" aria-live="polite">
        {flash && <Notice tone="ok">{flash}</Notice>}
        {error && <Notice tone="fail" title="That didn’t work">{error}</Notice>}
        {refusal && (
          <Notice tone="fail" title="The server refused this submission">
            <p>{refusal.message}</p>
            {refusal.checks.length > 1 && (
              <ul className="mt-2 list-disc space-y-1 pl-5">
                {refusal.checks.map((c) => <li key={c.id}>{c.message}</li>)}
              </ul>
            )}
            <p className="mt-2">Your draft is saved. Fix the items above and submit again.</p>
          </Notice>
        )}
        {reviewForLatest && reviewForLatest.decision !== "approved" && (
          <Notice tone={reviewForLatest.decision === "rejected" ? "fail" : "warn"} title={`${reviewForLatest.reviewerName} ${reviewForLatest.decision === "rejected" ? "rejected" : "requested changes to"} v${reviewForLatest.versionNo}`}>
            “{reviewForLatest.comment}” {readOnly && "Edit to start a new version with your changes."}
          </Notice>
        )}
        {latest.reviewStatus === "submitted" && !editing && (
          <Notice tone="info" title={`Version ${latest.versionNo} is with ${kit.approverName}`}>
            Submitted {formatDateTime(latest.submittedAt)}. It’s locked so the reviewer sees exactly what you sent. Editing now starts version {latest.versionNo + 1}, which replaces this one in the review queue.
          </Notice>
        )}
        {props.published && props.published.id !== latest.id && (
          <Notice tone="info" title={`Fans are buying version ${props.published.versionNo}`}>
            Changes in v{latest.versionNo} won’t reach the campaign page until they’re approved and published. Orders always keep the version they were bought against.
          </Notice>
        )}
        {editing && latest.kitVersionNo < kit.versionNo && (
          <Notice tone="info">This draft was made under kit v{latest.kitVersionNo}. Saving applies the owner’s latest rules (kit v{kit.versionNo}).</Notice>
        )}
        {closed && <Notice tone="neutral">This campaign is closed and can no longer be edited.</Notice>}
      </div>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_400px] xl:grid-cols-[minmax(0,1fr)_440px]">
        {/* Editor */}
        <div className="min-w-0 space-y-6">
          {editing && <AssistPanel campaignId={props.campaign.id} aiEnabled={props.aiEnabled} assets={kit.assets} onApply={(c) => update(() => c)} current={content} />}
          <Card>
            <div role="tablist" aria-label="Campaign sections" className="flex gap-2 overflow-x-auto border-b border-sand px-4 pt-4 [scrollbar-width:none]">
              {TABS.map((t) => (
                <button
                  key={t.id}
                  role="tab"
                  id={`tab-${t.id}`}
                  aria-selected={tab === t.id}
                  aria-controls={`panel-${t.id}`}
                  onClick={() => setTab(t.id)}
                  className={cx(
                    "-mb-px shrink-0 border-b-2 px-3 pb-3 pt-1.5 text-left text-sm transition-colors",
                    tab === t.id ? "border-ink text-ink" : "border-transparent text-moss hover:text-ink",
                  )}
                >
                  <span className="label block text-[10px] text-vermilion">0{TABS.indexOf(t) + 1}</span>
                  <span className="block font-medium">{t.label}</span>
                  <span className="hidden text-xs text-moss sm:block">{t.hint}</span>
                </button>
              ))}
            </div>
            <fieldset disabled={readOnly} className="p-5 sm:p-6" role="tabpanel" id={`panel-${tab}`} aria-labelledby={`tab-${tab}`}>
              {tab === "design" && <DesignTab content={content} update={update} kit={kit} />}
              {tab === "story" && <StoryTab content={content} update={update} />}
              {tab === "distribution" && <DistributionTab content={content} update={update} />}
              {tab === "offer" && <OfferTab content={content} update={update} kit={kit} productRule={productRule} platformTerms={props.platformTerms} />}
              {issues.length > 0 && (
                <Notice tone="warn" className="mt-6" title="Some fields need attention before saving">
                  <ul className="list-disc pl-5">{issues.map((i) => <li key={i.path}>{i.message}</li>)}</ul>
                </Notice>
              )}
            </fieldset>
          </Card>
        </div>

        {/* Preview + checks */}
        <aside className="order-first space-y-4 lg:order-none lg:sticky lg:top-20 lg:self-start">
          <ProofFrame
            label={<>Live proof · {checking ? "checking…" : failing ? `${failing} rule${failing === 1 ? "" : "s"} failing` : "all rules pass"}</>}
            corner={<span className={cx("h-2 w-2 rounded-full", checking ? "animate-pulse bg-gold" : failing ? "bg-fail" : "bg-ok")} aria-hidden />}
          >
            <div className="preview overflow-hidden rounded-md bg-[#ECEBE5]" dangerouslySetInnerHTML={{ __html: previewSvg }} aria-label="Live product preview" />
            <p className="mt-2 px-0.5 text-[12px] leading-snug text-moss">
              Generated from your design data. Kit artwork is placed exactly as supplied; you control template, text and colour.
            </p>
          </ProofFrame>
          {props.progress && (
            <Card className="p-4">
              <div className="mb-2 flex items-center justify-between text-sm">
                <span className="font-medium">Preorders (v{props.published?.versionNo})</span>
                <span className="text-moss">{props.progress.paidUnits} / {props.progress.threshold} units</span>
              </div>
              <ProgressBar value={props.progress.paidUnits} max={props.progress.threshold} />
            </Card>
          )}
          <Card className="p-4">
            <div className="mb-3 flex items-center justify-between gap-2">
              <h2 className="text-base font-semibold">Rule checks</h2>
              <span className="text-xs text-moss" aria-live="polite">{checking ? "Checking…" : "Checked on the server"}</span>
            </div>
            <CheckSummary checks={checks} />
            <div className="mt-3">
              <CheckList checks={checks} compact />
            </div>
            {failing > 0 && editing && <p className="mt-3 text-xs text-moss">You can save a draft with failing checks, but the server won’t accept it for review.</p>}
          </Card>
        </aside>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Tabs
// ---------------------------------------------------------------------------

type Update = (fn: (c: ContentInput) => ContentInput) => void;

function Swatches({ label, options, value, onChange }: { label: string; options: { id: string; name: string; hex: string }[]; value: string; onChange: (id: string) => void }) {
  return (
    <div role="radiogroup" aria-label={label} className="flex flex-wrap gap-2">
      {options.map((o) => (
        <button
          key={o.id}
          type="button"
          role="radio"
          aria-checked={value === o.id}
          onClick={() => onChange(o.id)}
          className={cx(
            "flex items-center gap-2 rounded-full border bg-card py-1 pl-1 pr-3 text-sm transition",
            value === o.id ? "border-ink ring-1 ring-ink" : "border-sand hover:border-sand-2",
          )}
        >
          <span className="h-6 w-6 rounded-full border border-black/10" style={{ background: o.hex }} />
          {o.name}
        </button>
      ))}
    </div>
  );
}

function OptionCard({ selected, onClick, title, body, badge, disabled }: { selected: boolean; onClick: () => void; title: string; body: string; badge?: React.ReactNode; disabled?: boolean }) {
  return (
    <button
      type="button"
      aria-pressed={selected}
      onClick={onClick}
      disabled={disabled}
      className={cx(
        "flex h-full w-full flex-col items-start rounded-xl border bg-card p-3 text-left transition",
        selected ? "border-ink ring-1 ring-ink" : "border-sand hover:border-sand-2",
      )}
    >
      <span className="flex w-full items-start justify-between gap-2">
        <span className="font-medium text-ink">{title}</span>
        {badge}
      </span>
      <span className="mt-1 text-xs leading-snug text-moss">{body}</span>
    </button>
  );
}

function DesignTab({ content, update, kit }: { content: ContentInput; update: Update; kit: WorkspaceKit }) {
  const product = PRODUCTS[content.productId];
  const productRule = kit.rules.products.find((p) => p.productId === content.productId);
  const layout = product?.layouts.find((l) => l.id === content.layoutId);
  const base = product ? swatch(product.baseColours, content.design.baseColour) : undefined;
  const ink = swatch(TEXT_COLOURS, content.design.text.colour);
  const lowContrast = base && ink && contrastRatio(base.hex, ink.hex) < 2.2;

  function chooseProduct(id: string) {
    update((c) => {
      const p = PRODUCTS[id];
      const rule = kit.rules.products.find((r) => r.productId === id);
      c.productId = id;
      c.layoutId = rule?.layouts[0] ?? p.layouts[0].id;
      c.design.baseColour = p.baseColours[0].id;
      c.offer.sizes = p.sizes.slice(0, Math.min(4, p.sizes.length));
      return c;
    });
  }

  return (
    <div className="space-y-7">
      <section>
        <h3 className="text-sm font-semibold text-ink">Product</h3>
        <p className="mb-3 text-xs text-moss">Torii’s templates. The kit permits: {kit.rules.products.map((p) => PRODUCTS[p.productId]?.name).join(", ")}.</p>
        <div className="grid gap-2 sm:grid-cols-3">
          {Object.values(PRODUCTS).map((p) => {
            const permitted = kit.rules.products.some((r) => r.productId === p.id);
            return (
              <OptionCard
                key={p.id}
                selected={content.productId === p.id}
                onClick={() => chooseProduct(p.id)}
                title={p.name}
                body={p.description}
                badge={permitted ? <Badge tone="ok">In kit</Badge> : <Badge tone="fail">Not licensed</Badge>}
              />
            );
          })}
        </div>
      </section>

      {product && (
        <section>
          <h3 className="mb-3 text-sm font-semibold text-ink">Layout</h3>
          <div className="grid gap-2 sm:grid-cols-2">
            {product.layouts.map((l) => {
              const permitted = productRule?.layouts.includes(l.id);
              return (
                <OptionCard
                  key={l.id}
                  selected={content.layoutId === l.id}
                  onClick={() => update((c) => ({ ...c, layoutId: l.id }))}
                  title={l.name}
                  body={l.description}
                  badge={permitted ? undefined : <Badge tone="fail">Not approved</Badge>}
                />
              );
            })}
          </div>
        </section>
      )}

      <section>
        <h3 className="text-sm font-semibold text-ink">Approved artwork</h3>
        <p className="mb-3 text-xs text-moss">Supplied by {kit.owner}. Protected: placed as-is, never edited.</p>
        <div role="radiogroup" aria-label="Artwork" className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          {kit.assets.map((a) => (
            <button
              key={a.id}
              type="button"
              role="radio"
              aria-checked={content.design.artworkAssetId === a.id}
              onClick={() => update((c) => ((c.design.artworkAssetId = a.id), c))}
              className={cx(
                "overflow-hidden rounded-xl border bg-card text-left transition",
                content.design.artworkAssetId === a.id ? "border-ink ring-1 ring-ink" : "border-sand hover:border-sand-2",
              )}
            >
              <span className="block aspect-square bg-[repeating-conic-gradient(#efe8da_0_25%,#f8f4ec_0_50%)] bg-[length:16px_16px] p-3">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={assetUrl(a.id)} alt="" className="h-full w-full object-contain" />
              </span>
              <span className="block px-2.5 py-2">
                <span className="block text-xs font-medium text-ink">{a.name}</span>
                <span className="block font-mono text-[10px] text-moss">{a.code}</span>
              </span>
            </button>
          ))}
        </div>
        <div className="mt-4 max-w-sm">
          <Field label={`Artwork size: ${Math.round(content.design.artworkScale * 100)}%`} htmlFor="scale" hint={`The kit allows ${Math.round(kit.rules.artworkScale.min * 100)}–${Math.round(kit.rules.artworkScale.max * 100)}%.`}>
            <input
              id="scale"
              type="range"
              min={kit.rules.artworkScale.min}
              max={kit.rules.artworkScale.max}
              step={0.05}
              value={content.design.artworkScale}
              onChange={(e) => update((c) => ((c.design.artworkScale = Number(e.target.value)), c))}
              className="w-full"
            />
          </Field>
        </div>
      </section>

      {product && (
        <section>
          <h3 className="mb-3 text-sm font-semibold text-ink">{product.name} colour</h3>
          <Swatches label="Base colour" options={product.baseColours} value={content.design.baseColour} onChange={(id) => update((c) => ((c.design.baseColour = id), c))} />
        </section>
      )}

      <section className="space-y-4">
        <div>
          <h3 className="text-sm font-semibold text-ink">Your print text</h3>
          <p className="text-xs text-moss">This is your layer — language, joke, reference. It sits beside the artwork, never on it.</p>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Line 1" htmlFor="line1" hint={`${content.design.text.line1.length}/28`}>
            <Input id="line1" maxLength={28} value={content.design.text.line1} onChange={(e) => update((c) => ((c.design.text.line1 = e.target.value), c))} placeholder="e.g. Chitthi pahunchegi" />
          </Field>
          <Field label="Line 2" htmlFor="line2" hint={layout?.textLines === 1 ? "Not printed on this layout" : `${content.design.text.line2.length}/40`}>
            <Input id="line2" maxLength={40} value={content.design.text.line2} onChange={(e) => update((c) => ((c.design.text.line2 = e.target.value), c))} placeholder="e.g. THE LETTER WILL ARRIVE" />
          </Field>
        </div>
        <div className="flex flex-wrap gap-6">
          <div>
            <div className="mb-2 text-xs font-medium text-moss">Typeface</div>
            <Swatches
              label="Typeface"
              options={(Object.keys(FONTS) as (keyof typeof FONTS)[]).map((k) => ({ id: k, name: FONTS[k].name, hex: k === "display" ? "#1F2A26" : "#66766D" }))}
              value={content.design.text.font}
              onChange={(id) => update((c) => ((c.design.text.font = id as "display" | "sans"), c))}
            />
          </div>
          {content.layoutId === "centre" && (
            <div>
              <div className="mb-2 text-xs font-medium text-moss">Text position</div>
              <Swatches
                label="Text position"
                options={[{ id: "above", name: "Above art", hex: "#E6DCCB" }, { id: "below", name: "Below art", hex: "#E6DCCB" }]}
                value={content.design.text.position}
                onChange={(id) => update((c) => ((c.design.text.position = id as "above" | "below"), c))}
              />
            </div>
          )}
        </div>
        <div>
          <div className="mb-2 text-xs font-medium text-moss">Text colour</div>
          <Swatches label="Text colour" options={TEXT_COLOURS} value={content.design.text.colour} onChange={(id) => update((c) => ((c.design.text.colour = id), c))} />
          {lowContrast && <p className="mt-2 text-xs text-warn">Low contrast on this base colour — it may be hard to read.</p>}
        </div>
      </section>
    </div>
  );
}

function StoryTab({ content, update }: { content: ContentInput; update: Update }) {
  const set = (k: keyof ContentInput["copy"]) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    update((c) => ((c.copy[k] = e.target.value), c));
  return (
    <div className="space-y-5">
      <Field label="Campaign title" htmlFor="title">
        <Input id="title" value={content.copy.title} onChange={set("title")} maxLength={80} />
      </Field>
      <Field label="Tagline" htmlFor="tagline" hint="One line fans see under the title.">
        <Input id="tagline" value={content.copy.tagline} onChange={set("tagline")} maxLength={120} />
      </Field>
      <Field label="Campaign story" htmlFor="story" hint="Why this product, why now. Shown on the fan page.">
        <Textarea id="story" value={content.copy.story} onChange={set("story")} maxLength={900} rows={5} />
      </Field>
      <div className="grid gap-5 md:grid-cols-2">
        <Field label="Who it’s for" htmlFor="audience" hint="Be specific: where they are, what they already buy, what they’ll pay.">
          <Textarea id="audience" value={content.copy.audience} onChange={set("audience")} maxLength={400} rows={4} />
        </Field>
        <Field label="Local angle" htmlFor="local" hint="What you know about this audience that the owner can’t see from Tokyo.">
          <Textarea id="local" value={content.copy.localAngle} onChange={set("localAngle")} maxLength={400} rows={4} />
        </Field>
      </div>
    </div>
  );
}

function DistributionTab({ content, update }: { content: ContentInput; update: Update }) {
  const channels = content.distribution.channels;
  const total = channels.reduce((s, c) => s + c.plannedReach, 0);
  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-sm font-semibold text-ink">Channels you’ll use</h3>
        <p className="mb-3 text-xs text-moss">Planned reach is your own estimate; reviewers use it to judge the threshold.</p>
        <ul className="divide-y divide-sand rounded-xl border border-sand">
          {CHANNELS.map((ch) => {
            const sel = channels.find((c) => c.id === ch.id);
            return (
              <li key={ch.id} className="flex flex-wrap items-center gap-3 px-3 py-2.5">
                <label className="flex min-w-40 flex-1 items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    className="h-4 w-4 accent-[var(--color-ink)]"
                    checked={!!sel}
                    onChange={(e) =>
                      update((c) => {
                        c.distribution.channels = e.target.checked
                          ? [...c.distribution.channels, { id: ch.id, plannedReach: 1000 }]
                          : c.distribution.channels.filter((x) => x.id !== ch.id);
                        return c;
                      })
                    }
                  />
                  {ch.label}
                </label>
                {sel && (
                  <label className="flex items-center gap-2 text-xs text-moss">
                    Planned reach
                    <Input
                      type="number"
                      min={0}
                      step={100}
                      className="w-28"
                      value={sel.plannedReach}
                      onChange={(e) => update((c) => ((c.distribution.channels.find((x) => x.id === ch.id)!.plannedReach = Math.max(0, Math.round(Number(e.target.value) || 0))), c))}
                    />
                  </label>
                )}
              </li>
            );
          })}
        </ul>
        <p className="mt-2 text-xs text-moss">Total planned reach: {total.toLocaleString("en-IN")} people</p>
      </div>
      <Field label="Launch moment" htmlFor="moment" hint="The event, season or community moment you’re timing this to.">
        <Input id="moment" value={content.distribution.launchMoment} onChange={(e) => update((c) => ((c.distribution.launchMoment = e.target.value), c))} maxLength={200} />
      </Field>
      <Field label="What you commit to do" htmlFor="commit" hint="Posts, stalls, events. Owners weigh this when approving.">
        <Textarea id="commit" value={content.distribution.creatorCommitment} onChange={(e) => update((c) => ((c.distribution.creatorCommitment = e.target.value), c))} maxLength={400} rows={3} />
      </Field>
    </div>
  );
}

function OfferTab({ content, update, kit, productRule, platformTerms }: { content: ContentInput; update: Update; kit: WorkspaceKit; productRule?: KitRules["products"][number]; platformTerms: { creatorBps: number; platformBps: number } }) {
  const o = content.offer;
  const product = PRODUCTS[content.productId];
  const terms = { royaltyBps: kit.rules.royaltyBps, ...platformTerms };
  const atThreshold = allocate(o.priceMinor * o.thresholdUnits, terms);
  const rupees = (minor: number) => (minor / 100).toString();
  const toMinor = (v: string) => Math.max(0, Math.round((Number(v) || 0) * 100));

  return (
    <div className="space-y-6">
      <div className="grid gap-5 sm:grid-cols-2">
        <Field
          label="Item price (₹)"
          htmlFor="price"
          hint={productRule ? `Owner’s band: ${formatINR(productRule.minPriceMinor)}–${formatINR(productRule.maxPriceMinor)}` : "This product isn’t in the kit, so there’s no permitted price band."}
        >
          <Input id="price" type="number" min={1} step={1} inputMode="numeric" value={rupees(o.priceMinor)} onChange={(e) => update((c) => ((c.offer.priceMinor = toMinor(e.target.value)), c))} />
        </Field>
        <Field label="Shipping per order (₹)" htmlFor="ship">
          <Input id="ship" type="number" min={0} step={1} value={rupees(o.shippingMinor)} onChange={(e) => update((c) => ((c.offer.shippingMinor = toMinor(e.target.value)), c))} />
        </Field>
        <Field label="Production threshold (paid units)" htmlFor="threshold" hint="Below this by the deadline, every fan is refunded.">
          <Input id="threshold" type="number" min={1} step={1} value={o.thresholdUnits} onChange={(e) => update((c) => ((c.offer.thresholdUnits = Math.max(1, Math.round(Number(e.target.value) || 1))), c))} />
        </Field>
        <Field label="Your demand estimate (units)" htmlFor="expected">
          <Input id="expected" type="number" min={0} step={1} value={o.expectedUnits} onChange={(e) => update((c) => ((c.offer.expectedUnits = Math.max(0, Math.round(Number(e.target.value) || 0))), c))} />
        </Field>
        <Field label="Preorders open" htmlFor="launch">
          <Input id="launch" type="date" value={o.launchDate} onChange={(e) => update((c) => ((c.offer.launchDate = e.target.value), c))} />
        </Field>
        <Field label="Preorder deadline" htmlFor="deadline" hint={`Licence window: ${kit.rules.window.start} → ${kit.rules.window.end}`}>
          <Input id="deadline" type="date" value={o.deadline} onChange={(e) => update((c) => ((c.offer.deadline = e.target.value), c))} />
        </Field>
        <Field label="Territory" htmlFor="territory">
          <Select id="territory" value={o.territory} onChange={(e) => update((c) => ((c.offer.territory = e.target.value), c))}>
            {Object.entries(TERRITORIES).map(([code, name]) => (
              <option key={code} value={code}>
                {name}
                {kit.rules.territories.includes(code) ? "" : " (not licensed)"}
              </option>
            ))}
          </Select>
        </Field>
        {product && product.sizes.length > 1 && (
          <fieldset>
            <legend className="mb-1.5 text-sm font-medium text-ink">Sizes offered</legend>
            <div className="flex flex-wrap gap-2">
              {product.sizes.map((s) => (
                <label key={s} className={cx("cursor-pointer rounded-lg border px-3 py-1.5 text-sm", o.sizes.includes(s) ? "border-ink bg-ink text-paper" : "border-sand")}>
                  <input
                    type="checkbox"
                    className="sr-only"
                    checked={o.sizes.includes(s)}
                    onChange={(e) =>
                      update((c) => {
                        c.offer.sizes = e.target.checked ? product.sizes.filter((x) => x === s || c.offer.sizes.includes(x)) : c.offer.sizes.filter((x) => x !== s);
                        return c;
                      })
                    }
                  />
                  {s}
                </label>
              ))}
            </div>
          </fieldset>
        )}
      </div>

      <div className="rounded-xl border border-sand bg-ivory/60 p-4">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h3 className="text-sm font-semibold text-ink">If you hit the threshold</h3>
          <span className="text-xs text-moss">Illustrative — earnings are recorded only on delivery</span>
        </div>
        <p className="mt-1 text-sm text-ink-2">
          A fan pays <strong>{formatINR(o.priceMinor + o.shippingMinor)}</strong> for one ({formatINR(o.priceMinor)} + {formatINR(o.shippingMinor)} shipping). At {o.thresholdUnits} delivered units:
        </p>
        <dl className="mt-3 grid grid-cols-2 gap-3 text-sm sm:grid-cols-5">
          {[
            ["Net item sales", atThreshold.netItemSales, ""],
            ["You earn", atThreshold.creatorEarnings, bpsToPercent(terms.creatorBps)],
            ["Licensor royalty", atThreshold.licensorRoyalty, bpsToPercent(terms.royaltyBps)],
            ["Torii commission", atThreshold.toriiCommission, bpsToPercent(terms.platformBps)],
            ["Seller share", atThreshold.sellerShare, "covers production"],
          ].map(([label, v, sub]) => (
            <div key={label as string} className="rounded-lg bg-card px-3 py-2">
              <dt className="text-xs text-moss">{label}</dt>
              <dd className="font-display text-base font-semibold tabular-nums">{formatINR(v as number)}</dd>
              {sub && <dd className="text-[11px] text-moss">{sub}</dd>}
            </div>
          ))}
        </dl>
      </div>
    </div>
  );
}
