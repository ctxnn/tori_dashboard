import { NextResponse, type NextRequest } from "next/server";
import { LANG_COOKIE } from "@/lib/i18n-shared";

/** GET /api/lang?lang=en|ja&next=/path switches the owner workspace and Partner Portal language. */
export function GET(req: NextRequest) {
  const lang = req.nextUrl.searchParams.get("lang") === "ja" ? "ja" : "en";
  const next = req.nextUrl.searchParams.get("next") ?? "/";
  const target = next.startsWith("/") && !next.startsWith("//") ? next : "/";
  const res = new NextResponse(null, { status: 303, headers: { Location: target } });
  res.cookies.set(LANG_COOKIE, lang, { path: "/", maxAge: 60 * 60 * 24 * 365, sameSite: "lax" });
  return res;
}
