import { cookies } from "next/headers";
import { currentUser } from "./auth";
import { LANG_COOKIE, makeT, type Lang, type T } from "./i18n-shared";

/**
 * Japanese is offered where Japanese rights holders work: the IP owner's side of the workspace
 * and the Partner Portal. Creators, operations and the fan app stay in English.
 */
export async function langFor(scope: "owner" | "partner"): Promise<Lang> {
  if ((await cookies()).get(LANG_COOKIE)?.value !== "ja") return "en";
  if (scope === "partner") return "ja";
  return (await currentUser())?.role === "owner" ? "ja" : "en";
}

export async function getT(scope: "owner" | "partner" = "owner"): Promise<T> {
  return makeT(await langFor(scope));
}
