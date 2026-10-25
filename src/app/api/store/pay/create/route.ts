import { read } from "@/store/lib/db";
import { currentUser } from "@/store/lib/auth";
import { body, fail, ok } from "@/store/lib/api";
import { PayError, quote, razorpayCreateOrder, razorpayEnabled, type Purpose } from "@/store/lib/payments";

export async function POST(req: Request) {
  const user = await currentUser();
  if (!user) return fail("Please sign in", 401);
  const { purpose, payload } = await body<{ purpose: Purpose; payload: Record<string, unknown> }>(req);
  if (!["unlock", "topup", "order"].includes(purpose)) return fail("Unknown payment");
  try {
    const q = quote((await read()), user, purpose, payload || {});
    if (razorpayEnabled()) {
      const o = await razorpayCreateOrder(q.amount, `${purpose}_${Date.now()}`);
      return ok({ ...q, mode: "razorpay", key: process.env.RAZORPAY_KEY_ID, orderId: o.id });
    }
    return ok({ ...q, mode: "mock" });
  } catch (e) {
    return fail(e instanceof PayError ? e.message : "Could not start payment");
  }
}
