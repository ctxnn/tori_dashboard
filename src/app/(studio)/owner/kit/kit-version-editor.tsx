"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { PRODUCTS, TERRITORIES } from "@/lib/catalog";
import type { KitRules } from "@/lib/kit-rules";
import { api, ApiError } from "@/components/client-api";
import { Button, Field, Input, Notice, Select, Textarea, cx } from "@/components/ui";

export function KitVersionEditor(props: {
  kitId: string;
  current: KitRules;
  currentAssetIds: string[];
  assets: { id: string; code: string; name: string }[];
  team: { id: string; name: string; title: string }[];
}) {
  const router = useRouter();
  const [rules, setRules] = useState<KitRules>(() => structuredClone(props.current));
  const [assetIds, setAssetIds] = useState<string[]>(props.currentAssetIds);
  const [terms, setTerms] = useState(props.current.prohibitedTerms.join(", "));
  const [notes, setNotes] = useState("");
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<{ tone: "ok" | "fail"; text: string; list?: string[] } | null>(null);

  const set = (fn: (r: KitRules) => void) =>
    setRules((r) => {
      const n = structuredClone(r);
      fn(n);
      return n;
    });

  async function publish(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setResult(null);
    try {
      const body = { rules: { ...rules, prohibitedTerms: terms.split(",").map((t) => t.trim()).filter(Boolean) }, assetIds, notes };
      const r = await api<{ kitVersion: { versionNo: number } }>(`/api/kits/${props.kitId}/versions`, body);
      setResult({ tone: "ok", text: `Kit v${r.kitVersion.versionNo} is now in force.` });
      setNotes("");
      router.refresh();
    } catch (err) {
      const e = err as ApiError;
      const issues = Array.isArray(e.details) ? (e.details as { message: string }[]).map((i) => i.message) : undefined;
      setResult({ tone: "fail", text: e.message, list: issues });
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={publish} className="space-y-8">
      <section>
        <h3 className="mb-3 text-sm font-semibold">Permitted products and price bands</h3>
        <div className="grid gap-3 md:grid-cols-3">
          {Object.values(PRODUCTS).map((p) => {
            const rule = rules.products.find((x) => x.productId === p.id);
            return (
              <div key={p.id} className={cx("rounded-xl border p-4", rule ? "border-ink bg-card ring-1 ring-ink" : "border-sand")}>
                <label className="flex items-center gap-2 font-medium">
                  <input
                    type="checkbox"
                    className="h-4 w-4 accent-[var(--color-ink)]"
                    checked={!!rule}
                    onChange={(e) =>
                      set((r) => {
                        r.products = e.target.checked
                          ? [...r.products, { productId: p.id, layouts: [p.layouts[0].id], minPriceMinor: 49900, maxPriceMinor: 149900 }]
                          : r.products.filter((x) => x.productId !== p.id);
                      })
                    }
                  />
                  {p.name}
                </label>
                {rule && (
                  <div className="mt-3 space-y-3">
                    <fieldset>
                      <legend className="mb-1 text-xs text-moss">Layouts</legend>
                      <div className="flex flex-wrap gap-3">
                        {p.layouts.map((l) => (
                          <label key={l.id} className="flex items-center gap-1.5 text-sm">
                            <input
                              type="checkbox"
                              className="accent-[var(--color-ink)]"
                              checked={rule.layouts.includes(l.id)}
                              onChange={(e) =>
                                set((r) => {
                                  const x = r.products.find((y) => y.productId === p.id)!;
                                  x.layouts = e.target.checked ? [...x.layouts, l.id] : x.layouts.filter((y) => y !== l.id);
                                })
                              }
                            />
                            {l.name}
                          </label>
                        ))}
                      </div>
                    </fieldset>
                    <div className="grid grid-cols-2 gap-2">
                      <Field label="Min ₹" htmlFor={`min-${p.id}`}>
                        <Input id={`min-${p.id}`} type="number" min={0} value={rule.minPriceMinor / 100} onChange={(e) => set((r) => (r.products.find((y) => y.productId === p.id)!.minPriceMinor = Math.round(Number(e.target.value) * 100)))} />
                      </Field>
                      <Field label="Max ₹" htmlFor={`max-${p.id}`}>
                        <Input id={`max-${p.id}`} type="number" min={0} value={rule.maxPriceMinor / 100} onChange={(e) => set((r) => (r.products.find((y) => y.productId === p.id)!.maxPriceMinor = Math.round(Number(e.target.value) * 100)))} />
                      </Field>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </section>

      <section className="grid gap-5 md:grid-cols-3">
        <fieldset>
          <legend className="mb-1.5 text-sm font-medium">Territories</legend>
          <div className="flex flex-wrap gap-3">
            {Object.entries(TERRITORIES).map(([code, name]) => (
              <label key={code} className="flex items-center gap-1.5 text-sm">
                <input
                  type="checkbox"
                  className="accent-[var(--color-ink)]"
                  checked={rules.territories.includes(code)}
                  onChange={(e) => set((r) => (r.territories = e.target.checked ? [...r.territories, code] : r.territories.filter((t) => t !== code)))}
                />
                {name}
              </label>
            ))}
          </div>
        </fieldset>
        <Field label="Licence window opens" htmlFor="win-start">
          <Input id="win-start" type="date" value={rules.window.start} onChange={(e) => set((r) => (r.window.start = e.target.value))} />
        </Field>
        <Field label="Licence window closes" htmlFor="win-end">
          <Input id="win-end" type="date" value={rules.window.end} onChange={(e) => set((r) => (r.window.end = e.target.value))} />
        </Field>
        <Field label="Required approver" htmlFor="approver" hint="Only this person can approve proposals.">
          <Select id="approver" value={rules.requiredApproverId} onChange={(e) => set((r) => (r.requiredApproverId = e.target.value))}>
            {props.team.map((u) => (
              <option key={u.id} value={u.id}>{u.name} — {u.title}</option>
            ))}
          </Select>
        </Field>
        <Field label="Artwork size range (%)" htmlFor="scale-min">
          <div className="flex items-center gap-2">
            <Input id="scale-min" aria-label="Minimum artwork size" type="number" min={40} max={120} step={5} value={Math.round(rules.artworkScale.min * 100)} onChange={(e) => set((r) => (r.artworkScale.min = Number(e.target.value) / 100))} />
            <span className="text-moss">to</span>
            <Input aria-label="Maximum artwork size" type="number" min={40} max={120} step={5} value={Math.round(rules.artworkScale.max * 100)} onChange={(e) => set((r) => (r.artworkScale.max = Number(e.target.value) / 100))} />
          </div>
        </Field>
        <Field label="Licensor royalty (%)" htmlFor="royalty" hint="Of net item sales on delivered units.">
          <Input id="royalty" type="number" min={0} max={50} step={0.5} value={rules.royaltyBps / 100} onChange={(e) => set((r) => (r.royaltyBps = Math.round(Number(e.target.value) * 100)))} />
        </Field>
      </section>

      <Field label="Wording creators may not use" htmlFor="terms" hint="Comma-separated. Checked in print text, title, tagline and story.">
        <Input id="terms" value={terms} onChange={(e) => setTerms(e.target.value)} />
      </Field>

      <section>
        <h3 className="mb-2 text-sm font-semibold">Artwork included in this version</h3>
        <div className="flex flex-wrap gap-2">
          {props.assets.map((a) => (
            <label key={a.id} className={cx("flex cursor-pointer items-center gap-2 rounded-full border px-3 py-1.5 text-sm", assetIds.includes(a.id) ? "border-ink bg-ink text-paper" : "border-sand")}>
              <input type="checkbox" className="accent-[var(--color-ink)]" checked={assetIds.includes(a.id)} onChange={(e) => setAssetIds((ids) => (e.target.checked ? [...ids, a.id] : ids.filter((x) => x !== a.id)))} />
              <span className="font-mono text-xs text-moss">{a.code}</span> {a.name}
            </label>
          ))}
        </div>
      </section>

      <Field label="What changed (shown to creators)" htmlFor="notes">
        <Textarea id="notes" value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} placeholder="e.g. Added tote bags for the winter season." />
      </Field>

      {result && (
        <Notice tone={result.tone} title={result.tone === "fail" ? "Not published" : undefined}>
          {result.text}
          {result.list && <ul className="mt-1 list-disc pl-5">{result.list.map((l, i) => <li key={i}>{l}</li>)}</ul>}
        </Notice>
      )}
      <Button type="submit" disabled={busy}>{busy ? "Publishing…" : "Publish new kit version"}</Button>
    </form>
  );
}
