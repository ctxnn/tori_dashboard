"use client";
import Link from "next/link";
import { useRef, useState } from "react";
import { useGSAP } from "@gsap/react";
import { EASE, EASE_IN, gsap, reduced, SplitText } from "@/store/lib/motion";
import { Cover } from "./Art";
import BannerImg from "./BannerImg";
import { useMangaArt } from "./AutoArt";
import { PlayIcon, TrailerBackdrop, TrailerModal } from "./Trailer";

gsap.registerPlugin(useGSAP);
type Item = { slug: string; title: string; author: string; publisher: string; color: string; synopsis: string; langs: string[]; chapters: number; image?: string; banner?: string; trailer?: string; genres: string[] };

export default function ReadHero({ items, priceNote }: { items: Item[]; priceNote: string }) {
  const [i, setI] = useState(0);
  const root = useRef<HTMLElement>(null);
  const busy = useRef(false);
  const touch = useRef(0);
  const it = items[i];
  const art = useMangaArt(it.title, !it.banner || !it.trailer);
  const banner = it.banner || art?.banner;
  const trailer = it.trailer || art?.trailer;
  const [watching, setWatching] = useState(false);

  const intro = (dir = 0) => {
    const q = gsap.utils.selector(root);
    const title = q("[data-title]")[0] as HTMLElement;
    gsap.set(title, { visibility: "visible" });
    const split = SplitText.create(title, { type: "words,chars", mask: "words" });
    const tl = gsap.timeline({ defaults: { ease: EASE }, onComplete: () => { split.revert(); busy.current = false; } });
    tl.fromTo(q("[data-jacket]"), { clipPath: dir ? (dir > 0 ? "inset(0% 0% 0% 100%)" : "inset(0% 100% 0% 0%)") : "inset(100% 0% 0% 0%)" }, { clipPath: "inset(0% 0% 0% 0%)", duration: dir ? 0.9 : 1.3 }, 0)
      .from(q("[data-jacket] svg, [data-jacket] img"), { scale: 1.18, duration: dir ? 1.1 : 1.8 }, 0)
      .from(split.chars, { yPercent: 110, duration: 1, stagger: 0.022 }, dir ? 0.1 : 0.25)
      .fromTo(q("[data-fade]"), { autoAlpha: 0, y: 16 }, { autoAlpha: 1, y: 0, duration: 0.9, stagger: 0.07, clearProps: "transform" }, dir ? 0.25 : 0.55);
    return tl;
  };

  useGSAP(() => {
    if (reduced()) { gsap.set("[data-title]", { visibility: "visible" }); return; }
    intro();
    // Slow drift as the hero scrolls away.
    gsap.to("[data-jacket-wrap]", { yPercent: 14, ease: "none", scrollTrigger: { trigger: root.current, start: "top top", end: "bottom top", scrub: 0.6 } });
  }, { scope: root });

  const go = (n: number) => {
    const next = (n + items.length) % items.length;
    if (next === i || busy.current) return;
    if (reduced() || !root.current) { setI(next); return; }
    busy.current = true;
    const dir = n > i ? 1 : -1;
    const q = gsap.utils.selector(root);
    gsap.timeline({ defaults: { ease: EASE_IN }, onComplete: () => { setI(next); requestAnimationFrame(() => intro(dir)); } })
      .to(q("[data-jacket]"), { clipPath: dir > 0 ? "inset(0% 100% 0% 0%)" : "inset(0% 0% 0% 100%)", duration: 0.45 }, 0)
      .to(q("[data-title], [data-fade]"), { autoAlpha: 0, y: -14, duration: 0.3, stagger: 0.03 }, 0);
  };

  return (
    <section ref={root} aria-roledescription="carousel" aria-label="Featured series"
      className="paper-band bleed relative -mt-5 overflow-hidden px-4 pb-7 pt-7"
      onTouchStart={(e) => (touch.current = e.touches[0].clientX)}
      onTouchEnd={(e) => { const dx = e.changedTouches[0].clientX - touch.current; if (Math.abs(dx) > 50) go(i + (dx < 0 ? 1 : -1)); }}>
      <div className="tone pointer-events-none absolute -inset-y-16 inset-x-0 opacity-70" />
      {banner && <BannerImg key={banner} src={banner} className="h-[62%]" fade="linear-gradient(to bottom, rgb(var(--paper)/.1) 0%, rgb(var(--paper)/.55) 35%, rgb(var(--paper)) 62%)" />}
      {trailer && !watching && <TrailerBackdrop key={trailer} id={trailer} className="h-[58%]" fade="linear-gradient(to bottom, rgb(var(--paper)/0) 0%, rgb(var(--paper)/.15) 45%, rgb(var(--paper)/.85) 82%, rgb(var(--paper)) 100%)" />}
      <div className="relative grid grid-cols-[41%_1fr] items-end gap-5 pt-14">
        <div data-jacket-wrap>
          <div>
            <Link href={`/read/${it.slug}`} data-jacket className="block overflow-hidden rounded-[8px]" aria-label={`Open ${it.title}`}>
              <Cover title={it.title} color={it.color} sub={it.publisher} size="lg" image={it.image} />
            </Link>
          </div>
        </div>
        <div data-copy className="min-w-0">
          <p data-fade className="mb-2 text-[13px] font-semibold text-accent">Number {i + 1} in India this month</p>
          <h1 key={it.slug} data-title className="js-hide font-display leading-[0.98] tracking-[-0.01em] [overflow-wrap:normal] [word-break:keep-all]" style={{ fontSize: `clamp(24px, ${Math.min(9, 54 / Math.max(6, ...it.title.replace(/:.*/, "").split(" ").map((w) => w.length)))}cqw, 48px)` }}>{it.title.replace(/:.*/, "")}</h1>
          <p data-fade className="mt-2 text-[13.5px] font-medium text-muted">{it.author}</p>
          {it.genres.length > 0 && <p data-fade className="mt-1 text-[12.5px] font-semibold">{it.genres.join("  •  ")}</p>}
          <p data-fade className="mt-2.5 line-clamp-3 max-w-[38ch] text-[14.5px] leading-snug">{it.synopsis}</p>
          <div data-fade className="mt-5 flex flex-wrap items-center gap-2">
            <Link href={`/read/${it.slug}/1`} className="btn-primary">Read chapter 1</Link>
            {trailer
              ? <button type="button" onClick={() => setWatching(true)} className="btn-ghost gap-1.5"><PlayIcon />Trailer</button>
              : <Link href={`/read/${it.slug}`} className="btn-ghost">Details</Link>}
          </div>
        </div>
      </div>
      <div className="relative mt-6 flex items-center gap-3">
        <p className="text-[13px] font-medium text-muted">{priceNote}</p>
        <div className="ml-auto flex items-center gap-1" role="tablist" aria-label="Choose featured series">
          {items.map((x, k) => (
            <button key={x.slug} role="tab" aria-selected={k === i} aria-label={x.title} onClick={() => go(k)} className="group flex h-8 items-center px-1">
              <span className={`block h-[3px] rounded-full transition-all duration-700 ease-out ${k === i ? "w-8 bg-fg" : "w-4 bg-fg/20 group-hover:bg-fg/40"}`} />
            </button>
          ))}
        </div>
      </div>
      {watching && trailer && <TrailerModal id={trailer} title={it.title} onClose={() => setWatching(false)} />}
    </section>
  );
}
