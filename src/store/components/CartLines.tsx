"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Cover, FigureArt } from "./Art";

type L = { id: string; kind: string; qty: number; title: string; subtitle: string; price: number; color: string; href: string; image?: string };
export default function CartLines({ lines }: { lines: L[] }) {
  const router = useRouter();
  const set = async (id: string, qty: number) => {
    await fetch("/api/store/cart", { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify({ id, qty }) });
    router.refresh();
  };
  return (
    <div className="space-y-2">
      {lines.map((l) => (
        <div key={l.id} className="card flex gap-3.5 p-3.5">
          <Link href={l.href} className="w-16 shrink-0">{l.kind === "figure" ? <div className="overflow-hidden rounded-[10px] border border-line dark:border-line"><FigureArt color={l.color} name={l.title} image={l.image} rounded={false} /></div> : <Cover title={l.title} color={l.color} image={l.image} size="sm" />}</Link>
          <div className="min-w-0 flex-1">
            <div className="line-clamp-2 font-bold leading-tight">{l.title}</div>
            <div className="mt-0.5 truncate text-[13px] text-muted">{l.subtitle.replace(" · ", ", ")}</div>
            <div className="mt-2 flex items-center gap-2">
              <span className="price text-[17px]">₹{(l.price * l.qty).toLocaleString("en-IN")}</span>
              <div className="ml-auto flex items-center rounded-xl border border-line dark:border-line">
                <button className="h-9 w-9 text-lg font-bold" onClick={() => set(l.id, l.qty - 1)} aria-label="One fewer">−</button>
                <span className="w-6 text-center font-bold">{l.qty}</span>
                <button className="h-9 w-9 text-lg font-bold" onClick={() => set(l.id, l.qty + 1)} aria-label="One more" disabled={l.kind === "box" && l.qty >= 3}>+</button>
              </div>
              <button className="text-[13px] font-semibold text-muted underline underline-offset-2" onClick={() => set(l.id, 0)}>Remove</button>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
