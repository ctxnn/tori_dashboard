"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { api } from "@/components/client-api";
import { Button, Notice, buttonClass } from "@/components/ui";

interface Result {
  result: { outcome: string; detail: string };
  returnUrl: string;
  status: string;
}

export function SimulatorActions({ paymentRef, status, returnUrl, amount }: { paymentRef: string; status: string; returnUrl: string; amount: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState<string | null>(null);
  const [log, setLog] = useState<{ action: string; outcome: string; detail: string }[]>([]);
  const [error, setError] = useState<string | null>(null);

  async function act(action: "succeed" | "fail" | "resend") {
    setBusy(action);
    setError(null);
    try {
      const r = await api<Result>(`/api/simulator/${paymentRef}`, { action });
      setLog((l) => [{ action, outcome: r.result.outcome, detail: r.result.detail }, ...l]);
      if (action === "succeed" && r.result.outcome === "processed") {
        router.push(r.returnUrl);
        return;
      }
      router.refresh();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="space-y-3">
      {status === "open" ? (
        <>
          <Button size="lg" className="w-full" onClick={() => act("succeed")} disabled={!!busy}>
            {busy === "succeed" ? "Simulating…" : `Simulate successful payment of ${amount}`}
          </Button>
          <Button variant="secondary" className="w-full" onClick={() => act("fail")} disabled={!!busy}>
            {busy === "fail" ? "Simulating…" : "Simulate a declined payment"}
          </Button>
        </>
      ) : (
        <>
          <Notice tone={status === "succeeded" ? "ok" : "fail"}>
            {status === "succeeded" ? "This simulated payment succeeded." : "This simulated payment was declined."}
          </Notice>
          <Button variant="secondary" className="w-full" onClick={() => act("resend")} disabled={!!busy}>
            {busy === "resend" ? "Resending…" : "Resend the same webhook event (duplicate test)"}
          </Button>
          <Link href={returnUrl} className={buttonClass("primary", "md") + " w-full"}>
            Return to your order
          </Link>
        </>
      )}
      {error && <Notice tone="fail">{error}</Notice>}
      {log.length > 0 && (
        <ul className="space-y-1 text-xs" aria-live="polite">
          {log.map((l, i) => (
            <li key={i} className="rounded-lg bg-ivory px-3 py-2">
              <span className="font-medium">{l.action}</span> → Torii responded <span className="font-mono">{l.outcome}</span>: {l.detail}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
