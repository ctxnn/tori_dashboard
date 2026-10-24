import { route, json } from "@/lib/api";
import { HttpError } from "@/lib/errors";
import { resetDemo } from "@/lib/seed";

// Resets only the local demo database and uploads. Disabled with DEMO_RESET=off.
export const POST = route(async (req) => {
  if (process.env.DEMO_RESET === "off") throw new HttpError(403, "Demo reset is turned off on this deployment");
  const { confirm } = await json<{ confirm?: string }>(req);
  if (confirm !== "reset") throw new HttpError(400, "Type “reset” to confirm");
  await resetDemo();
  return { ok: true };
});
