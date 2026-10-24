import { route, json } from "@/lib/api";
import { getSimPayment, simulatorComplete, simulatorResend } from "@/lib/domain/payments/simulator";
import { badRequest, notFound } from "@/lib/errors";

type Ctx = { params: Promise<{ ref: string }> };

// Buttons on the simulator's hosted checkout page. This stands in for the
// provider's own UI; Torii only learns the outcome through the signed event.
export const POST = route(async (req, { params }: Ctx) => {
  const { ref } = await params;
  const p = getSimPayment(ref);
  if (!p) throw notFound("Simulated payment");
  const { action } = await json<{ action: string }>(req);
  let result;
  if (action === "succeed") result = await simulatorComplete(ref, "succeeded");
  else if (action === "fail") result = await simulatorComplete(ref, "failed");
  else if (action === "resend") result = await simulatorResend(ref);
  else throw badRequest("Unknown simulator action");
  return { result, returnUrl: p.return_url, status: getSimPayment(ref)!.status };
});
