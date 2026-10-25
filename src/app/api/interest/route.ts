import { route, json } from "@/lib/api";
import { currentUser } from "@/lib/auth";
import { recordInterest } from "@/lib/domain/audience";

// Public: anyone can answer the fan pulse. A signed-in fan also follows the property.
export const POST = route(async (req) => {
  const user = await currentUser();
  return recordInterest(await json(req), user);
});
