"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { PRODUCTS } from "@/lib/catalog";
import type { CostAssumptions, PlatformTerms } from "@/lib/domain/core";
import { api } from "@/components/client-api";
import { Button, Field, Input, Notice } from "@/components/ui";

export function SettingsForm({ terms: t0, costs: c0 }: { terms: PlatformTerms; costs: CostAssumptions }) {
  const router = useRouter();
  const [terms, setTerms] = useState(t0);
  const [costs, setCosts] = useState(c0);
  const [msg, setMsg] = useState<{ tone: "ok" | "fail"; text: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const pct = (bps: number) => bps / 100;
  const bps = (v: string) => Math.round((Number(v) || 0) * 100);
  const rs = (minor: number) => minor / 100;
  const minor = (v: string) => Math.round((Number(v) || 0) * 100);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      await api("/api/ops/settings", { terms, costs }, "PUT");
      setMsg({ tone: "ok", text: "Saved. New and edited campaign versions will use these terms." });
      router.refresh();
    } catch (err) {
      setMsg({ tone: "fail", text: (err as Error).message });
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={save} className="space-y-8">
      <section>
        <h3 className="mb-1 text-sm font-semibold">Shares of net item sales</h3>
        <p className="mb-3 text-xs text-moss">The licensor royalty is set by each IP owner in their kit. The seller keeps the remainder to cover production.</p>
        <div className="grid gap-4 sm:grid-cols-3">
          <Field label="Creator earnings (%)" htmlFor="creator">
            <Input id="creator" type="number" step={0.5} min={0} value={pct(terms.creatorBps)} onChange={(e) => setTerms({ ...terms, creatorBps: bps(e.target.value) })} />
          </Field>
          <Field label="Torii commission (%)" htmlFor="platform" hint="Revenue before Torii’s own expenses.">
            <Input id="platform" type="number" step={0.5} min={0} value={pct(terms.platformBps)} onChange={(e) => setTerms({ ...terms, platformBps: bps(e.target.value) })} />
          </Field>
        </div>
      </section>
      <section>
        <h3 className="mb-3 text-sm font-semibold">Cost assumptions (for estimates only)</h3>
        <div className="grid gap-4 sm:grid-cols-3">
          {Object.values(PRODUCTS).map((p) => (
            <Field key={p.id} label={`${p.name} production, per unit (₹)`} htmlFor={`prod-${p.id}`}>
              <Input id={`prod-${p.id}`} type="number" min={0} value={rs(costs.productionMinor[p.id] ?? 0)} onChange={(e) => setCosts({ ...costs, productionMinor: { ...costs.productionMinor, [p.id]: minor(e.target.value) } })} />
            </Field>
          ))}
          <Field label="Packaging, per order (₹)" htmlFor="pack">
            <Input id="pack" type="number" min={0} value={rs(costs.packagingMinor)} onChange={(e) => setCosts({ ...costs, packagingMinor: minor(e.target.value) })} />
          </Field>
          <Field label="Courier, per order (₹)" htmlFor="courier">
            <Input id="courier" type="number" min={0} value={rs(costs.shippingCostMinor)} onChange={(e) => setCosts({ ...costs, shippingCostMinor: minor(e.target.value) })} />
          </Field>
          <Field label="Payment processing (%)" htmlFor="fee">
            <Input id="fee" type="number" step={0.1} min={0} value={pct(costs.paymentFeeBps)} onChange={(e) => setCosts({ ...costs, paymentFeeBps: bps(e.target.value) })} />
          </Field>
        </div>
      </section>
      {msg && <Notice tone={msg.tone}>{msg.text}</Notice>}
      <Button type="submit" disabled={busy}>{busy ? "Saving…" : "Save settings"}</Button>
    </form>
  );
}
