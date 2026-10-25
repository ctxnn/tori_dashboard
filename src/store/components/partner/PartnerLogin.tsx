"use client";
import Link from "next/link";
import { useState } from "react";
import { useT } from "@/components/i18n-client";

export default function PartnerLogin({ next, demo }: { next: string; demo: boolean }) {
  const t = useT();
  const [email, setEmail] = useState(demo ? "partner@shueisha.example" : "");
  const [password, setPassword] = useState(demo ? "torii-demo" : "");
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);
  async function submit(e: React.FormEvent) {
    e.preventDefault(); setErr(""); setBusy(true);
    const r = await fetch("/api/partner/auth/login", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ email, password }) });
    const j = await r.json().catch(() => ({}));
    if (!r.ok) { setBusy(false); setErr(j.error || t("Couldn't sign in", "ログインできませんでした。")); return; }
    location.href = next;
  }
  const fill = (who: "kumolantern" | "shueisha" | "kodansha") => { setEmail(`partner@${who}.example`); setPassword("torii-demo"); };
  // The IP owner from the collaboration workspace opens the portal as their demo identity.
  async function asHaruka() {
    setErr(""); setBusy(true);
    const r = await fetch("/api/session", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ userId: "usr_haruka" }) });
    if (!r.ok) { setBusy(false); setErr(t("Couldn't open the demo account", "デモアカウントを開けませんでした。")); return; }
    location.href = next;
  }
  // A field label: English with its Japanese alongside, or Japanese alone when the portal is in Japanese.
  const L = (en: string, ja: string) => (t.ja ? <span className="jp">{ja}</span> : <>{en} <span className="jp font-normal text-muted">{ja}</span></>);
  return (
    <div className="mx-auto grid max-w-5xl gap-10 px-5 py-14 sm:px-8 md:grid-cols-[1fr_.9fr] md:py-20">
      <div>
        <div className="jp text-[13px] tracking-[.1em] text-accent">{t("パートナーログイン", "Partner sign-in")}</div>
        <h1 className="mt-2 font-display text-[clamp(30px,4vw,44px)] leading-[1.05]">{t("Sign in to the Partner Portal", "パートナーポータルへログイン")}</h1>
        <p className="mt-3 max-w-md text-[15.5px] leading-relaxed text-muted">
          {t("For publishers and rights holders. Readers sign in to the Torii app with their phone instead.", "出版社・権利者さま向けのページです。読者の方は、Toriiアプリから電話番号でログインしてください。")}
        </p>
        <form onSubmit={submit} className="mt-8 max-w-md space-y-4">
          <label className="block"><span className="field-label">{L("Work email", "メールアドレス")}</span>
            <input className="input" type="email" autoComplete="username" value={email} onChange={(e) => setEmail(e.target.value)} required autoFocus /></label>
          <label className="block"><span className="field-label">{L("Password", "パスワード")}</span>
            <input className="input" type="password" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} required /></label>
          {err && <p role="alert" className="text-[14px] font-semibold text-bad">{err}</p>}
          <button className="btn-primary w-full text-[16px]" disabled={busy || !email || !password}>{busy ? t("Signing in…", "ログイン中…") : t("Sign in", "ログイン")}</button>
          <p className="text-[14px] text-muted">
            {t("New to Torii? ", "はじめてご利用の方は ")}
            <Link href="/partner/apply" className="font-semibold text-fg underline underline-offset-2">{t("Join the partner programme", "パートナー登録へ")}</Link>
          </p>
        </form>
      </div>
      <aside className="panel self-start p-6">
        <div className="label">{t("Demo accounts", "デモ用アカウント")}</div>
        <button type="button" onClick={asHaruka} disabled={busy} className="btn-primary mt-3 w-full justify-between text-left">
          <span>{t(<>Haruka Sato · Kumo Lantern Studio <span className="jp font-normal opacity-80">雲灯スタジオ</span></>, <span className="jp">佐藤 遥 · 雲灯スタジオ</span>)}</span>
          <span className="text-[12.5px] opacity-80">{t("Open", "開く")}</span>
        </button>
        <p className="mt-2 text-[13px] leading-relaxed text-muted">
          {t(
            "The IP owner of Sky Courier, with its manga and its merch collaborations. Same person as in the Torii workspace.",
            "『Sky Courier』の権利者さまです。マンガとグッズのコラボレーションをご確認いただけます。Toriiワークスペースと同じご担当者です。",
          )}
        </p>
        <p className="mt-5 border-t border-line pt-4 text-[14px] leading-relaxed text-muted">
          {t(
            <>Or sign in with a password: all use <b className="text-fg">torii-demo</b>. Shueisha and Kodansha already have series on Torii, so their insights and earnings are filled in.</>,
            <>パスワードでもログインいただけます（いずれも <b className="text-fg">torii-demo</b>）。集英社さま・講談社さまはすでに作品を配信中のため、市場データと収益をご覧いただけます。</>,
          )}
        </p>
        <div className="mt-4 grid gap-2">
          <button type="button" onClick={() => fill("shueisha")} className="btn-ghost justify-between">
            <span>{t(<>Shueisha <span className="jp text-muted">集英社</span></>, <span className="jp">集英社</span>)}</span><span className="text-[12.5px] text-muted">{t("Fill in", "入力する")}</span>
          </button>
          <button type="button" onClick={() => fill("kodansha")} className="btn-ghost justify-between">
            <span>{t(<>Kodansha <span className="jp text-muted">講談社</span></>, <span className="jp">講談社</span>)}</span><span className="text-[12.5px] text-muted">{t("Fill in", "入力する")}</span>
          </button>
        </div>
        <p className="mt-5 border-t border-line pt-4 text-[13px] leading-relaxed text-muted">
          {t(
            <>Torii staff approve titles in the fan app: choose <b className="text-fg">Meera Iyer</b> (Torii operations) at <Link href="/switch" className="font-semibold text-fg underline underline-offset-2">Switch</Link>, or sign in with phone <b className="text-fg">9999999999</b> (OTP 123456), then open <Link href="/publisher/review" className="font-semibold text-fg underline underline-offset-2">Review queue</Link>.</>,
            <>作品の承認は、Torii担当者がファンアプリで行います。<Link href="/switch" className="font-semibold text-fg underline underline-offset-2">ロール切り替え</Link>で <b className="text-fg">Meera Iyer</b>（Torii運営）を選ぶか、電話番号 <b className="text-fg">9999999999</b>（認証コード 123456）でログインし、<Link href="/publisher/review" className="font-semibold text-fg underline underline-offset-2">審査一覧</Link>を開いてください。</>,
          )}
        </p>
      </aside>
    </div>
  );
}
