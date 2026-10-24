import { z } from "zod";
import { route, json } from "@/lib/api";
import { requireApiUser } from "@/lib/auth";
import { audit, setCostAssumptions, setPlatformTerms } from "@/lib/domain/core";
import { badRequest } from "@/lib/errors";

const Schema = z.object({
  terms: z.object({ creatorBps: z.number().int().min(0).max(5000), platformBps: z.number().int().min(0).max(5000) }),
  costs: z.object({
    productionMinor: z.record(z.string(), z.number().int().min(0)),
    packagingMinor: z.number().int().min(0),
    shippingCostMinor: z.number().int().min(0),
    paymentFeeBps: z.number().int().min(0).max(2000),
  }),
});

export const PUT = route(async (req) => {
  const user = await requireApiUser("operator");
  const parsed = Schema.safeParse(await json(req));
  if (!parsed.success) throw badRequest("Check the values", parsed.error.issues);
  setPlatformTerms(parsed.data.terms);
  setCostAssumptions(parsed.data.costs);
  audit(user.id, "settings.updated", "settings", "platform", parsed.data);
  return { ok: true };
});
