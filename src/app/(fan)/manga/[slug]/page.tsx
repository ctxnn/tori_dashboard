import Link from "next/link";
import RevealScope from "@/store/components/RevealScope";
import { notFound, redirect } from "next/navigation";
import { read } from "@/store/lib/db";
import { currentUser } from "@/store/lib/auth";
import { ownedVolumes, publisherName } from "@/store/lib/catalog";
import { boxSetsOf, chapterAt, volumesOf } from "@/store/lib/derive";
import { Cover } from "@/store/components/Art";
import AddToCart from "@/store/components/AddToCart";
import VolumeGrid from "@/store/components/VolumeGrid";
import { inr } from "@/store/lib/format";

export const dynamic = "force-dynamic";
export async function generateMetadata({ params: paramsIn }: { params: Promise<{ slug: string }> }) { const params = await paramsIn;
  const s = (await read()).series.find((x) => x.slug === params.slug);
  return { title: s ? `${s.title} volumes` : "Not found" };
}

export default async function SeriesShop({ params: paramsIn }: { params: Promise<{ slug: string }> }) { const params = await paramsIn;
  const db = await read();
  const s = db.series.find((x) => x.slug === params.slug);
  if (!s) notFound();
  // Titles without print rights (or not enough chapters for a volume yet) are read-only.
  if (!s.totalVolumes) redirect(`/read/${s.slug}`);
  const user = await currentUser();
  const owned = user ? ownedVolumes(db, user.id, s.id) : new Set<number>();
  const inCart = new Set(user ? db.cart.filter((c) => c.userId === user.id && c.kind === "volume").map((c) => c.refId) : []);
  const vols = volumesOf(db, s);
  const missing = vols.filter((v) => !owned.has(v.number) && v.stock > 0 && !inCart.has(v.id));
  const missingTotal = missing.reduce((a, v) => a + v.price, 0);
  const boxes = boxSetsOf(s);
  const prog = user ? db.progress.find((p) => p.userId === user.id && p.seriesId === s.id) : undefined;
  const readVol = prog ? chapterAt(db, s, prog.chapter)?.volumeNumber ?? 0 : 0;
  const pct = Math.round((owned.size / s.totalVolumes) * 100);
  const minPrice = Math.min(...vols.map((v) => v.price));

  return (
    <div className="space-y-7">
      <section className="paper-band bleed relative -mt-5 overflow-hidden border-b border-line px-4 pb-6 pt-6 dark:border-line">
        <div className="tone pointer-events-none absolute -inset-y-12 inset-x-0 opacity-60" />
        <div className="relative flex items-end gap-4">
          <div data-parallax="24" className="relative h-[190px] w-[150px] shrink-0">
            {[3, 2, 1].map((n, k) => (
              <div key={n} className="absolute bottom-0 w-[112px]" style={{ left: k * 18, transform: `rotate(${(k - 1) * 4}deg)`, zIndex: k }}>
                <Cover title={s.title} color={s.color} image={s.image} vol={n} size="sm" />
              </div>
            ))}
          </div>
          <div className="min-w-0 pb-1">
            <h1 className="font-display text-[clamp(24px,7cqw,38px)] leading-[1]">{s.title}</h1>
            <p className="mt-2 text-[14px] font-semibold">{s.author}</p>
            <p className="text-[13.5px] text-muted">{publisherName(db, s.publisherId)}. {s.totalVolumes} volumes, from {inr(minPrice)}.</p>
          </div>
        </div>
        {user && (
          <div className="relative mt-5">
            <div className="mb-1.5 flex justify-between text-[13px] font-bold"><span>Your collection</span><span>{owned.size} of {s.totalVolumes}</span></div>
            <div className="h-3 overflow-hidden rounded-full border border-line bg-card dark:border-line"><div className="h-full bg-accent transition-all" style={{ width: `${Math.max(pct, owned.size ? 2 : 0)}%` }} /></div>
          </div>
        )}
      </section>

      {readVol > 0 && owned.size < readVol && (
        <p className="rounded-panel border border-accent/25 bg-accentsoft px-4 py-3 text-[14.5px] font-semibold text-accent">
          You've read to chapter {prog!.chapter}, which is volume {readVol}. {owned.size ? `You own ${owned.size} so far.` : "You don't own any of these books yet."}
        </p>
      )}

      {missing.length > 0 && (
        <div className="panel flex items-center gap-3 p-4">
          <div className="min-w-0 flex-1">
            <div className="text-[17px] font-bold tracking-[-0.02em] leading-tight">{owned.size ? "Fill the gaps" : "Start the collection"}</div>
            <div className="text-[13.5px] text-muted">{missing.length} volume{missing.length > 1 ? "s" : ""} in stock for {inr(missingTotal)}</div>
          </div>
          <AddToCart items={missing.map((v) => ({ kind: "volume", refId: v.id }))} label={`Add ${missing.length}`} signedIn={!!user} className="btn-primary" />
        </div>
      )}

      {boxes.length > 0 && (
        <section aria-labelledby="boxes" className="space-y-2" data-reveal="stagger">
          <h2 id="boxes" data-reveal="lines" className="h-section">Box sets</h2>
          {boxes.map((b) => {
            const full = vols.filter((v) => v.number >= b.fromVol && v.number <= b.toVol).reduce((a, v) => a + v.price, 0);
            return (
              <div key={b.id} className="card flex items-center gap-3 p-3.5">
                <div className="min-w-0 flex-1">
                  <div className="font-bold">{b.title}</div>
                  <div className="text-[13.5px]"><span className="price text-[16px]">{inr(b.price)}</span> <span className="text-muted line-through">{inr(full)}</span> <span className="font-bold text-ok">save {inr(full - b.price)}</span></div>
                </div>
                <AddToCart kind="box" refId={b.id} label="Add" signedIn={!!user} className="btn-ghost" />
              </div>
            );
          })}
        </section>
      )}

      <VolumeGrid title={s.title} color={s.color} signedIn={!!user}
        vols={vols.map((v) => ({ id: v.id, number: v.number, price: v.price, edition: v.edition, stock: v.stock, owned: owned.has(v.number), inCart: inCart.has(v.id) }))} />

      <Link href={`/read/${s.slug}`} data-section="read" className="btn-ghost w-full">Read {s.title.replace(/:.*/, "")} online first</Link>
      <RevealScope />
    </div>
  );
}
