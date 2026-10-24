import { route, json } from "@/lib/api";
import { requireApiUser } from "@/lib/auth";
import { requestRefund } from "@/lib/domain/refunds";

type Ctx = { params: Promise<{ id: string }> };

export const POST = route(async (req, { params }: Ctx) => {
  const user = await requireApiUser("operator");
  const { id } = await params;
  const { reason } = await json<{ reason?: string }>(req);
  const order = await requestRefund({ orderId: id, actor: user, reason: reason?.trim() || "Refunded at the fan’s request" });
  return { order: { ref: order.public_ref, status: order.status } };
});
