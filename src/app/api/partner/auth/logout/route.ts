import { clearPartnerSession } from "@/store/lib/partner-auth";
import { clearSessionCookie } from "@/lib/auth";
import { ok } from "@/store/lib/api";
// Also ends the demo identity, which otherwise reopens the portal for an IP owner.
export async function POST() { await clearPartnerSession(); await clearSessionCookie(); return ok(); }
