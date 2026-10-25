"use client";
import { useRouter } from "next/navigation";
import { useState } from "react";
export default function VerifyPartner({ id, verified }: { id: string; verified: boolean }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  return (
    <button className={verified ? "chip text-ok" : "chip border-warn/40 text-warn"} disabled={busy}
      onClick={async () => { setBusy(true); await fetch(`/api/store/admin/partners/${id}`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ verified: !verified }) }); setBusy(false); router.refresh(); }}>
      {verified ? "✓ Verified" : "Verify"}
    </button>
  );
}
