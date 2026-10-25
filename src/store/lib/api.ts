import "server-only";
import { NextResponse } from "next/server";
export const ok = (data: unknown = { ok: true }) => NextResponse.json(data);
export const fail = (error: string, status = 400) => NextResponse.json({ error }, { status });
export async function body<T = Record<string, unknown>>(req: Request): Promise<T> {
  try { return (await req.json()) as T; } catch { return {} as T; }
}
