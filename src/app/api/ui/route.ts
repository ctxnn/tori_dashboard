import { NextResponse, type NextRequest } from "next/server";
import { UI_COOKIE } from "@/lib/ui-mode";

/** GET /api/ui?mode=new|classic&next=/path switches the look and returns to the same page. */
export function GET(req: NextRequest) {
  const mode = req.nextUrl.searchParams.get("mode") === "classic" ? "classic" : "new";
  const next = req.nextUrl.searchParams.get("next") ?? "/";
  const target = next.startsWith("/") && !next.startsWith("//") ? next : "/";
  const res = new NextResponse(null, { status: 303, headers: { Location: target } });
  res.cookies.set(UI_COOKIE, mode, { path: "/", maxAge: 60 * 60 * 24 * 365, sameSite: "lax" });
  return res;
}
