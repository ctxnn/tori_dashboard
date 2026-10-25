"use client";
import { useState } from "react";
import { useT } from "@/components/i18n-client";

export default function NewTitleForm() {
  const t = useT();
  const [title, setTitle] = useState("");
  const [titleJa, setTitleJa] = useState("");
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);
  async function submit(e: React.FormEvent) {
    e.preventDefault(); setBusy(true); setErr("");
    const r = await fetch("/api/partner/submissions", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ title, titleJa }) });
    const j = await r.json().catch(() => ({}));
    if (!r.ok) { setBusy(false); setErr(j.error || t("Couldn't create the title", "作品を作成できませんでした。")); return; }
    location.href = `/partner/titles/${j.id}`;
  }
  return (
    <form onSubmit={submit} className="card max-w-2xl space-y-4 p-6">
      <label className="block"><span className="field-label">{t(<>Title in English <span className="jp font-normal text-muted">英語タイトル</span></>, <span className="jp">英語タイトル</span>)}</span>
        <input className="input text-[17px] font-semibold" value={title} onChange={(e) => setTitle(e.target.value)} maxLength={120} required autoFocus placeholder={t("e.g. Lanterns of Kyoto Station", "例：Lanterns of Kyoto Station")} /></label>
      <label className="block"><span className="field-label">{t(<>Original Japanese title <span className="jp font-normal text-muted">原題</span></>, <span className="jp">原題（日本語）</span>)}</span>
        <input className="input jp" lang="ja" value={titleJa} onChange={(e) => setTitleJa(e.target.value)} maxLength={120} placeholder="例：京都駅のランタン" /></label>
      {err && <p role="alert" className="text-[14px] font-semibold text-bad">{err}</p>}
      <div className="flex items-center gap-3">
        <button className="btn-primary" disabled={busy || !title.trim()}>{busy ? t("Creating…", "作成中…") : t("Create draft", "下書きを作成")}</button>
        <span className="text-[13.5px] text-muted">{t("Next: details, cover, rights and chapters.", "次に、作品情報・表紙・権利範囲・各話をご登録いただきます。")}</span>
      </div>
    </form>
  );
}
