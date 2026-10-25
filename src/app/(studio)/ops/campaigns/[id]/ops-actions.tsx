"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { api } from "@/components/client-api";
import { Button, Card, Notice, Textarea } from "@/components/ui";

interface Props {
  campaignId: string;
  salesStatus: string;
  thresholdMet: boolean;
  deadlinePassed: boolean;
  paidUnits: number;
  threshold: number;
  toShip: number;
  toDeliver: number;
  refundable: number;
  hasShipped: boolean;
}

export function OpsActions(p: Props) {
  const router = useRouter();
  const [busy, setBusy] = useState<string | null>(null);
  const [msg, setMsg] = useState<{ tone: "ok" | "fail" | "info"; text: string } | null>(null);
  const [reason, setReason] = useState(p.deadlinePassed && !p.thresholdMet ? "Threshold not reached by the deadline" : "");
  const [confirmCancel, setConfirmCancel] = useState(false);

  async function run(action: string, body: object = {}, describe: (r: Record<string, unknown>) => string) {
    setBusy(action);
    setMsg(null);
    try {
      const r = await api<Record<string, unknown>>(`/api/ops/campaigns/${p.campaignId}/${action}`, body);
      setMsg({ tone: "ok", text: describe(r) });
      setConfirmCancel(false);
      router.refresh();
    } catch (e) {
      setMsg({ tone: "fail", text: (e as Error).message });
    } finally {
      setBusy(null);
    }
  }

  const live = p.salesStatus === "live";
  const released = p.salesStatus === "production_released";
  const cancellable = ["live", "production_released", "cancelling"].includes(p.salesStatus) && !p.hasShipped;

  return (
    <Card className="space-y-5 p-5">
      <h2 className="text-base font-semibold">Decisions</h2>

      {live && (
        <section className="space-y-2">
          <div className="text-sm font-medium">Production release</div>
          <p className="text-sm text-moss">
            {p.thresholdMet
              ? `${p.paidUnits} paid units meets the threshold of ${p.threshold}. Releasing closes preorders and moves paid orders into production.`
              : `Not eligible: ${p.paidUnits} of ${p.threshold} paid units.`}
          </p>
          <Button className="w-full" disabled={!p.thresholdMet || !!busy} onClick={() => run("release", {}, (r) => `Released to production. ${r.ordersMoved} paid orders moved into production${Number(r.unpaidVoided) ? `; ${r.unpaidVoided} unpaid checkouts closed` : ""}.`)}>
            {busy === "release" ? "Releasing…" : "Release to production"}
          </Button>
        </section>
      )}

      {released && (
        <section className="space-y-2">
          <div className="text-sm font-medium">Fulfilment</div>
          <p className="text-sm text-moss">Earnings are recorded in the ledger when an order is marked delivered.</p>
          <Button className="w-full" variant="secondary" disabled={!p.toShip || !!busy} onClick={() => run("ship", {}, (r) => `${r.shipped} orders marked shipped.`)}>
            {busy === "ship" ? "Updating…" : `Mark ${p.toShip} order${p.toShip === 1 ? "" : "s"} shipped`}
          </Button>
          <Button className="w-full" disabled={!p.toDeliver || !!busy} onClick={() => run("deliver", {}, (r) => `${r.delivered} orders delivered and posted to the ledger.`)}>
            {busy === "deliver" ? "Updating…" : `Mark ${p.toDeliver} shipped order${p.toDeliver === 1 ? "" : "s"} delivered`}
          </Button>
        </section>
      )}

      {cancellable && (
        <section className="space-y-2 border-t border-sand pt-4">
          <div className="text-sm font-medium text-fail">Cancel and refund</div>
          <p className="text-sm text-moss">
            Closes preorders, voids unpaid orders and refunds all {p.refundable} paid order{p.refundable === 1 ? "" : "s"} in full. Safe to repeat — nothing is refunded twice.
          </p>
          {!confirmCancel ? (
            <Button variant="danger" className="w-full" disabled={!!busy} onClick={() => setConfirmCancel(true)}>
              {p.salesStatus === "cancelling" ? "Retry outstanding refunds" : "Cancel campaign…"}
            </Button>
          ) : (
            <div className="space-y-2 rounded-xl bg-fail-soft/50 p-3">
              <label htmlFor="cancel-reason" className="text-sm font-medium">Reason shown to fans</label>
              <Textarea id="cancel-reason" rows={2} value={reason} onChange={(e) => setReason(e.target.value)} />
              <div className="flex gap-2">
                <Button variant="danger" disabled={!!busy || reason.trim().length < 3} onClick={() => run("cancel", { reason }, (r) => `Cancelled. ${r.refunded} orders refunded, ${r.unpaidCancelled} unpaid orders voided${Number(r.stillPending) ? `, ${r.stillPending} refunds still pending` : ""}.`)}>
                  {busy === "cancel" ? "Refunding…" : "Confirm cancel & refund"}
                </Button>
                <Button variant="ghost" onClick={() => setConfirmCancel(false)}>Keep</Button>
              </div>
            </div>
          )}
        </section>
      )}

      {["cancelled", "completed"].includes(p.salesStatus) && <p className="text-sm text-moss">This campaign is closed. No further actions.</p>}

      <section className="space-y-2 border-t border-sand pt-4">
        <div className="text-sm font-medium">Idempotency check</div>
        <p className="text-sm text-moss">Redeliver every payment and refund event the provider has sent for this campaign. Nothing should change.</p>
        <Button
          variant="secondary"
          className="w-full"
          disabled={!!busy}
          onClick={() =>
            run("replay-events", {}, (r) => {
              const before = r.ledgerBefore as { n: number; total: number };
              const after = r.ledgerAfter as { n: number; total: number };
              return `${r.delivered} events redelivered, ${r.duplicates} recognised as duplicates. Ledger ${r.unchanged ? "unchanged" : "CHANGED"}: ${before.n} → ${after.n} entries.`;
            })
          }
        >
          {busy === "replay-events" ? "Replaying…" : "Replay all provider events"}
        </Button>
      </section>

      {msg && <Notice tone={msg.tone}>{msg.text}</Notice>}
    </Card>
  );
}

export function RefundButton({ orderId, orderRef }: { orderId: string; orderRef: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  async function refund() {
    if (!window.confirm(`Refund ${orderRef} in full?`)) return;
    setBusy(true);
    try {
      await api(`/api/ops/orders/${orderId}/refund`, { reason: "Refunded at the fan’s request" });
      router.refresh();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <span>
      <button onClick={refund} disabled={busy} className="text-xs font-medium text-fail hover:underline disabled:opacity-50">
        {busy ? "Refunding…" : "Refund"}
      </button>
      {error && <span className="block text-xs text-fail">{error}</span>}
    </span>
  );
}
