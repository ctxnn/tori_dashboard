"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import type { StoryData } from "@/lib/landing";
import { renderPreviewSvg } from "@/lib/preview";
import { formatINR } from "@/lib/money";
import { layoutName, productName } from "@/lib/catalog";
import { Arrow, Seal, StageIcon, cx } from "@/components/ui";
import { useCountUp, usePrefersReducedMotion } from "./use-motion";

const STEPS = [
  {
    who: "IP owner",
    title: "The owner hands over a kit.",
    body: "Original artwork plus explicit rules: which products and layouts, where, when, at what price, and who must approve. Changing a rule publishes a new version.",
  },
  {
    who: "Creator",
    title: "A creator makes it local.",
    body: "Inside those rules the creator picks the product and artwork, then adds what Tokyo can’t see from afar — their own print line, their audience, their distribution.",
  },
  {
    who: "Server + named approver",
    title: "One exact version is approved.",
    body: "The backend checks every declared rule — glassware is refused, with a reason. A named person approves one fingerprinted version. Any later change needs fresh approval.",
  },
  {
    who: "Fans",
    title: "Fans pay before it’s made.",
    body: "A public campaign with a production gate. Signed payment events are counted exactly once. Miss the gate by the deadline and everyone is refunded in full.",
  },
  {
    who: "Torii operator",
    title: "Every rupee reconciles.",
    body: "Release, ship, deliver. Earnings are recorded only on delivery, and the statement is re-checked against every order — refunds included.",
  },
];

const rise = (delay: number, ms = 600) => ({ animation: `rise ${ms}ms ${delay}s cubic-bezier(0.2,0.75,0.2,1) both` });
const pop = (delay: number) => ({ animation: `pop 520ms ${delay}s cubic-bezier(0.2,0.8,0.25,1.25) both` });

// ---------------------------------------------------------------------------
// Scenes
// ---------------------------------------------------------------------------

function KitScene({ kit }: { kit: StoryData["kit"] }) {
  const chips: [string, string, boolean][] = [
    ...kit.products.map((p) => ["✓", p, true] as [string, string, boolean]),
    ["✕", kit.blocked, false],
    ["◎", kit.territory, true],
    ["₹", kit.priceBand, true],
    ["承", `Approver · ${kit.approver}`, true],
  ];
  return (
    <div className="w-full max-w-[560px]">
      <div className="label mb-4 text-[10px] text-paper/50" style={rise(0)}>
        {kit.name} kit · v{kit.versionNo} · {kit.owner}
      </div>
      <div className="grid grid-cols-4 gap-2.5 sm:gap-3">
        {kit.assets.map((a, i) => (
          <figure key={a.code} className="rounded-md bg-[#26302c] p-1.5 ring-1 ring-paper/10 sm:p-2" style={pop(0.1 + i * 0.12)}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={a.uri} alt={a.name} className="aspect-square w-full object-contain" />
            <figcaption className="mt-1 truncate font-mono text-[9px] text-paper/50 sm:text-[9.5px]">{a.code}</figcaption>
          </figure>
        ))}
      </div>
      <ul className="mt-6 flex flex-wrap gap-2">
        {chips.map(([icon, text, ok], i) => (
          <li
            key={text}
            style={rise(0.6 + i * 0.09, 500)}
            className={cx(
              "flex items-center gap-2 rounded-full border px-3 py-1.5 text-[12.5px]",
              ok ? "border-paper/20 text-paper/85" : "border-vermilion/60 bg-vermilion/15 text-[#ffb7a8] line-through decoration-vermilion/70",
            )}
          >
            <span className={cx("font-mono text-[11px]", ok ? "text-paper/50" : "text-vermilion")}>{icon}</span>
            {text}
          </li>
        ))}
      </ul>
    </div>
  );
}

