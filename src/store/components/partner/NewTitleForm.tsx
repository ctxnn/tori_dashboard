"use client";
import { useState } from "react";

export default function NewTitleForm() {
  const [title, setTitle] = useState("");
  const [titleJa, setTitleJa] = useState("");
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);
  async function submit(e: React.FormEvent) {
    e.preventDefault(); setBusy(true); setErr("");
    const r = await fetch("/api/partner/submissions", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ title, titleJa }) });
    const j = await r.json().catch(() => ({}));
    if (!r.ok) { setBusy(false); setErr(j.error || "Couldn't create the title"); return; }
    location.href = `/partner/titles/${j.id}`;
  }
  return (
    <form onSubmit={submit} className="card max-w-2xl space-y-4 p-6">
      <label className="block"><span className="field-label">Title in English <span className="jp font-normal text-muted">英語タイトル</span></span>
        <input className="input text-[17px] font-semibold" value={title} onChange={(e) => setTitle(e.target.value)} maxLength={120} required autoFocus placeholder="e.g. Lanterns of Kyoto Station" /></label>
      <label className="block"><span className="field-label">Original Japanese title <span className="jp font-normal text-muted">原題</span></span>
        <input className="input jp" lang="ja" value={titleJa} onChange={(e) => setTitleJa(e.target.value)} maxLength={120} placeholder="例：京都駅のランタン" /></label>
      {err && <p role="alert" className="text-[14px] font-semibold text-bad">{err}</p>}
      <div className="flex items-center gap-3">
        <button className="btn-primary" disabled={busy || !title.trim()}>{busy ? "Creating…" : "Create draft"}</button>
        <span className="text-[13.5px] text-muted">Next: details, cover, rights and chapters.</span>
      </div>
    </form>
  );
}
