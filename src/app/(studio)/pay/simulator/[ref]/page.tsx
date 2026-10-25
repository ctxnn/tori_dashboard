import { notFound } from "next/navigation";
import { getSimPayment } from "@/lib/domain/payments/simulator";
import { formatINR } from "@/lib/money";
import { SimulatorActions } from "./actions";

export const metadata = { title: "Payment simulator (test mode)" };

// This page imitates a payment provider's hosted checkout. It's deliberately
// styled differently from Torii so it never looks like a real payment screen.
export default async function SimulatorPage({ params }: { params: Promise<{ ref: string }> }) {
  const { ref } = await params;
  const p = getSimPayment(ref);
  if (!p) notFound();
  return (
    <div className="mx-auto max-w-lg">
      <div className="overflow-hidden rounded-2xl border-2 border-dashed border-gold bg-white shadow-lg">
        <div className="bg-[repeating-linear-gradient(135deg,#f4e8cf_0_12px,#fbf3e1_12px_24px)] px-6 py-4">
          <div className="text-xs font-bold uppercase tracking-[0.2em] text-[#7a5a22]">Test mode · Payment simulator</div>
          <p className="mt-1 text-sm text-[#7a5a22]">No real money moves. Nothing here asks for card or bank details.</p>
        </div>
        <div className="space-y-5 p-6">
          <div>
            <div className="text-sm text-moss">Paying Torii (test merchant)</div>
            <div className="mt-1 font-display text-4xl font-semibold tabular-nums">{formatINR(p.amount_minor)}</div>
            <div className="mt-1 text-sm text-ink-2">{p.description}</div>
          </div>
          <dl className="space-y-1 rounded-xl bg-ivory px-4 py-3 text-xs">
            <div className="flex justify-between gap-2"><dt className="text-moss">Simulated payment</dt><dd className="font-mono">{p.ref}</dd></div>
            <div className="flex justify-between gap-2"><dt className="text-moss">Status at simulator</dt><dd className="font-medium">{p.status}</dd></div>
          </dl>
          <SimulatorActions paymentRef={p.ref} status={p.status} returnUrl={p.return_url} amount={formatINR(p.amount_minor)} />
          <details className="text-xs text-moss">
            <summary className="cursor-pointer font-medium text-ink-2">What happens when you click</summary>
            <p className="mt-2 leading-relaxed">
              The simulator records the outcome, then sends Torii a signed event exactly as a real provider’s webhook would. Torii verifies the signature, stores the event once, and only then marks the order paid. Sending the same event again is recognised as a duplicate and changes nothing.
            </p>
          </details>
        </div>
      </div>
    </div>
  );
}