function OfferScene({ offer, active }: { offer: NonNullable<StoryData["offer"]>; active: boolean }) {
  const reduced = usePrefersReducedMotion();
  const l1 = offer.content.design.text.line1;
  const l2 = offer.content.design.text.line2;
  const total = l1.length + l2.length;
  const [phase, setPhase] = useState(0);
  const [chars, setChars] = useState(0);

  useEffect(() => {
    if (!active) {
      setPhase(0);
      setChars(0);
      return;
    }
    if (reduced) {
      setPhase(3);
      setChars(total);
      return;
    }
    const timers: ReturnType<typeof setTimeout>[] = [];
    let iv: ReturnType<typeof setInterval> | undefined;
    timers.push(setTimeout(() => setPhase(1), 550));
    timers.push(
      setTimeout(() => {
        setPhase(2);
        iv = setInterval(() => {
          setChars((c) => {
            if (c + 1 >= total) {
              clearInterval(iv);
              setPhase(3);
            }
            return Math.min(total, c + 1);
          });
        }, 60);
      }, 1150),
    );
    return () => {
      timers.forEach(clearTimeout);
      if (iv) clearInterval(iv);
    };
  }, [active, reduced, total]);

  const svg = useMemo(
    () =>
      renderPreviewSvg({
        productId: offer.content.productId,
        layoutId: offer.content.layoutId,
        design: { ...offer.content.design, text: { ...offer.content.design.text, line1: l1.slice(0, Math.min(chars, l1.length)), line2: l2.slice(0, Math.max(0, chars - l1.length)) } },
        artworkHref: phase >= 1 ? offer.artworkUri : null,
        uid: "story-offer",
      }),
    [offer, phase, chars, l1, l2],
  );

  const facts: [string, string, number][] = [
    ["Licensed product", `${productName(offer.content.productId)}, ${layoutName(offer.content.productId, offer.content.layoutId).toLowerCase()}`, 0],
    ["Protected artwork", "Placed exactly as supplied", 1],
    ["Creator’s own line", `“${l1}”`, 2],
    ["Offer", `${formatINR(offer.content.offer.priceMinor)} · gate at ${offer.content.offer.thresholdUnits} units`, 3],
  ];
  return (
    <div className="grid w-full max-w-[620px] grid-cols-1 items-center gap-6 sm:grid-cols-[1.05fr_1fr] sm:gap-8">
      <div className="relative mx-auto w-full max-w-[260px] overflow-hidden rounded-md bg-paper shadow-2xl sm:max-w-none" style={pop(0.05)}>
        <div className="preview" dangerouslySetInnerHTML={{ __html: svg }} />
        {phase === 2 && <span className="absolute bottom-3 right-3 font-mono text-[10px] text-ink/50">typing<span className="animate-[blink_1s_steps(2)_infinite]">▍</span></span>}
      </div>
      <ul className="space-y-4">
        {facts.map(([k, v, at]) => (
          <li key={k} className={cx("border-l-2 pl-3 transition-all duration-500", phase >= at ? "border-vermilion opacity-100" : "translate-x-2 border-paper/15 opacity-25")}>
            <div className="label text-[9.5px] text-paper/50">{k}</div>
            <div className="mt-0.5 text-[13.5px] text-paper sm:text-[15px]">{v}</div>
          </li>
        ))}
        <li className="label pt-1 text-[9.5px] text-paper/40">by {offer.creator}</li>
      </ul>
    </div>
  );
}

function ApprovalScene({ approval }: { approval: NonNullable<StoryData["approval"]> }) {
  const checks = approval.checks.slice(0, 8);
  return (
    <div className="relative w-full max-w-[560px]">
      <div className="label mb-4 text-[10px] text-paper/50" style={rise(0)}>Server rule checks · version {approval.versionNo}</div>
      <ul className="grid gap-x-6 gap-y-2.5 sm:grid-cols-2">
        {checks.map((c, i) => (
          <li key={c.id} className="flex items-center gap-2.5 text-[13.5px] text-paper/90" style={rise(0.15 + i * 0.13, 450)}>
            <span className={cx("grid h-5 w-5 shrink-0 place-items-center rounded-full text-[11px] font-bold", c.source === "approval" ? "bg-vermilion text-white" : "bg-[#2f8a62] text-white")} aria-hidden>
              ✓
            </span>
            {c.label}
          </li>
        ))}
      </ul>
      <div className="mt-8 flex items-center gap-5 border-t border-paper/10 pt-6">
        <div style={{ animation: `stamp 650ms ${0.25 + checks.length * 0.13}s cubic-bezier(0.3,0.7,0.3,1.2) both` }}>
          <Seal sub={`v${approval.versionNo} · ${approval.hash.slice(0, 6)}`} className="h-[108px] w-[108px] rotate-0" />
        </div>
        <div style={rise(0.55 + checks.length * 0.13)}>
          <div className="text-[15px] font-medium">Approved by {approval.approver}</div>
          <div className="mt-1 font-mono text-[11px] text-paper/50">fingerprint {approval.hash}</div>
          <div className="mt-2 text-[12.5px] text-paper/55">Bound to this exact version. Edit anything and it needs a fresh decision.</div>
        </div>
      </div>
    </div>
  );
}

