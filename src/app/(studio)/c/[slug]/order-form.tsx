"use client";

import { useState } from "react";
import { api } from "@/components/client-api";
import { Button, Field, Input, Select, cx } from "@/components/ui";
import { CITY_NAMES } from "@/lib/india";
import { formatINR } from "@/lib/money";

function newKey(): string {
  // randomUUID needs a secure context; fall back for plain-http LAN demos.
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) return crypto.randomUUID();
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}-${Math.random().toString(36).slice(2)}`;
}

export function OrderForm({ slug, sizes, priceMinor, shippingMinor, defaults }: { slug: string; sizes: string[]; priceMinor: number; shippingMinor: number; defaults?: { name: string; email: string } }) {
  // One key per form load: resubmitting (double click, retry) returns the same order.
  const [checkoutKey] = useState(newKey);
  const [size, setSize] = useState(sizes.length === 1 ? sizes[0] : "");
  const [quantity, setQuantity] = useState(1);
  const [buyerName, setName] = useState(defaults?.name ?? "");
  const [buyerEmail, setEmail] = useState(defaults?.email ?? "");
  const [buyerCity, setCity] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const total = priceMinor * quantity + shippingMinor;

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!size) {
      setError("Choose a size");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const r = await api<{ checkoutUrl: string }>("/api/orders", { slug, size, quantity, buyerName, buyerEmail, buyerCity, checkoutKey });
      window.location.assign(r.checkoutUrl);
    } catch (err) {
      setError((err as Error).message);
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} className="space-y-5" aria-label="Preorder">
      <div className="flex flex-wrap items-end gap-x-8 gap-y-4">
        {sizes.length > 1 && (
          <fieldset>
            <legend className="label mb-2 text-moss">Size</legend>
            <div className="flex flex-wrap gap-1.5" role="radiogroup">
              {sizes.map((s) => (
                <label key={s} className={cx("grid h-11 min-w-11 cursor-pointer place-items-center rounded-lg border px-3 font-mono text-sm transition has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-vermilion", size === s ? "border-ink bg-ink text-paper" : "border-sand-2 bg-card hover:border-ink")}>
                  <input type="radio" name="size" value={s} checked={size === s} onChange={() => setSize(s)} className="sr-only" />
                  {s}
                </label>
              ))}
            </div>
          </fieldset>
        )}
        <div>
          <span className="label mb-2 block text-moss" id="qty-label">Quantity</span>
          <div className="flex h-11 items-center rounded-lg border border-sand-2 bg-card" role="group" aria-labelledby="qty-label">
            <button type="button" className="h-full w-10 text-lg text-ink-2 hover:text-ink disabled:opacity-30" onClick={() => setQuantity((q) => Math.max(1, q - 1))} disabled={quantity <= 1} aria-label="One fewer">−</button>
            <span className="w-8 text-center font-mono tabular-nums" aria-live="polite">{quantity}</span>
            <button type="button" className="h-full w-10 text-lg text-ink-2 hover:text-ink disabled:opacity-30" onClick={() => setQuantity((q) => Math.min(5, q + 1))} disabled={quantity >= 5} aria-label="One more">+</button>
          </div>
        </div>
      </div>
      <div className="grid gap-3 sm:grid-cols-3">
        <Field label="Name" htmlFor="buyer-name">
          <Input id="buyer-name" value={buyerName} onChange={(e) => setName(e.target.value)} autoComplete="name" required minLength={2} />
        </Field>
        <Field label="Email" htmlFor="buyer-email">
          <Input id="buyer-email" type="email" value={buyerEmail} onChange={(e) => setEmail(e.target.value)} autoComplete="email" required />
        </Field>
        <Field label="City" htmlFor="buyer-city" optional>
          <Select id="buyer-city" value={buyerCity} onChange={(e) => setCity(e.target.value)}>
            <option value="">Prefer not to say</option>
            {CITY_NAMES.map((c) => <option key={c}>{c}</option>)}
            <option value="Other">Somewhere else</option>
          </Select>
        </Field>
      </div>
      {error && <p className="text-sm text-fail" role="alert">{error}</p>}
      <Button type="submit" variant="accent" size="lg" className="h-14 w-full justify-between px-5 text-base" disabled={busy}>
        <span>{busy ? "Starting checkout…" : "Preorder"}</span>
        <span className="font-mono text-[13px] font-normal opacity-90">
          {quantity} × {formatINR(priceMinor)} + {formatINR(shippingMinor)} = <span className="text-base font-semibold">{formatINR(total)}</span>
        </span>
      </Button>
      <p className="text-center text-xs text-moss">Test mode — you’ll go to Torii’s payment simulator. No real money moves.</p>
    </form>
  );
}
