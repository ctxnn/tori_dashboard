import Link from "next/link";
import { headers } from "next/headers";
import { notFound } from "next/navigation";
import QRCode from "qrcode";
import { read } from "@/store/lib/db";
import { requireUser } from "@/store/lib/auth";
import { fmtDate, inr } from "@/store/lib/format";
import { IconCheck } from "@/store/components/Icons";

export const dynamic = "force-dynamic";
export const metadata = { title: "Order" };

export default async function OrderPage({ params: paramsIn, searchParams: searchParamsIn }: { params: Promise<{ id: string }>; searchParams: Promise<{ new?: string }> }) { const params = await paramsIn; const searchParams = await searchParamsIn;
  const user = await requireUser(`/store/orders/${params.id}`);
  const db = await read();
  const o = db.orders.find((x) => x.id === params.id && x.userId === user.id);
  if (!o) notFound();
  const h = await headers();
  const origin = `${h.get("x-forwarded-proto") ?? "http"}://${h.get("host")}`;
  const codes = o.items.flatMap((i) => i.tagCodes.map((code) => ({ code, title: i.title, tag: db.tags.find((t) => t.code === code) })));
  const qrs = await Promise.all(codes.map((c) => QRCode.toDataURL(`${origin}/verify?code=${c.code}`, { margin: 1, width: 220 })));
  return (
    <div className="space-y-4">
      {searchParams.new && (
        <div className="panel paper-band flex items-center gap-3 p-4">
          <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full border border-line bg-ok text-white"><IconCheck className="h-6 w-6" /></span>
          <div><div className="text-[19px] font-bold tracking-[-0.02em] leading-tight">Order placed</div><div className="text-[14px]">Paid with UPI. Arrives {o.eta}.</div></div>
        </div>
      )}
      <div className="card space-y-2 p-4 text-[14.5px]">
        <div className="flex justify-between"><span className="font-bold">Order {o.id}</span><span className="font-bold text-ok">{o.status}</span></div>
        <div className="text-[13px] text-muted">Placed {fmtDate(o.createdAt)}. Payment reference {o.paymentRef}.</div>
        <div>{o.name}, {o.address}, {o.city ? `${o.city} region, ` : ""}{o.state} {o.pincode}</div>
        <div className="divide-y divide-line border-t border-line pt-1">
          {o.items.map((i) => (
            <div key={i.id} className="flex justify-between gap-3 py-2">
              <span>{i.title} × {i.qty}{i.editionNos.length > 0 && <span className="ml-1 rounded bg-accentsoft px-1.5 text-xs font-bold text-accent">{i.editionNos.map((n) => `#${String(n).padStart(4, "0")}`).join(", ")}</span>}</span>
              <span className="font-semibold">{inr(i.price * i.qty)}</span>
            </div>
          ))}
        </div>
        <div className="flex items-center justify-between border-t border-line pt-2 font-bold"><span>Total</span><span className="price text-[20px]">{inr(o.total)}</span></div>
      </div>
      <section>
        <h2 data-reveal="lines" className="h-section">Authenticity codes in your parcel</h2>
        <p className="mb-3 mt-1 text-[13.5px] text-muted">Each item ships with one of these on its tag or inside cover. For this demo, scan one with another phone, or tap it.</p>
        <div className="grid grid-cols-2 gap-2 ">
          {codes.slice(0, 24).map((c, i) => (
            <Link key={c.code} href={`/verify?code=${c.code}`} className="card p-2.5 text-center hover:border-ink">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={qrs[i]} alt={`QR for ${c.title}`} className="mx-auto w-full max-w-[150px] rounded bg-white p-1" />
              <div className="mt-1 line-clamp-1 text-[11px] font-semibold">{c.title}{c.tag?.editionNo ? ` #${String(c.tag.editionNo).padStart(4, "0")}` : ""}</div>
              <div className="text-[10.5px] font-semibold tracking-wide text-muted">{c.code}</div>
            </Link>
          ))}
        </div>
        {codes.length > 24 && <p className="mt-2 text-xs text-muted">+{codes.length - 24} more tags</p>}
      </section>
    </div>
  );
}
