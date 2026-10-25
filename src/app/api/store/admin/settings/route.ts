import { mutate } from "@/store/lib/db";
import { currentUser } from "@/store/lib/auth";
import { body, fail, ok } from "@/store/lib/api";
export async function POST(req: Request) {
  if (!(await currentUser())?.isAdmin) return fail("Publisher access only", 403);
  const { readingMode } = await body<{ readingMode: string }>(req);
  if (readingMode !== "free" && readingMode !== "paid") return fail("Invalid mode");
  await mutate((db) => { db.settings.readingMode = readingMode; });
  return ok({ readingMode });
}
