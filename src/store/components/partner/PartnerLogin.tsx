"use client";
import Link from "next/link";
import { useState } from "react";

export default function PartnerLogin({ next, demo }: { next: string; demo: boolean }) {
  const [email, setEmail] = useState(demo ? "partner@shueisha.example" : "");
  const [password, setPassword] = useState(demo ? "torii-demo" : "");
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);
  async function submit(e: React.FormEvent) {
    e.preventDefault(); setErr(""); setBusy(true);
    const r = await fetch("/api/partner/auth/login", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ email, password }) });
    const j = await r.json().catch(() => ({}));
    if (!r.ok) { setBusy(false); setErr(j.error || "Couldn't sign in"); return; }
    location.href = next;
  }
  const fill = (who: "kumolantern" | "shueisha" | "kodansha") => { setEmail(`partner@${who}.example`); setPassword("torii-demo"); };
  // The IP owner from the collaboration workspace opens the portal as their demo identity.
  async function asHaruka() {
    setErr(""); setBusy(true);
    const r = await fetch("/api/session", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ userId: "usr_haruka" }) });
    if (!r.ok) { setBusy(false); setErr("Couldn't open the demo account"); return; }
    location.href = next;
  }
  return (
    <div className="mx-auto grid max-w-5xl gap-10 px-5 py-14 sm:px-8 md:grid-cols-[1fr_.9fr] md:py-20">
      <div>
        <div className="jp text-[13px] tracking-[.1em] text-accent">パートナーログイン</div>
        <h1 className="mt-2 font-display text-[clamp(30px,4vw,44px)] leading-[1.05]">Sign in to the Partner Portal</h1>
        <p className="mt-3 max-w-md text-[15.5px] leading-relaxed text-muted">For publishers and rights holders. Readers sign in to the Torii app with their phone instead.</p>
        <form onSubmit={submit} className="mt-8 max-w-md space-y-4">
          <label className="block"><span className="field-label">Work email <span className="jp font-normal text-muted">メールアドレス</span></span>
            <input className="input" type="email" autoComplete="username" value={email} onChange={(e) => setEmail(e.target.value)} required autoFocus /></label>
          <label className="block"><span className="field-label">Password <span className="jp font-normal text-muted">パスワード</span></span>
            <input className="input" type="password" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} required /></label>
          {err && <p role="alert" className="text-[14px] font-semibold text-bad">{err}</p>}
          <button className="btn-primary w-full text-[16px]" disabled={busy || !email || !password}>{busy ? "Signing in…" : "Sign in"}</button>
          <p className="text-[14px] text-muted">New to Torii? <Link href="/partner/apply" className="font-semibold text-fg underline underline-offset-2">Join the partner programme</Link></p>
        </form>
      </div>
      <aside className="panel self-start p-6">
        <div className="label">Demo accounts</div>
        <button type="button" onClick={asHaruka} disabled={busy} className="btn-primary mt-3 w-full justify-between text-left">
          <span>Haruka Sato · Kumo Lantern Studio <span className="jp font-normal opacity-80">雲灯スタジオ</span></span><span className="text-[12.5px] opacity-80">Open</span>
        </button>
        <p className="mt-2 text-[13px] leading-relaxed text-muted">The IP owner of Sky Courier, with its manga and its merch collaborations. Same person as in the Torii workspace.</p>
        <p className="mt-5 border-t border-line pt-4 text-[14px] leading-relaxed text-muted">Or sign in with a password: all use <b className="text-fg">torii-demo</b>. Shueisha and Kodansha already have series on Torii, so their insights and earnings are filled in.</p>
        <div className="mt-4 grid gap-2">
          <button type="button" onClick={() => fill("shueisha")} className="btn-ghost justify-between"><span>Shueisha <span className="jp text-muted">集英社</span></span><span className="text-[12.5px] text-muted">Fill in</span></button>
          <button type="button" onClick={() => fill("kodansha")} className="btn-ghost justify-between"><span>Kodansha <span className="jp text-muted">講談社</span></span><span className="text-[12.5px] text-muted">Fill in</span></button>
        </div>
        <p className="mt-5 border-t border-line pt-4 text-[13px] leading-relaxed text-muted">Torii staff approve titles in the fan app: choose <b className="text-fg">Meera Iyer</b> (Torii operations) at <Link href="/switch" className="font-semibold text-fg underline underline-offset-2">Switch</Link>, or sign in with phone <b className="text-fg">9999999999</b> (OTP 123456), then open <Link href="/publisher/review" className="font-semibold text-fg underline underline-offset-2">Review queue</Link>.</p>
      </aside>
    </div>
  );
}
