import Link from "next/link";
import RevealScope from "@/store/components/RevealScope";
import { read } from "@/store/lib/db";
import { requireUser } from "@/store/lib/auth";
import { ownedVolumes } from "@/store/lib/catalog";
import { chapterAt } from "@/store/lib/derive";
import { Cover, FigureArt, hueShift } from "@/store/components/Art";
import { LANGS } from "@/store/lib/types";
import { collabOrdersFor } from "@/store/lib/collabs";
import { CollabArt } from "@/store/components/Collabs";

export const dynamic = "force-dynamic";
export const metadata = { title: "My Shelf" };

function rangeText(owned: number[]) {
  if (!owned.length) return "none of the books";
  const sorted = [...owned].sort((a, b) => a - b);
  const contiguous = sorted.every((n, i) => n === sorted[0] + i);
  if (contiguous) return sorted.length === 1 ? `volume ${sorted[0]}` : `volumes ${sorted[0]} to ${sorted[sorted.length - 1]}`;
  return `${sorted.length} volumes`;
}

export default async function Shelf() {
  const user = await requireUser("/shelf");
  const db = await read();
  const progress = db.progress.filter((p) => p.userId === user.id).sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  const unlocks = db.unlocks.filter((u) => u.userId === user.id);
  const ownedVolIds = new Set(db.ownership.filter((o) => o.userId === user.id && o.kind === "volume").map((o) => o.refId));
  const seriesWithVols = db.series.filter((s) => Array.from(ownedVolIds).some((id) => id.startsWith(`v_${s.slug}_`)));
  const figs = db.ownership.filter((o) => o.userId === user.id && o.kind === "figure").map((o) => ({ o, f: db.figures.find((f) => f.id === o.refId)! })).filter((x) => x.f);
  const gaps = progress.map((p) => {
    const s = db.series.find((x) => x.id === p.seriesId)!;
    const ch = chapterAt(db, s, p.chapter);
    const readVol = ch?.volumeNumber || s.totalVolumes;
    const owned = Array.from(ownedVolumes(db, user.id, s.id));
    const missing = Array.from({ length: readVol }, (_, i) => i + 1).filter((n) => !owned.includes(n));
    return { s, p, owned, missing };
  }).filter((g) => g.missing.length > 0);
  const collabs = collabOrdersFor(user.studioId);
  const empty = !progress.length && !ownedVolIds.size && !figs.length && !collabs.length;

  return (
    <div className="space-y-8">
      <section className="paper-band bleed relative -mt-5 overflow-hidden border-b border-line px-4 pb-6 pt-7 dark:border-line">
        <div className="tone pointer-events-none absolute -inset-y-12 inset-x-0 opacity-60" />
        <div className="relative">
          <h1 className="font-display text-[clamp(30px,9cqw,46px)] leading-none">{user.name ? `${user.name}'s shelf` : "Your shelf"}</h1>
          <dl className="mt-5 grid grid-cols-4 gap-2">
            {[[progress.length, "reading"], [unlocks.length, "chapters unlocked"], [ownedVolIds.size, "books owned"], [figs.length, "figures"]].map(([n, l]) => (
              <div key={String(l)} className="rounded-xl bg-card/80 px-2 py-2.5 text-center ring-1 ring-inset ring-fg/10"><dd data-count className="price text-[24px] leading-none">{n}</dd><dt className="mt-1 text-[11.5px] leading-tight text-muted">{l}</dt></div>
            ))}
          </dl>
        </div>
      </section>

      {empty && (
        <div className="panel p-6 text-center">
          <p className="text-[18px] font-bold tracking-[-0.02em]">Nothing here yet</p>
          <p className="mt-1 text-[14.5px] text-muted">Start a series and your progress, books and figures collect here.</p>
          <Link href="/read" data-section="read" className="btn-primary mt-4">Find something to read</Link>
        </div>
      )}

      {collabs.length > 0 && (
        <section aria-labelledby="collabs" data-section="collabs" className="space-y-2.5">
          <div className="flex items-baseline justify-between">
            <h2 id="collabs" data-reveal="lines" className="h-section">Collabs you backed</h2>
            <Link href="/collabs" className="-mr-2 px-2 py-1 text-[13.5px] font-semibold text-accent">More collabs</Link>
          </div>
          {collabs.map((o) => (
            <div key={o.ref} className="card flex gap-3 p-3">
              <Link href={o.href} className="w-20 shrink-0"><CollabArt svg={o.previewSvg} className="border border-line" /></Link>
              <div className="min-w-0 flex-1 text-[14px] leading-snug">
                <Link href={o.href} className="font-bold">{o.title}</Link>
                <p className="text-muted">{o.property} · {o.quantity} × {o.size} · {o.total}</p>
                <p className="mt-1 inline-flex rounded-full bg-accentsoft px-2 py-0.5 text-[12px] font-semibold text-fg">{o.status}</p>
                {o.codes.length > 0 && (
                  <p className="mt-1.5 text-[12.5px] text-muted">
                    Authenticity {o.codes.length === 1 ? "code" : "codes"}:{" "}
                    {o.codes.map((c, i) => <span key={c}>{i > 0 && ", "}<Link href={`/verify/${c}`} className="font-semibold tabular-nums text-fg underline underline-offset-2">{c}</Link></span>)}
                  </p>
                )}
              </div>
            </div>
          ))}
        </section>
      )}

      {gaps.length > 0 && (
        <section aria-labelledby="gaps" className="space-y-2.5">
          <h2 id="gaps" data-reveal="lines" className="h-section">Gaps in your collection</h2>
          {gaps.map((g) => (
            <div key={g.s.id} className="card flex items-center gap-3 p-3.5">
              <div className="w-12 shrink-0"><Cover title={g.s.title} color={g.s.color} size="sm" /></div>
              <div className="min-w-0 flex-1 text-[14px] leading-snug">
                <div className="font-bold">{g.s.title}</div>
                <p className="text-muted">You've read to chapter {g.p.chapter} and own {rangeText(g.owned)}.</p>
                <p className="font-semibold text-accent">{g.missing.length === 1 ? `Volume ${g.missing[0]} covers` : `Volumes ${g.missing.length > 6 ? `${g.missing.slice(0, 5).join(", ")} and ${g.missing.length - 5} more` : g.missing.join(", ")} cover`} what you've read.</p>
              </div>
              <Link href={`/manga/${g.s.slug}`} data-section="manga" className="btn-primary px-3 text-[13.5px]">Fill gaps</Link>
            </div>
          ))}
        </section>
      )}

      {progress.length > 0 && (
        <section aria-labelledby="reading">
          <h2 id="reading" data-reveal="lines" className="h-section mb-3">Reading</h2>
          <div data-reveal="stagger" className="space-y-2">
            {progress.map((p) => {
              const s = db.series.find((x) => x.id === p.seriesId)!;
              const un = unlocks.filter((u) => u.chapterId.startsWith(`c_${s.slug}_`)).length;
              return (
                <Link key={s.id} href={`/read/${s.slug}/${p.chapter}?lang=${p.language}`} data-section="read" className="card flex items-center gap-3 p-3 hover:border-ink">
                  <div className="w-11 shrink-0"><Cover title={s.title} color={s.color} image={s.image} size="sm" /></div>
                  <div className="min-w-0 flex-1">
                    <div className="truncate font-bold">{s.title}</div>
                    <div className="text-[12.5px] text-muted">Chapter {p.chapter} of {s.totalChapters.toLocaleString("en-IN")}, in {LANGS.find((l) => l.code === p.language)?.native}{un ? `. ${un} unlocked.` : ""}</div>
                    <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-line"><div className="h-full rounded-full bg-accent" style={{ width: `${Math.max(3, (p.chapter / s.totalChapters) * 100)}%` }} /></div>
                  </div>
                  <span className="text-[13px] font-bold text-accent">Continue</span>
                </Link>
              );
            })}
          </div>
        </section>
      )}

      {seriesWithVols.length > 0 && (
        <section aria-labelledby="books">
          <h2 id="books" data-reveal="lines" className="h-section mb-3">Books</h2>
          <div data-reveal="stagger" className="space-y-3">
            {seriesWithVols.map((s) => {
              const owned = ownedVolumes(db, user.id, s.id);
              const show = Math.min(s.totalVolumes, 40);
              return (
                <Link key={s.id} href={`/manga/${s.slug}`} data-section="manga" className="block rounded-panel border border-line bg-card px-3 pt-3 dark:border-line">
                  <div className="mb-2 flex justify-between text-[14px]"><span className="font-bold">{s.title}</span><span className="text-muted">{owned.size} of {s.totalVolumes}</span></div>
                  <div className="flex items-end gap-[2px]">
                    {Array.from({ length: show }, (_, i) => {
                      const c = hueShift(s.color, (((i + 1) * 23) % 50) - 25);
                      return <span key={i} title={`Volume ${i + 1}`} className={`h-14 flex-1 rounded-t-[3px] ${owned.has(i + 1) ? "border border-ink/70" : "border border-dashed border-muted/40"}`} style={owned.has(i + 1) ? { background: c } : undefined} />;
                    })}
                  </div>
                  <div className="-mx-3 h-2.5 border-t border-line bg-line dark:border-line" />
                </Link>
              );
            })}
          </div>
        </section>
      )}

      {figs.length > 0 && (
        <section aria-labelledby="figs">
          <h2 id="figs" data-reveal="lines" className="h-section mb-3">Figures</h2>
          <div data-reveal="stagger" className="grid grid-cols-3 gap-3">
            {figs.map(({ f, o }) => {
              const tag = db.tags.find((t) => t.ownerId === user.id && t.refId === f.id);
              return (
                <Link key={f.id} href={`/figures/${f.slug}`} data-section="figures" className="group">
                  <div className="overflow-hidden rounded-panel border border-line dark:border-line"><FigureArt color={f.color} name={f.name} image={f.image} character={f.character} rounded={false} /></div>
                  <div className="mt-1.5 line-clamp-2 text-[12.5px] font-bold leading-tight">{f.name}</div>
                  <div className="text-[12px] font-semibold text-ok">{tag ? "Verified" : o.source === "order" ? "On its way" : "Owned"}{tag?.editionNo ? `, #${String(tag.editionNo).padStart(4, "0")}` : ""}</div>
                </Link>
              );
            })}
          </div>
        </section>
      )}
      <RevealScope />
    </div>
  );
}
