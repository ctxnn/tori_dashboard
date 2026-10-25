import { mutate } from "@/store/lib/db";
import { currentUser } from "@/store/lib/auth";
import { body, fail, ok } from "@/store/lib/api";
import { PayError, unlockChapter } from "@/store/lib/payments";

export async function POST(req: Request) {
  const user = await currentUser();
  if (!user) return fail("Please sign in", 401);
  const { chapterId } = await body<{ chapterId: string }>(req);
  try {
    return ok(await mutate((db) => unlockChapter(db, db.users.find((u) => u.id === user.id)!, chapterId, "wallet")));
  } catch (e) {
    return fail(e instanceof PayError ? e.message : "Unlock failed");
  }
}