function GateScene({ gate, active }: { gate: NonNullable<StoryData["gate"]>; active: boolean }) {
  const n = useCountUp(gate.paid, active, 1600);
  const remaining = Math.max(0, gate.threshold - gate.paid);
  return (
    <div className="w-full max-w-[560px]">
      <div className="flex items-end justify-between" style={rise(0)}>
        <div>
          <div className="label text-[10px] text-paper/50">Production gate · {gate.title}</div>
          <div className="mt-2 font-mono">
            <span className="text-[56px] font-semibold leading-none tracking-[-0.05em] tabular-nums">{n}</span>
            <span className="text-lg text-paper/45"> / {gate.threshold} paid</span>
          </div>
        </div>
        <span className="label rounded-full border border-paper/20 px-3 py-1.5 text-[10px] text-paper/70">Test mode</span>
      </div>
      <div className="mt-6 grid grid-cols-10 gap-1.5 sm:gap-2" role="img" aria-label={`${gate.paid} of ${gate.threshold} paid units`}>
        {Array.from({ length: gate.threshold }, (_, i) => (
          <span
            key={i}
            className={cx("aspect-square rounded-full", i < gate.paid ? "bg-vermilion" : "border border-dashed border-paper/40")}
            style={i < gate.paid ? pop(0.1 + i * 0.028) : { animation: `pop 400ms ${0.2 + gate.paid * 0.028}s both` }}
          />
        ))}
      </div>
      <p className="mt-6 text-[14px] text-paper/70" style={rise(0.3 + gate.paid * 0.028)}>
        {remaining > 0 ? (
          <>
            <span className="text-paper">{remaining} more paid preorders</span> unlock production. Miss the deadline and every fan is refunded.
          </>
        ) : (
          <span className="text-paper">Production unlocked.</span>
        )}
      </p>
    </div>
  );
}

function MoneyScene({ money, active }: { money: NonNullable<StoryData["money"]>; active: boolean }) {
  const total = useCountUp(money.itemSales, active, 1500);
  const [grown, setGrown] = useState(false);
  useEffect(() => {
    if (!active) return setGrown(false);
    const t = setTimeout(() => setGrown(true), 250);
    return () => clearTimeout(t);
  }, [active]);
  const slices = [
    { label: "Licensor", v: money.royalty, c: "bg-vermilion" },
    { label: "Creator", v: money.creator, c: "bg-[#2f8a62]" },
    { label: "Torii", v: money.torii, c: "bg-paper" },
    { label: "Seller", v: money.seller, c: "bg-paper/25" },
  ];
  return (
    <div className="w-full max-w-[580px]">
      <div className="label text-[10px] text-paper/50" style={rise(0)}>Recorded · {money.title}</div>
      <div className="mt-2 text-[44px] font-semibold leading-none tracking-[-0.05em] tabular-nums sm:text-[64px]">{formatINR(total)}</div>
      <div className="mt-2 text-[13px] text-paper/55">net item sales on {money.units} delivered units · {money.refunds} refunds reconciled</div>
      <div className="mt-7 flex h-12 overflow-hidden rounded-md bg-paper/5">
        {slices.map((s, i) => (
          <div
            key={s.label}
            className={cx(s.c, "h-full border-r border-ink/40 transition-[width] duration-[900ms] ease-[cubic-bezier(0.2,0.75,0.2,1)] last:border-r-0")}
            style={{ width: grown ? `${(s.v / money.itemSales) * 100}%` : "0%", transitionDelay: `${i * 0.12}s` }}
          />
        ))}
      </div>
      <dl className="mt-5 grid grid-cols-2 gap-4 sm:grid-cols-4">
        {slices.map((s, i) => (
          <div key={s.label} style={rise(0.5 + i * 0.1)}>
            <dt className="flex items-center gap-1.5">
              <span className={cx("h-2 w-2 rounded-sm", s.c)} aria-hidden />
              <span className="label text-[9.5px] text-paper/50">{s.label}</span>
            </dt>
            <dd className="mt-1 text-[19px] font-semibold tracking-[-0.03em] tabular-nums">{formatINR(s.v)}</dd>
          </div>
        ))}
      </dl>
      <p className="mt-5 text-[12.5px] text-paper/45" style={rise(1)}>Torii’s share is revenue before its expenses — not profit.</p>
    </div>
  );
}

// ---------------------------------------------------------------------------

