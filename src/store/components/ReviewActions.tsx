"use client";
import { useRouter } from "next/navigation";
import { useState } from "react";

/** Torii staff decide on a partner title: approve, ask for changes, or reject. */
export default function ReviewActions({ id, status, verified, orgId, slug }: { id: string; status: string; verified: boolean; orgId: string; slug: string }) {
  const router = useRouter();
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  async function act(action: string) {
    setBusy(true); setMsg(null);
    const r = await fetch(`/api/store/admin/review/${id}`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ action, note }) });
    const j = await r.json().catch(() => ({}));
    setBusy(false);
    if (!r.ok) { setMsg({ ok: false, text: j.error }); return; }
    setNote("");
    setMsg({ ok: true, text: action === "approve" ? "Approved. The series is live in Read." : action === "reject" ? "Rejected. The publisher has been told why." : "Sent back to the publisher with your note." });
    router.refresh();
  }
  async function verify() {
    setBusy(true);
    await fetch(`/api/store/admin/partners/${orgId}`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ verified: true }) });
    setBusy(false); router.refresh();
  }
  return (
    <div className="panel space-y-3 p-4">
      <div className="label">Your decision</div>
      {!verified && (
        <div className="rounded-xl border border-warn/30 bg-warn/10 p-3 text-[13.5px]">
          <b className="text-warn">Publisher not verified.</b> Check the company and its rights before approving titles.
          <button className="btn-ghost mt-2 min-h-[38px] w-full text-[13.5px]" onClick={verify} disabled={busy}>Mark publisher as verified</button>
        </div>
      )}
      {(status === "submitted" || status === "approved") && (
        <textarea className="input min-h-[84px] py-2.5 text-[14px]" placeholder={status === "approved" ? "Why is it being taken down? The publisher sees this." : "Note for the publisher (needed to request changes or reject)"} value={note} onChange={(e) => setNote(e.target.value)} maxLength={1000} />
      )}
      {status === "submitted" && (
        <div className="grid gap-2">
          <button className="btn-primary" disabled={busy || !verified} onClick={() => act("approve")}>Approve and publish</button>
          <div className="grid grid-cols-2 gap-2">
            <button className="btn-ghost" disabled={busy || note.trim().length < 5} onClick={() => act("changes")}>Ask for changes</button>
            <button className="btn-ghost text-bad" disabled={busy || note.trim().length < 5} onClick={() => act("reject")}>Reject</button>
          </div>
        </div>
      )}
      {status === "approved" && (
        <div className="grid gap-2">
          <a href={`/read/${slug}`} className="btn-ink">Open in Read</a>
          <button className="btn-ghost text-bad" disabled={busy || note.trim().length < 5} onClick={() => act("changes")}>Take down and ask for changes</button>
        </div>
      )}
      {(status === "draft" || status === "changes_requested" || status === "rejected") && <p className="text-[13.5px] text-muted">Nothing to decide: the title is with the publisher.</p>}
      {msg && <p role="alert" className={`text-[13.5px] font-semibold ${msg.ok ? "text-ok" : "text-bad"}`}>{msg.text}</p>}
    </div>
  );
}
