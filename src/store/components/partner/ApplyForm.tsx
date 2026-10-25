"use client";
import Link from "next/link";
import { useState } from "react";
import { useT } from "@/components/i18n-client";

type Terms = { version: string; unlock: string; print: string; figure: string; payoutDays: number };

export default function ApplyForm({ terms }: { terms: Terms }) {
  const t = useT();
  const [f, setF] = useState({ company: "", companyJa: "", country: "Japan", website: "", contactName: "", email: "", password: "", agree: false });
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);
  const set = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setF((x) => ({ ...x, [k]: e.target.type === "checkbox" ? (e.target as HTMLInputElement).checked : e.target.value }));
  async function submit(e: React.FormEvent) {
    e.preventDefault(); setErr(""); setBusy(true);
    const r = await fetch("/api/partner/apply", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(f) });
    const j = await r.json().catch(() => ({}));
    if (!r.ok) { setBusy(false); setErr(j.error || t("Something went wrong", "エラーが発生しました。お手数ですが、もう一度お試しください。")); return; }
    location.href = "/partner/dashboard?welcome=1";
  }
  const Field = ({ k, label, ja, hint, ...rest }: { k: keyof typeof f; label: string; ja?: string; hint?: string } & React.InputHTMLAttributes<HTMLInputElement>) => (
    <label className="block">
      <span className="field-label">{t.ja && ja ? <span className="jp">{ja}</span> : <>{label} {ja && <span className="jp font-normal text-muted">{ja}</span>}</>}</span>
      <input className="input" value={f[k] as string} onChange={set(k)} {...rest} />
      {hint && <span className="field-hint">{hint}</span>}
    </label>
  );
  return (
    <form onSubmit={submit} className="space-y-6">
      <fieldset className="card space-y-4 p-6">
        <legend className="sr-only">Company</legend>
        <div className="flex items-baseline gap-2"><h2 className="text-[17px] font-bold">{t("Your company", "会社情報")}</h2>{!t.ja && <span className="jp text-[12.5px] text-muted">会社情報</span>}</div>
        <div className="grid gap-4 sm:grid-cols-2">
          {Field({ k: "company", label: "Company name", ja: "会社名（英語）", required: true, placeholder: t("e.g. Hoshizora Comics", "例：Hoshizora Comics"), autoComplete: "organization" })}
          {Field({ k: "companyJa", label: "Name in Japanese", ja: "会社名（日本語）", placeholder: "例：星空コミックス", lang: "ja" })}
          <label className="block"><span className="field-label">{t(<>Country <span className="jp font-normal text-muted">国</span></>, <span className="jp">国・地域</span>)}</span>
            <select className="input" value={f.country} onChange={set("country")}>{([["Japan", "日本"], ["South Korea", "韓国"], ["India", "インド"], ["Other", "その他"]] as const).map(([c, j]) => <option key={c} value={c}>{t(c, j)}</option>)}</select></label>
          {Field({ k: "website", label: "Website", ja: "ウェブサイト", type: "url", placeholder: "https://", hint: t("Helps us verify the company faster.", "ご入力いただくと、確認がスムーズに進みます。") })}
        </div>
      </fieldset>
      <fieldset className="card space-y-4 p-6">
        <legend className="sr-only">Your account</legend>
        <div className="flex items-baseline gap-2"><h2 className="text-[17px] font-bold">{t("Your account", "ご担当者さま")}</h2>{!t.ja && <span className="jp text-[12.5px] text-muted">担当者</span>}</div>
        <div className="grid gap-4 sm:grid-cols-2">
          {Field({ k: "contactName", label: "Your name", ja: "お名前", required: true, autoComplete: "name" })}
          {Field({ k: "email", label: "Work email", ja: "メールアドレス", type: "email", required: true, autoComplete: "email" })}
          {Field({ k: "password", label: "Password", ja: "パスワード", type: "password", required: true, minLength: 8, autoComplete: "new-password", hint: t("At least 8 characters.", "8文字以上でご設定ください。") })}
        </div>
      </fieldset>
      <fieldset className="card space-y-4 p-6">
        <legend className="sr-only">Terms</legend>
        <div className="flex items-baseline gap-2"><h2 className="text-[17px] font-bold">{t("Partner terms", "契約条件")}</h2><span className="jp text-[12.5px] text-muted">{t(`契約条件 v${terms.version}`, `第${terms.version}版`)}</span></div>
        <ul className="grid gap-2 text-[14px] sm:grid-cols-2">
          <li className="rounded-xl bg-fg/[.03] px-3.5 py-2.5">{t(<><b>{terms.unlock}</b> of chapter unlocks</>, <>各話購入額の <b>{terms.unlock}</b></>)}</li>
          <li className="rounded-xl bg-fg/[.03] px-3.5 py-2.5">{t(<><b>{terms.print}</b> royalty on India-printed volumes</>, <>インド国内印刷の単行本：印税 <b>{terms.print}</b></>)}</li>
          <li className="rounded-xl bg-fg/[.03] px-3.5 py-2.5">{t(<><b>{terms.figure}</b> licensing royalty on merchandise</>, <>グッズ：ライセンス料 <b>{terms.figure}</b></>)}</li>
          <li className="rounded-xl bg-fg/[.03] px-3.5 py-2.5">{t(`Paid monthly, ${terms.payoutDays} days after month end`, `月末締め、${terms.payoutDays}日後に毎月お支払い`)}</li>
        </ul>
        <p className="text-[13.5px] leading-relaxed text-muted">{t("You keep ownership of your works and choose the languages, rights and term for each title. Titles go live only after Torii has verified your company and reviewed the title.", "作品の権利はすべて貴社に帰属し、作品ごとに言語・権利範囲・期間をお選びいただけます。配信は、弊社による貴社の確認と作品の審査が完了した後に開始されます。")}</p>
        <label className="flex items-start gap-3 text-[14.5px]">
          <input type="checkbox" className="mt-1 h-5 w-5 accent-[rgb(214,0,50)]" checked={f.agree} onChange={set("agree")} />
          <span>{t(<>I accept the Torii partner terms (v{terms.version}) on behalf of my company. <span className="jp text-muted">パートナー規約に同意します。</span></>, <span className="jp">貴社を代表して、Toriiパートナー規約（第{terms.version}版）に同意いたします。</span>)}</span>
        </label>
      </fieldset>
      {err && <p role="alert" className="text-[14px] font-semibold text-bad">{err}</p>}
      <div className="flex flex-wrap items-center gap-4">
        <button className="btn-primary text-[16px]" disabled={busy || !f.agree}>{busy ? t("Creating your account…", "アカウントを作成しています…") : t("Create partner account", "パートナーアカウントを作成")}</button>
        <span className="text-[14px] text-muted">{t("Already a partner? ", "すでにご登録済みの方は ")}<Link href="/partner/login" className="font-semibold text-fg underline underline-offset-2">{t("Sign in", "ログイン")}</Link></span>
      </div>
    </form>
  );
}
