import { cookies } from "next/headers";

/**
 * Which look the workspace and Partner Portal render in. "new" is the soft, glossy redesign
 * (src/components/v2, src/app/v2.css); "classic" is the original print-proof look, kept intact.
 * The fan app has one look and ignores this.
 */
export type UiMode = "new" | "classic";

export const UI_COOKIE = "torii_ui";

export async function uiMode(): Promise<UiMode> {
  return (await cookies()).get(UI_COOKIE)?.value === "classic" ? "classic" : "new";
}
