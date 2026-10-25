import Link from "next/link";
import RevealScope from "@/store/components/RevealScope";
import { read } from "@/store/lib/db";
import { requireUser } from "@/store/lib/auth";
import { cartFor } from "@/store/lib/catalog";
import CartLines from "@/store/components/CartLines";
import { inr } from "@/store/lib/format";

export const dynamic = "force-dynamic";
export const metadata = { title: "Cart" };

export default async function Cart() {
  const user = await requireUser("/cart");
  const { lines, total, count } = cartFor((await read()), user.id);
  if (!lines.length) return (
    <div className="space-y-3 pt-10 text-center">
      <h1 className="h-title">Your cart is empty</h1>
      <p className="text-[15px] text-muted">Books and figures you add will wait for you here.</p>
      <div className="flex justify-center gap-2"><Link href="/manga" data-section="manga" className="btn-primary">Shop manga</Link><Link href="/figures" data-section="figures" className="btn-primary">Shop figures</Link></div>
    </div>
  );
  return (
    <div className="space-y-4">
      <h1 className="h-title">Your cart <span className="text-muted">({count})</span></h1>
      <CartLines lines={lines.map((l) => ({ id: l.id, kind: l.kind, qty: l.qty, title: l.info.title, subtitle: l.info.subtitle, price: l.info.price, color: l.info.color, href: l.info.href, image: l.kind === "figure" ? l.info.figure?.image : l.info.series?.image }))} />
      <div className="card space-y-1.5 p-4 text-[15px]">
        <div className="flex justify-between"><span className="text-muted">Items</span><span>{inr(total)}</span></div>
        <div className="flex justify-between"><span className="text-muted">Delivery</span><span className="text-ok">Free</span></div>
        <div className="flex justify-between border-t border-line pt-2.5 font-bold"><span>Total</span><span className="price text-[22px]">{inr(total)}</span></div>
      </div>
      <Link href="/checkout" className="btn-primary w-full text-[16px]">Checkout, {inr(total)}</Link>
      <RevealScope />
    </div>
  );
}