function Canvas({ index, children, className }: { index: number; children: ReactNode; className?: string }) {
  return (
    <div className={cx("grain relative overflow-hidden rounded-[14px] bg-ink text-paper", className)}>
      <div className="grid-paper-dark absolute inset-0" aria-hidden />
      <div className="pointer-events-none absolute inset-3" aria-hidden>
        {["left-0 top-0 border-l border-t", "right-0 top-0 border-r border-t", "bottom-0 left-0 border-b border-l", "bottom-0 right-0 border-b border-r"].map((c) => (
          <span key={c} className={`absolute h-3.5 w-3.5 border-paper/35 ${c}`} />
        ))}
      </div>
      <div className="absolute inset-x-6 top-5 flex items-center justify-between">
        <span className="label text-[10px] text-paper/45">Stage 0{index + 1} / 05</span>
        <span className="flex gap-1.5" aria-hidden>
          {STEPS.map((s, i) => (
            <span key={s.who} className={cx("h-1 rounded-full transition-all duration-500", i === index ? "w-6 bg-vermilion" : i < index ? "w-3 bg-paper/50" : "w-3 bg-paper/15")} />
          ))}
        </span>
      </div>
      <div className="relative h-full">{children}</div>
    </div>
  );
}

export function GateStory({ data }: { data: StoryData }) {
  const [active, setActive] = useState(0);
  const blocks = useRef<(HTMLLIElement | null)[]>([]);

  useEffect(() => {
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) if (e.isIntersecting) setActive(Number((e.target as HTMLElement).dataset.i));
      },
      { rootMargin: "-48% 0px -48% 0px" },
    );
    blocks.current.forEach((b) => b && io.observe(b));
    return () => io.disconnect();
  }, []);

  const scene = (i: number, on: boolean) => {
    switch (i) {
      case 0:
        return <KitScene kit={data.kit} />;
      case 1:
        return data.offer ? <OfferScene offer={data.offer} active={on} /> : null;
      case 2:
        return data.approval ? <ApprovalScene approval={data.approval} /> : null;
      case 3:
        return data.gate ? <GateScene gate={data.gate} active={on} /> : null;
      default:
        return data.money ? <MoneyScene money={data.money} active={on} /> : null;
    }
  };

  // Re-keying a scene when it becomes active restarts its entrance animations.
  const stage = (i: number, on: boolean) => (
    <div key={on ? `on-${i}` : `off-${i}`} className="flex h-full items-center justify-center px-6 pb-8 pt-14 sm:px-10">
      {scene(i, on)}
    </div>
  );

  return (
    <section aria-labelledby="walk" className="pt-28">
      <div className="flex flex-wrap items-end justify-between gap-6 border-b border-ink pb-6">
        <h2 id="walk" className="text-[38px] font-semibold leading-[0.98] tracking-[-0.045em] sm:text-[64px]">
          Walk through <span className="font-serif font-normal italic">the gate.</span>
        </h2>
        <p className="max-w-sm text-[14px] leading-relaxed text-ink-2">Five hand-offs, one T-shirt. Everything you see below is drawn from the live demo data, not illustrated.</p>
      </div>

      <div className="grid gap-12 lg:grid-cols-[0.82fr_1.18fr]">
        <ol>
          {STEPS.map((s, i) => (
            <li
              key={s.who}
              ref={(el) => {
                blocks.current[i] = el;
              }}
              data-i={i}
              className="flex flex-col justify-center py-14 lg:min-h-[86vh] lg:py-0"
            >
              <div className={cx("transition-opacity duration-500", active === i ? "opacity-100" : "lg:opacity-25")}>
                <div className="flex items-baseline gap-4">
                  <StageIcon n={i + 1} className="h-16 w-16 self-center text-vermilion" strokeWidth={1.3} />
                  <span className="label text-moss">
                    Stage 0{i + 1} · {s.who}
                  </span>
                </div>
                <h3 className="mt-5 text-[30px] font-semibold leading-[1.02] tracking-[-0.035em] sm:text-[40px]">{s.title}</h3>
                <p className="mt-4 max-w-md text-[16px] leading-relaxed text-ink-2">{s.body}</p>
              </div>
              <Canvas index={i} className="mt-8 min-h-[340px] lg:hidden">
                {stage(i, active === i)}
              </Canvas>
            </li>
          ))}
        </ol>
        <div className="hidden lg:block">
          <div className="sticky top-[11vh] h-[78vh]">
            <Canvas index={active} className="h-full">
              {STEPS.map((_, i) => (
                <div key={i} className={cx("absolute inset-0 transition-opacity duration-500", active === i ? "opacity-100" : "pointer-events-none opacity-0")} aria-hidden={active !== i}>
                  {stage(i, active === i)}
                </div>
              ))}
            </Canvas>
          </div>
        </div>
      </div>

      <div className="mt-6 flex flex-wrap items-center justify-between gap-4 border-t border-sand pt-6">
        <p className="text-sm text-moss">Prefer to watch? Each stage is filmed from inside the app.</p>
        <Link href="/how-it-works" className="group flex items-center gap-2 text-sm font-medium text-ink">
          Watch the walkthroughs <Arrow />
        </Link>
      </div>
    </section>
  );
}
