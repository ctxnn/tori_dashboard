import Link from "next/link";
import { read } from "@/store/lib/db";
import { listCollabs } from "@/store/lib/collabs";
import { Cover } from "@/store/components/Art";
import { CollabTile } from "@/store/components/Collabs";
import { Arrow } from "@/components/ui";
import { SunEyebrow } from "@/components/japan";

/**
 * The two other ends of Torii: the fan app (official manga, books, figures and these collabs)
 * and the Partner Portal Japanese publishers use to bring their series. Figures are live.
 */
export async function FanAppSection() {
  const db = await read();
  const since = Date.now() - 90 * 864e5;
  const recent = db.events.filter((e) => Date.parse(e.createdAt) > since);
  const reads = recent.filter((e) => e.type === "read").length;
  const states = new Set(recent.map((e) => e.state)).size;
  const shelf = [...db.series].sort((a, b) => Number(!!b.demoProperty) - Number(!!a.demoProperty) || b.popularity - a.popularity).slice(0, 6);
  const collab = listCollabs().find((c) => c.open) ?? listCollabs()[0];

  return (
    <section aria-labelledby="fan-app" className="pt-28">
      <div className="grid items-center gap-14 lg:grid-cols-[1.05fr_0.95fr]">
        <div>
          <SunEyebrow>One Torii, three doors</SunEyebrow>
          <h2 id="fan-app" className="mt-6 text-[38px] font-semibold leading-[0.98] tracking-[-0.045em] sm:text-[60px]">
            Where fans read, buy <span className="font-serif font-normal italic text-vermilion">and back the next drop.</span>
          </h2>
          <p className="mt-6 max-w-xl text-[16px] leading-relaxed text-ink-2">
            The collabs made here sell inside Torii’s fan app, next to the series they come from. Fans read official chapters in five Indian languages, buy India-printed volumes and licensed figures, back creator collabs before they’re made, and scan any tag to prove it’s real.
          </p>
          <dl className="mt-9 grid max-w-xl grid-cols-3 gap-6">
            {[
              [String(db.series.length), "series, every publisher in one app"],
              [reads.toLocaleString("en-IN"), "chapters read in 90 days"],
              [String(states), "Indian states reading"],
            ].map(([v, k]) => (
              <div key={k} className="border-t border-ink pt-3">
                <dd className="text-[34px] font-semibold leading-none tracking-[-0.05em] tabular-nums">{v}</dd>
                <dt className="label mt-2 text-[10px] text-moss">{k}</dt>
              </div>
            ))}
          </dl>
          <div className="mt-10 grid max-w-xl gap-3 sm:grid-cols-2">
            <Link href="/read" className="group flex items-center justify-between rounded-[12px] bg-ink px-5 py-4 text-paper transition-colors hover:bg-pine">
              <span>
                <span className="block text-[15px] font-medium">Open the fan app</span>
                <span className="block text-[12.5px] text-paper/60">Read · Manga · Figures · Collabs</span>
              </span>
              <Arrow />
            </Link>
            <Link href="/partner" className="group flex items-center justify-between rounded-[12px] border border-ink px-5 py-4 text-ink transition-colors hover:bg-ivory">
              <span>
                <span className="block text-[15px] font-medium">Partner Portal</span>
                <span className="block text-[12.5px] text-moss">For Japanese publishers · <span lang="ja">出版社の方へ</span></span>
              </span>
              <Arrow />
            </Link>
          </div>
        </div>

        {/* A phone showing the fan app, drawn with the app's own components. */}
        <div className="relative mx-auto w-full max-w-[380px]">
          <div className="absolute -inset-10 -z-10 rounded-full bg-[radial-gradient(closest-side,rgba(226,64,42,0.16),transparent)]" aria-hidden />
          <div className="store-root rounded-[44px] border-[10px] border-ink shadow-[var(--shadow-lift)]" aria-label="The Torii fan app">
            <div className="overflow-hidden rounded-[34px] bg-[rgb(var(--paper))]" data-section="read">
              <div className="flex items-center gap-2 px-5 pb-2 pt-4">
                <span className="font-display text-[17px] leading-none">Torii</span>
                <span className="rounded-full bg-card/70 px-2 py-0.5 text-[11px] font-semibold ring-1 ring-inset ring-fg/10">Read</span>
              </div>
              <div className="px-5 pb-5">
                <div className="h-section text-[15px]">Top in India today</div>
                <ul className="mt-2 grid grid-cols-3 gap-2">
                  {shelf.map((s) => (
                    <li key={s.id}>
                      <Cover title={s.title} color={s.color} image={s.image} size="sm" />
                      <div className="mt-1 truncate text-[10.5px] font-semibold">{s.title}</div>
                    </li>
                  ))}
                </ul>
                {collab && (
                  <div className="mt-4 rounded-[14px] bg-card p-3 ring-1 ring-inset ring-fg/10" data-section="collabs">
                    <div className="mb-2 text-[11px] font-bold uppercase tracking-wide text-accent">Official collab · made in India</div>
                    <div className="grid grid-cols-[88px_1fr] items-center gap-3">
                      <CollabTile c={collab} />
                      <p className="text-[12px] leading-snug text-muted">Designed by {collab.creator} from the {collab.property} kit. Made only if {collab.threshold} fans pay.</p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
