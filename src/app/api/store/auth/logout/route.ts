import { clearSession } from "@/store/lib/auth";
import { ok } from "@/store/lib/api";
export async function POST() { await clearSession(); return ok(); }
