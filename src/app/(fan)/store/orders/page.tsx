import Link from "next/link";
import RevealScope from "@/store/components/RevealScope";
import { read } from "@/store/lib/db";
import { requireUser } from "@/store/lib/auth";
import { fmtDate, inr } from "@/store/lib/format";
export const dynamic = "force-dynamic";
export const metadata = { title: "Orders" };
export default async function Orders() {
  const user = await requireUser("/store/orders");
  const orders = (await read()).orders.filter((o) => o.userId === user.id).reverse();
  return (
    <div className="space-y-3">
      <h1 className="h-title">Orders</h1>
      {!orders.length && <div className="panel p-6 text-center"><p className="font-bold">No orders yet.</p><a href="/manga" className="btn-primary mt-3">Shop manga</a></div>}
      {orders.map((o) => (
        <Link key={o.id} href={`/store/orders/${o.id}`} className="card block p-4">
          <div className="flex justify-between text-[14px]"><span className="font-bold">Order {o.id}</span><span className="font-bold text-ok">{o.status}</span></div>
          <div className="mt-1 line-clamp-1 text-[14.5px]">{o.items.map((i) => i.title).join(", ")}</div>
          <div className="mt-1.5 flex justify-between text-[13px] text-muted"><span>Placed {fmtDate(o.createdAt)}, arrives {o.eta}</span><span className="price text-[15px] text-fg">{inr(o.total)}</span></div>
        </Link>
      ))}
      <RevealScope />
    </div>
  );
}
