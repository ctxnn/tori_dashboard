"use client";
import { useState } from "react";
import { Torii } from "./Icons";

export default function LoginForm({ next }: { next: string }) {
  const [phone, setPhone] = useState("");
  const [otp, setOtp] = useState("");
  const [step, setStep] = useState<"phone" | "otp">("phone");
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);
  async function submit(e: React.FormEvent) {
    e.preventDefault(); setErr(""); setBusy(true);
    const r = await fetch("/api/store/auth/login", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(step === "phone" ? { phone } : { phone, otp }) });
    const j = await r.json(); setBusy(false);
    if (!r.ok) { setErr(j.error); return; }
    if (step === "phone") { setStep("otp"); return; }
    location.href = j.isAdmin && next === "/read" ? "/publisher" : next;
  }
  // The same fan as in the Torii workspace: one shelf for manga, figures and collab preorders.
  async function asAarav() {
    setErr(""); setBusy(true);
    const r = await fetch("/api/session", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ userId: "usr_aarav" }) });
    if (!r.ok) { setBusy(false); setErr("Couldn't open the demo account"); return; }
    location.href = next;
  }
  return (
    <div className="mx-auto max-w-sm">
      <section className="paper-band bleed relative -mt-5 overflow-hidden border-b border-line px-4 pb-7 pt-8 text-center dark:border-line">
        <div className="tone pointer-events-none absolute -inset-y-12 inset-x-0 opacity-60" />
        <div className="relative">
          <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl border border-line bg-[rgb(230,0,51)] text-white shadow-panel"><Torii className="h-8 w-8" /></span>
          <h1 className="h-title mt-4">Sign in to Torii</h1>
          <p className="mt-1 text-[15px]">One account for reading, buying and your shelf.</p>
        </div>
      </section>
      <form onSubmit={submit} className="mt-6 space-y-4">
        <label className="block">
          <span className="label mb-1 block">Mobile number</span>
          <div className="flex gap-2">
            <span className="input flex w-[68px] items-center justify-center font-bold text-muted">+91</span>
            <input className="input text-[17px] font-semibold tracking-wide" inputMode="numeric" autoComplete="tel-national" maxLength={10} placeholder="98765 43210" value={phone}
              onChange={(e) => setPhone(e.target.value.replace(/\D/g, ""))} disabled={step === "otp"} autoFocus />
          </div>
        </label>
        {step === "otp" && (
          <label className="block">
            <span className="label mb-1 block">Code sent to +91 {phone}</span>
            <input className="input text-center text-[22px] font-bold tracking-[.6em]" inputMode="numeric" autoComplete="one-time-code" maxLength={6} value={otp}
              onChange={(e) => setOtp(e.target.value.replace(/\D/g, ""))} autoFocus />
            <span className="mt-1.5 block text-[13px] text-muted">This prototype doesn't send texts. Enter <b className="text-fg">123456</b>.</span>
          </label>
        )}
        {err && <p className="text-[14px] font-semibold text-bad">{err}</p>}
        <button className="btn-primary w-full text-[16px]" disabled={busy || phone.length !== 10 || (step === "otp" && otp.length !== 6)}>
          {busy ? "One moment…" : step === "phone" ? "Send OTP" : "Verify & continue"}
        </button>
        {step === "otp" && <button type="button" className="w-full text-[14px] font-semibold text-muted underline underline-offset-2" onClick={() => { setStep("phone"); setOtp(""); }}>Use a different number</button>}
      </form>
      <div className="mt-6 rounded-panel border border-dashed border-line p-4 text-[13.5px] leading-relaxed text-muted">
        <button type="button" onClick={asAarav} disabled={busy} className="btn-ink mb-3 w-full text-[15px]">Continue as Aarav, the demo fan</button>
        Or sign in with a number: <b className="text-fg">9876543210</b> is Aarav too (₹50 in the wallet), <b className="text-fg">9999999999</b> is Torii staff. Any other number makes a new account.
      </div>
      <a href="/partner" className="mt-3 flex min-h-[56px] items-center gap-3 rounded-panel border border-line bg-card px-4 transition hover:border-fg/30">
        <span className="min-w-0 flex-1">
          <span className="block text-[14.5px] font-bold">Are you a publisher? <span className="font-normal text-muted" lang="ja">出版社の方へ</span></span>
          <span className="block text-[13px] text-muted">Bring your manga to Torii in the Partner Portal</span>
        </span>
        <span aria-hidden className="text-[18px]">→</span>
      </a>
    </div>
  );
}
