"use client";

import Link from "next/link";
import { useState } from "react";
import { api } from "@/components/client-api";
import { Arrow, Button, Field, Input, Select, cx } from "@/components/ui";
import { Hanko } from "@/components/japan";
import { CITY_NAMES } from "@/lib/india";
import { AGE_BANDS, LANGUAGES, PRICE_BANDS, WANTS, WATCH_CHANNELS } from "@/lib/pulse";
import { formatINR } from "@/lib/money";

interface Receipt {
  isNew: boolean;
  city: string;
  inCity: number;
  total: number;
  cityRank: number;
}

function Chips<T extends string>({ legend, options, value, onChange, multi = false }: { legend: string; options: readonly { id: T; label: string }[]; value: T[]; onChange: (v: T[]) => void; multi?: boolean }) {
  return (
    <fieldset>
      <legend className="mb-2.5 text-[13px] font-medium text-ink">{legend}</legend>
      <div className="flex flex-wrap gap-1.5">
        {options.map((o) => {
          const on = value.includes(o.id);
          return (
            <label
              key={o.id}
              className={cx(
                "cursor-pointer rounded-full border px-3.5 py-2 text-[13px] transition has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-vermilion",
                on ? "border-ink bg-ink text-paper" : "border-sand-2 bg-card text-ink-2 hover:border-ink",
              )}
            >
              <input
                type={multi ? "checkbox" : "radio"}
                name={legend}
                aria-label={o.label}
                className="sr-only"
                checked={on}
                onChange={() => onChange(multi ? (on ? value.filter((v) => v !== o.id) : [...value, o.id]) : [o.id])}
              />
              {o.label}
            </label>
          );
        })}
      </div>
    </fieldset>
  );
}

export function PulseForm({ kitId, property, owner, defaultEmail, signedInFan }: { kitId: string; property: string; owner: string; defaultEmail?: string; signedInFan: boolean }) {
  const [city, setCity] = useState("");
  const [ageBand, setAge] = useState<string[]>([]);
  const [wants, setWants] = useState<string[]>(["tshirt"]);
  const [band, setBand] = useState(3);
  const [channel, setChannel] = useState<string[]>([]);
  const [language, setLanguage] = useState<string[]>([]);
  const [email, setEmail] = useState(defaultEmail ?? "");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [receipt, setReceipt] = useState<Receipt | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const r = await api<Receipt>("/api/interest", {
        kitId,
        email,
        city,
        ageBand: ageBand[0],
        priceMinor: PRICE_BANDS[band],
        wants,
        channel: channel[0],
        language: language[0],
      });
      setReceipt(r);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  if (receipt) {
    return (
      <div className="relative overflow-hidden rounded-[var(--radius-card)] border border-sand bg-card p-6 sm:p-8" role="status">
        <div className="washi pointer-events-none absolute inset-0" aria-hidden />
        <div className="relative flex flex-col gap-6 sm:flex-row sm:items-center">
          <Hanko lines={[receipt.city.slice(0, 7).toUpperCase(), `FAN ${receipt.inCity}`]} className="h-28 w-28 shrink-0" animate label={`Fan number ${receipt.inCity} in ${receipt.city}`} />
          <div>
            <h2 className="text-[26px] font-semibold leading-tight tracking-[-0.03em]">{receipt.isNew ? "Counted. Thank you." : "Updated. Thank you."}</h2>
            <p className="mt-2 text-[15px] leading-relaxed text-ink-2">
              You’re fan <b className="font-semibold text-ink">#{receipt.inCity}</b> in {receipt.city}, which ranks <b className="font-semibold text-ink">#{receipt.cityRank}</b> of every city on the {property} pulse ({receipt.total} fans so far). {owner} sees this before any campaign is made.
            </p>
            <div className="mt-5 flex flex-wrap gap-2">
              {signedInFan ? (
                <Link href="/fan" className="group inline-flex h-10 items-center gap-2 rounded-lg bg-ink px-4 text-sm font-medium text-paper hover:bg-pine">
                  Open your passport <Arrow />
                </Link>
              ) : null}
              <Link href="/campaigns" className="group inline-flex h-10 items-center gap-2 rounded-lg px-4 text-sm font-medium text-ink ring-1 ring-inset ring-sand-2 hover:ring-ink">
                See live campaigns <Arrow />
              </Link>
              <button type="button" onClick={() => setReceipt(null)} className="h-10 px-3 text-sm text-moss underline underline-offset-2 hover:text-ink">
                Change my answers
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="space-y-7 rounded-[var(--radius-card)] border border-sand bg-card p-5 sm:p-7" aria-label={`${property} fan pulse`}>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Your city" htmlFor="pulse-city">
          <Select id="pulse-city" value={city} onChange={(e) => setCity(e.target.value)} required>
            <option value="" disabled>Choose…</option>
            {CITY_NAMES.map((c) => <option key={c}>{c}</option>)}
          </Select>
        </Field>
        <Chips legend="Your age" options={AGE_BANDS.map((a) => ({ id: a, label: a }))} value={ageBand} onChange={setAge} />
      </div>

      <Chips legend="What would you buy? (pick any)" options={WANTS} value={wants} onChange={setWants} multi />

      <div>
        <div className="flex items-baseline justify-between gap-3">
          <label htmlFor="pulse-price" className="text-[13px] font-medium text-ink">The most you’d pay for an official T-shirt</label>
          <span className="font-mono text-[22px] font-semibold tracking-[-0.03em] tabular-nums" aria-live="polite">{formatINR(PRICE_BANDS[band])}</span>
        </div>
        <input
          id="pulse-price"
          type="range"
          min={0}
          max={PRICE_BANDS.length - 1}
          step={1}
          value={band}
          onChange={(e) => setBand(Number(e.target.value))}
          className="mt-3 w-full accent-vermilion"
          aria-valuetext={formatINR(PRICE_BANDS[band])}
        />
        <div className="mt-1 flex justify-between font-mono text-[10.5px] text-moss" aria-hidden>
          <span>{formatINR(PRICE_BANDS[0])}</span>
          <span>{formatINR(PRICE_BANDS[PRICE_BANDS.length - 1])}</span>
        </div>
      </div>

      <div className="grid gap-7 lg:grid-cols-2">
        <Chips legend="Where do you watch anime?" options={WATCH_CHANNELS} value={channel} onChange={setChannel} />
        <Chips legend="In which language?" options={LANGUAGES} value={language} onChange={setLanguage} />
      </div>

      <Field label="Email" htmlFor="pulse-email" hint="Used only to tell you when a campaign for this property opens. One answer per email; answering again updates it.">
        <Input id="pulse-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" required />
      </Field>

      {error && <p className="text-sm text-fail" role="alert">{error}</p>}
      <Button type="submit" variant="accent" size="lg" className="w-full justify-between sm:w-auto sm:min-w-64" disabled={busy}>
        {busy ? "Sending…" : `Count me in for ${property}`} <Arrow />
      </Button>
    </form>
  );
}
