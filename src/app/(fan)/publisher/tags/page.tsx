import Link from "next/link";
import { headers } from "next/headers";
import QRCode from "qrcode";
import { read } from "@/store/lib/db";
import { requireAdmin } from "@/store/lib/auth";

export const dynamic = "force-dynamic";
export const metadata = { title: "Demo tags" };
const FAKE = "T1-FAKE7777-ABCDEFGH";

export default async function Tags() {
  await requireAdmin();
  const db = await read();
  const h = await headers();
  const origin = `${h.get("x-forwarded-proto") ?? "http"}://${h.get("host")}`;
  const demo = [
    { label: "Genuine · unregistered", note: "First scan registers it to the signed-in user", code: db.tags.find((t) => t.code.startsWith("T1-GENUINE1"))?.code },
    { label: "Genuine · volume", note: "Jujutsu Kaisen Vol. 1", code: db.tags.find((t) => t.code.startsWith("T1-GENUINE2"))?.code },
    { label: "Already registered", note: "Registered in Lucknow on 12 Mar 2026 — shows as a likely copy", code: db.tags.find((t) => t.code.startsWith("T1-CLAIMED1"))?.code },
    { label: "Fake", note: "Signature doesn't match — not issued by Torii", code: FAKE },
  ].filter((d) => d.code) as { label: string; note: string; code: string }[];
  const qrs = await Promise.all(demo.map((d) => QRCode.toDataURL(`${origin}/verify?code=${d.code}`, { margin: 1, width: 260 })));
  const recent = db.tags.filter((t) => !t.code.includes("GENUINE") && !t.code.includes("CLAIMED")).slice(-8).reverse();
  return (
    <div className="space-y-4">
      <div><div className="label">Demo</div><h1 className="h-title">Authenticity codes</h1>
        <p className="text-sm text-muted">Scan these with a phone camera, or open them in Verify. Re-run <code>npm run seed</code> to reset their state.</p></div>
      <div className="grid grid-cols-2 gap-3 ">
        {demo.map((d, i) => (
          <Link key={d.code} href={`/verify?code=${d.code}`} className="card p-3 text-center">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={qrs[i]} alt={d.label} className="mx-auto w-full max-w-[180px] rounded bg-white p-1" />
            <div className="mt-2 text-sm font-bold">{d.label}</div>
            <div className="text-xs text-muted">{d.note}</div>
            <div className="mt-1 font-semibold tracking-wide text-[10px]">{d.code}</div>
          </Link>
        ))}
      </div>
      {recent.length > 0 && (
        <div className="card p-4">
          <div className="mb-2 font-bold">Recently minted (from orders)</div>
          <div className="divide-y divide-line text-sm">{recent.map((t) => (
            <div key={t.code} className="flex justify-between gap-2 py-1.5"><span className="truncate">{t.title}{t.editionNo ? ` #${String(t.editionNo).padStart(4, "0")}` : ""}</span><span className="font-semibold tracking-wide text-xs text-muted">{t.code}</span><span className={t.ownerId ? "text-ok" : "text-muted"}>{t.ownerId ? "registered" : "unregistered"}</span></div>
          ))}</div>
        </div>
      )}
      <Link href="/publisher" className="btn-ghost">Back to the dashboard</Link>
    </div>
  );
}
