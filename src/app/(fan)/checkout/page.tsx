import { redirect } from "next/navigation";
import { read } from "@/store/lib/db";
import { requireUser } from "@/store/lib/auth";
import { cartFor } from "@/store/lib/catalog";
import CheckoutForm from "@/store/components/CheckoutForm";

export const dynamic = "force-dynamic";
export const metadata = { title: "Checkout" };

export default async function Checkout() {
  const user = await requireUser("/checkout");
  const db = await read();
  const { lines, total } = cartFor(db, user.id);
  if (!lines.length) redirect("/cart");
  const last = [...db.orders].reverse().find((o) => o.userId === user.id);
  return <CheckoutForm total={total} count={lines.reduce((s, l) => s + l.qty, 0)} defaults={{ name: last?.name ?? user.name ?? "", address: last?.address ?? "", pincode: last?.pincode ?? "" }} />;
}
