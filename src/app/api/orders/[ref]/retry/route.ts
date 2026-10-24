import { route, json } from "@/lib/api";
import { currentUser } from "@/lib/auth";
import { requireOrderAccess, startPayment } from "@/lib/domain/orders";

type Ctx = { params: Promise<{ ref: string }> };

export const POST = route(async (req, { params }: Ctx) => {
  const { ref } = await params;
  const { t } = await json<{ t?: string }>(req);
  const order = requireOrderAccess(ref, t ?? null, await currentUser());
  return { checkoutUrl: await startPayment(order) };
});
