import { NextResponse } from "next/server";
import { receiveProviderEvent } from "@/lib/domain/payments/processor";

type Ctx = { params: Promise<{ provider: string }> };

// Webhook endpoint for payment providers. The signature is checked over the raw
// body before anything is parsed; duplicates are acknowledged without effect.
export async function POST(req: Request, { params }: Ctx) {
  const { provider } = await params;
  if (provider !== (process.env.PAYMENT_PROVIDER ?? "simulator")) {
    return NextResponse.json({ error: "Unknown payment provider" }, { status: 404 });
  }
  const raw = await req.text();
  try {
    const r = await receiveProviderEvent(provider, raw, req.headers.get("x-torii-signature"));
    return NextResponse.json(r, { status: r.outcome === "rejected" ? 400 : 200 });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Webhook processing failed" }, { status: 500 });
  }
}
