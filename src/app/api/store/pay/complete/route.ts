import { mutate } from "@/store/lib/db";
import { currentUser } from "@/store/lib/auth";
import { body, fail, ok } from "@/store/lib/api";
import { PayError, fulfil, razorpayEnabled, razorpayVerify, type Purpose } from "@/store/lib/payments";

export async function POST(req: Request) {
  const user = await currentUser();
  if (!user) return fail("Please sign in", 401);
  const { purpose, payload, payment } = await body<{ purpose: Purpose; payload: Record<string, unknown>; payment: Record<string, string> }>(req);
  let ref = "";
  if (razorpayEnabled()) {
    if (payment?.mode !== "razorpay" || !razorpayVerify(payment.razorpay_order_id, payment.razorpay_payment_id, payment.razorpay_signature))
      return fail("Payment signature could not be verified");
    ref = payment.razorpay_payment_id;
  } else {
    ref = String(payment?.ref || "MOCK");
  }
  try {
    return ok(await mutate((db) => fulfil(db, user, purpose, payload || {}, ref)));
  } catch (e) {
    return fail(e instanceof PayError ? e.message : "Payment could not be completed");
  }
}
