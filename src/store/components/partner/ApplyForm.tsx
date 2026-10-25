"use client";
import Link from "next/link";
import { useState } from "react";

type Terms = { version: string; unlock: string; print: string; figure: string; payoutDays: number };

export default function ApplyForm({ terms }: { terms: Terms }) {
  const [f, setF] = useState({ company: "", companyJa: "", country: "Japan", website: "", contactName: "", email: "", password: "", agree: false });
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);
  const set = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setF((x) => ({ ...x, [k]: e.target.type === "checkbox" ? (e.target as HTMLInputElement).checked : e.target.value }));
  async function submit(e: React.FormEvent) {
    e.preventDefault(); setErr(""); setBusy(true);
    const r = await fetch("/api/partner/apply", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(f) });
    const j = await r.json().catch(() => ({}));
    if (!r.ok) { setBusy(false); setErr(j.error || "Something went wrong"); return; }
    location.href = "/partner/dashboard?welcome=1";
  }
  const Field = ({ k, label, ja, hint, ...rest }: { k: keyof typeof f; label: string; ja?: string; hint?: string } & React.InputHTMLAttributes<HTMLInputElement>) => (
    <label className="block">
      <span className="field-label">{label} {ja && <span className="jp font-normal text-muted">{ja}</span>}</span>
      <input className="input" value={f[k] as string} onChange={set(k)} {...rest} />
      {hint && <span className="field-hint">{hint}</span>}
    </label>
  );
  return (
    <form onSubmit={submit} className="space-y-6">
      <fieldset className="card space-y-4 p-6">
        <legend className="sr-only">Company</legend>
        <div className="flex items-baseline gap-2"><h2 className="text-[17px] font-bold">Your company</h2><span className="jp text-[12.5px] text-muted">会社情報</span></div>
        <div className="grid gap-4 sm:grid-cols-2">
          {Field({ k: "company", label: "Company name", ja: "会社名（英語）", required: true, placeholder: "e.g. Hoshizora Comics", autoComplete: "organization" })}
          {Field({ k: "companyJa", label: "Name in Japanese", ja: "会社名（日本語）", placeholder: "例：星空コミックス", lang: "ja" })}
          <label className="block"><span className="field-label">Country <span className="jp font-normal text-muted">国</span></span>
            <select className="input" value={f.country} onChange={set("country")}>{["Japan", "South Korea", "India", "Other"].map((c) => <option key={c}>{c}</option>)}</select></label>
          {Field({ k: "website", label: "Website", ja: "ウェブサイト", type: "url", placeholder: "https://", hint: "Helps us verify the company faster." })}
        </div>
      </fieldset>
      <fieldset className="card space-y-4 p-6">
        <legend className="sr-only">Your account</legend>
        <div className="flex items-baseline gap-2"><h2 className="text-[17px] font-bold">Your account</h2><span className="jp text-[12.5px] text-muted">担当者</span></div>
        <div className="grid gap-4 sm:grid-cols-2">
          {Field({ k: "contactName", label: "Your name", ja: "氏名", required: true, autoComplete: "name" })}
          {Field({ k: "email", label: "Work email", ja: "メール", type: "email", required: true, autoComplete: "email" })}
          {Field({ k: "password", label: "Password", ja: "パスワード", type: "password", required: true, minLength: 8, autoComplete: "new-password", hint: "At least 8 characters." })}
        </div>
      </fieldset>
      <fieldset className="card space-y-4 p-6">
        <legend className="sr-only">Terms</legend>
        <div className="flex items-baseline gap-2"><h2 className="text-[17px] font-bold">Partner terms</h2><span className="jp text-[12.5px] text-muted">契約条件 v{terms.version}</span></div>
        <ul className="grid gap-2 text-[14px] sm:grid-cols-2">
          <li className="rounded-xl bg-fg/[.03] px-3.5 py-2.5"><b>{terms.unlock}</b> of chapter unlocks</li>
          <li className="rounded-xl bg-fg/[.03] px-3.5 py-2.5"><b>{terms.print}</b> royalty on India-printed volumes</li>
          <li className="rounded-xl bg-fg/[.03] px-3.5 py-2.5"><b>{terms.figure}</b> licensing royalty on merchandise</li>
          <li className="rounded-xl bg-fg/[.03] px-3.5 py-2.5">Paid monthly, {terms.payoutDays} days after month end</li>
        </ul>
        <p className="text-[13.5px] leading-relaxed text-muted">You keep ownership of your works and choose the languages, rights and term for each title. Titles go live only after Torii has verified your company and reviewed the title.</p>
        <label className="flex items-start gap-3 text-[14.5px]">
          <input type="checkbox" className="mt-1 h-5 w-5 accent-[rgb(214,0,50)]" checked={f.agree} onChange={set("agree")} />
          <span>I accept the Torii partner terms (v{terms.version}) on behalf of my company. <span className="jp text-muted">パートナー規約に同意します。</span></span>
        </label>
      </fieldset>
      {err && <p role="alert" className="text-[14px] font-semibold text-bad">{err}</p>}
      <div className="flex flex-wrap items-center gap-4">
        <button className="btn-primary text-[16px]" disabled={busy || !f.agree}>{busy ? "Creating your account…" : "Create partner account"}</button>
        <span className="text-[14px] text-muted">Already a partner? <Link href="/partner/login" className="font-semibold text-fg underline underline-offset-2">Sign in</Link></span>
      </div>
    </form>
  );
}
