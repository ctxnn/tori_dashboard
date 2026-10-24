"use client";

import { useState } from "react";
import { api } from "@/components/client-api";
import { Button } from "@/components/ui";

export function RetryPayment({ orderRef, token }: { orderRef: string; token: string }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  async function retry() {
    setBusy(true);
    try {
      const r = await api<{ checkoutUrl: string }>(`/api/orders/${orderRef}/retry`, { t: token });
      window.location.assign(r.checkoutUrl);
    } catch (e) {
      setError((e as Error).message);
      setBusy(false);
    }
  }
  return (
    <span className="mt-2 block">
      <Button size="sm" onClick={retry} disabled={busy}>{busy ? "Starting…" : "Try paying again"}</Button>
      {error && <span className="ml-2 text-fail">{error}</span>}
    </span>
  );
}
