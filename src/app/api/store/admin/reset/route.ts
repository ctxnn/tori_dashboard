import { resetState } from "@/store/lib/db";
import { currentUser } from "@/store/lib/auth";
import { fail, ok } from "@/store/lib/api";
// Resets accounts, carts, orders, unlocks and tags to the seeded demo state. The catalogue is untouched.
export async function POST() {
  if (!(await currentUser())?.isAdmin) return fail("Publisher access only", 403);
  await resetState();
  return ok();
}
