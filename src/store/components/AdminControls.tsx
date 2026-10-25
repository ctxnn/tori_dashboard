"use client";
import { useRouter } from "next/navigation";
import { useState } from "react";

export default function AdminControls({ mode, slugs, overrides }: { mode: "free" | "paid"; slugs: { slug: string; title: string }[]; overrides: { title: string; slug: string; number: number; free: boolean }[] }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [slug, setSlug] = useState(slugs[0]?.slug ?? "");
  const [num, setNum] = useState("10");
  const [msg, setMsg] = useState("");
  async function setMode(m: "free" | "paid") {
    setBusy(true);
    await fetch("/api/store/admin/settings", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ readingMode: m }) });
    setBusy(false); router.refresh();
  }
  async function override(free: boolean | null, s = slug, n = Number(num)) {
    const r = await fetch("/api/store/admin/chapter", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ slug: s, number: n, free }) });
    const j = await r.json();
    setMsg(r.ok ? `${j.title} ch. ${j.number}: ${j.freeOverride === null ? "follows reading mode" : j.freeOverride ? "always free" : "always paid"}` : j.error);
    router.refresh();
  }
  async function reset() {
    if (!window.confirm("Reset all demo accounts, carts, orders and unlocks to the starting state?")) return;
    await fetch("/api/store/admin/reset", { method: "POST" });
    location.href = "/login?next=/publisher";
  }
  return (
    <div className="grid gap-3 ">
      <div className="card p-4">
        <div className="label">Reading mode</div>
        <div className="mt-2 flex rounded-xl border border-line p-1 dark:border-line">
          {(["free", "paid"] as const).map((m) => (
            <button key={m} disabled={busy} onClick={() => setMode(m)} className={`flex-1 rounded-lg py-2.5 text-[14px] font-bold ${mode === m ? "bg-ink text-white dark:bg-fg dark:text-bg" : "text-muted"}`}>
              {m === "free" ? "Free launch" : "Paid, ₹9 a chapter"}
            </button>
          ))}
        </div>
        <button className="mt-3 text-xs text-muted underline" onClick={reset}>Reset demo data</button>
        <p className="mt-2 text-xs text-muted">{mode === "free" ? "Every chapter is free. Use this to build the audience at launch." : "First 3 chapters of each series stay free; the rest are ₹9. Unlocked chapters stay unlocked."}</p>
      </div>
      <div className="card p-4">
        <div className="label">Per-chapter override</div>
        <div className="mt-2 flex gap-2">
          <select className="input" value={slug} onChange={(e) => setSlug(e.target.value)} aria-label="Series">{slugs.map((s) => <option key={s.slug} value={s.slug}>{s.title}</option>)}</select>
          <input className="input w-20" inputMode="numeric" value={num} onChange={(e) => setNum(e.target.value.replace(/\D/g, ""))} aria-label="Chapter number" />
        </div>
        <div className="mt-2 flex gap-2">
          <button className="btn-ghost flex-1 py-2" onClick={() => override(true)}>Always free</button>
          <button className="btn-ghost flex-1 py-2" onClick={() => override(false)}>Always paid</button>
          <button className="btn-ghost flex-1 py-2" onClick={() => override(null)}>Reset</button>
        </div>
        {msg && <p className="mt-2 text-xs text-ok">{msg}</p>}
        {overrides.length > 0 && <div className="mt-2 flex flex-wrap gap-1">{overrides.map((o) => (
          <button key={o.slug + o.number} className="chip" title="Reset" onClick={() => override(null, o.slug, o.number)}>{o.title} ch.{o.number} · {o.free ? "free" : "paid"} ✕</button>
        ))}</div>}
      </div>
    </div>
  );
}
