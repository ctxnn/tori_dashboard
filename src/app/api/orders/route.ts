import { route, json } from "@/lib/api";
import { currentUser } from "@/lib/auth";
import { createOrder } from "@/lib/domain/orders";

export const POST = route(async (req) => {
  const user = await currentUser();
  const body = await json(req);
  const { order, checkoutUrl } = await createOrder(body, user);
  return { order: { ref: order.public_ref, status: order.status, totalMinor: order.total_minor }, checkoutUrl };
});
