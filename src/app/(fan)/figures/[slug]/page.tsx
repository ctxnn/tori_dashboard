import Link from "next/link";
import RevealScope from "@/store/components/RevealScope";
import { notFound } from "next/navigation";
import { read } from "@/store/lib/db";
import { currentUser } from "@/store/lib/auth";
import { FigureArt } from "@/store/components/Art";
import AddToCart from "@/store/components/AddToCart";
import Gallery from "@/store/components/Gallery";
import { IconShield } from "@/store/components/Icons";
import { inr } from "@/store/lib/format";

export const dynamic = "force-dynamic";
export async function generateMetadata({ params: paramsIn }: { params: Promise<{ slug: string }> }) { const params = await paramsIn;
  const f = (await read()).figures.find((x) => x.slug === params.slug);
  return { title: f?.name ?? "Not found" };
}

export default async function FigurePage({ params: paramsIn }: { params: Promise<{ slug: string }> }) { const params = await paramsIn;
  const db = await read();
  const f = db.figures.find((x) => x.slug === params.slug);
  if (!f) notFound();
  const s = db.series.find((x) => x.id === f.seriesId)!;
  const user = await currentUser();
  const left = f.editionSize ? f.editionSize - f.editionSold : null;
  const soldOut = left === 0 || f.stock === 0;
  const owned = user ? db.ownership.some((o) => o.userId === user.id && o.kind === "figure" && o.refId === f.id) : false;
  const related = db.figures.filter((x) => x.seriesId === f.seriesId && x.id !== f.id).slice(0, 4);
  const specs: [string, string][] = [
    ["Series", s.title], ["Character", f.character], ["Made by", f.manufacturer], ["Licensed by", f.licensor],
    ["Scale", f.scale], ["Height", `${f.heightCm} cm`], ["Material", f.material],
  ];
  const status = f.availability === "preorder" ? `Pre-order, ships ${f.releaseMonth}` : f.availability === "limited" ? `Limited to ${f.editionSize} numbered pieces` : f.stock < 15 ? `In stock, ${f.stock} left` : "In stock";

  return (
    <div className="space-y-6">
      <Gallery color={f.color} name={f.name} image={f.image} character={f.character} />
      <div>
        <div className="flex flex-wrap items-center gap-2">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-ok/30 bg-ok/10 px-2.5 py-1 text-[12.5px] font-bold text-ok"><IconShield className="h-4 w-4" />Official, licensed</span>
          {f.availability === "limited" && <span className="rounded-full border border-line bg-ink px-2.5 py-1 text-[12.5px] font-bold text-white dark:border-fg">Yours would be #{String(f.editionSold + 1).padStart(4, "0")}</span>}
        </div>
        <h1 className="h-title mt-3">{f.name}</h1>
        <p className="mt-1 text-[14.5px] text-muted">{s.title}, by {f.manufacturer}</p>
        <div className="mt-3 flex items-end justify-between gap-3">
          <div className="price text-[34px] leading-none">{inr(f.price)}</div>
          <div className="text-right text-[13px] font-semibold">{status}</div>
        </div>
        {f.availability === "limited" && left !== null && (
          <div className="mt-3">
            <div className="h-3 overflow-hidden rounded-full border border-line bg-card dark:border-line"><div className="h-full bg-accent" style={{ width: `${(f.editionSold / f.editionSize!) * 100}%` }} /></div>
            <p className="mt-1.5 text-[13px] text-muted">{left} of {f.editionSize} left. Your number is assigned when you pay.</p>
          </div>
        )}
      </div>
      <AddToCart kind="figure" refId={f.id} signedIn={!!user} className="btn-primary w-full text-[16px]" disabled={soldOut}
        label={soldOut ? "Sold out" : f.availability === "preorder" ? `Pre-order for ${inr(f.price)}` : `Add to cart, ${inr(f.price)}`} />
      {owned && <p className="rounded-xl bg-accentsoft px-3 py-2.5 text-[14px] font-semibold text-accent">This figure is already on your shelf.</p>}
      <dl data-reveal className="card divide-y divide-line">
        {specs.map(([k, v]) => <div key={k} className="flex justify-between gap-4 px-4 py-3 text-[14.5px]"><dt className="text-muted">{k}</dt><dd className="text-right font-semibold">{v}</dd></div>)}
      </dl>
      <div className="flex gap-3 rounded-panel border border-dashed border-line p-4 text-[14px] leading-snug">
        <IconShield className="mt-0.5 h-6 w-6 shrink-0 text-ok" />
        <p>Every box carries its own signed Torii code. Scan it in <Link href="/verify" className="font-bold underline underline-offset-2">Verify</Link> to confirm it's genuine and add it to your shelf. A copied code shows who registered it first.</p>
      </div>
      {related.length > 0 && (
        <section>
          <h2 data-reveal="lines" className="h-section mb-3">More from {s.title}</h2>
          <div data-reveal="stagger" className="grid grid-cols-2 gap-3">
            {related.map((r) => (
              <Link key={r.id} href={`/figures/${r.slug}`} className="group">
                <div className="overflow-hidden rounded-panel border border-line dark:border-line"><FigureArt color={r.color} name={r.name} image={r.image} character={r.character} rounded={false} className="transition-transform duration-700 ease-out group-hover:scale-105" /></div>
                <div className="mt-2 line-clamp-2 text-[13.5px] font-bold leading-tight">{r.name}</div>
                <div className="price text-[15px]">{inr(r.price)}</div>
              </Link>
            ))}
          </div>
        </section>
      )}
      <RevealScope />
    </div>
  );
}
