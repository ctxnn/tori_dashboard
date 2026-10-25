import Link from "next/link";
import { requirePageRole } from "@/lib/auth";
import { getCampaign, getVersion } from "@/lib/domain/campaigns";
import { campaignProgress, listOrdersForFan } from "@/lib/domain/orders";
import { passportFor } from "@/lib/domain/community";
import { defaultKitId, interestFor } from "@/lib/domain/audience";
import { ORDER_STATUS, formatDate } from "@/lib/labels";
import { formatINR } from "@/lib/money";
import { Arrow, Badge, Card, EmptyState, LinkButton, SimBadge, StageRail } from "@/components/ui";
import { Preview } from "@/components/preview";
import { Hanko, Mist, SunEyebrow } from "@/components/japan";
import { AuthTag } from "@/components/auth-tag";
import { FollowButton } from "@/components/follow-button";
import { Sakura } from "@/components/sakura";

export const metadata = { title: "Passport" };

const initials = (title: string) =>
  title
    .split(/\s+/)
    .filter((w) => !/^(the|of|a)$/i.test(w))
    .map((w) => w[0])
    .join("")
    .slice(0, 3)
    .toUpperCase();

export default async function FanPassport() {
  const user = await requirePageRole("fan");
  const p = passportFor(user);
  const orders = listOrdersForFan(user.id);
  const kitId = defaultKitId();
  const answered = kitId ? !!interestFor(kitId, user.email) : true;
  const early = p.drops.filter((d) => d.earlyAccess && !d.alreadyBacked);
  const tags = p.stamps.flatMap((s) => s.codes.map((c) => ({ ...c, title: s.title, property: s.property, runSize: s.runSize })));

  return (
    <div className="space-y-12">
      <section data-dark-band className="bleed relative -mt-10 overflow-hidden bg-ink text-paper sm:-mt-12" aria-labelledby="passport-title">
        <div className="shippo-dark absolute inset-0" aria-hidden />
        <Sakura count={8} />
        <Mist className="absolute inset-x-0 bottom-6 h-24 w-full opacity-20" />
        <div className="relative mx-auto grid max-w-7xl gap-10 px-4 py-14 sm:px-6 lg:grid-cols-[1fr_auto] lg:items-end lg:py-20">
          <div>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <SunEyebrow dark>Fan passport</SunEyebrow>
              <StageRail current={5} dark className="lg:hidden" />
            </div>
            <h1 id="passport-title" className="mt-6 text-[42px] font-semibold leading-[0.95] tracking-[-0.05em] sm:text-[68px]">
              {user.name.split(" ")[0]}’s <span className="font-serif font-normal italic text-sakura">stamp book.</span>
            </h1>
            <p className="mt-5 max-w-lg text-[16px] leading-relaxed text-paper/65">
              One stamp for every run you helped make happen. Backers get a day’s head start on the next drop from the properties and creators they follow.
            </p>
            <dl className="mt-9 flex flex-wrap gap-x-10 gap-y-4">
              {[
                ["Runs backed", p.stamps.length],
                ["Delivered", p.stamps.filter((s) => s.status === "delivered").length],
                ["Backer since", p.since ? formatDate(p.since, { month: "short", year: "numeric" }) : "—"],
                ["Following", p.follows.length],
              ].map(([k, v]) => (
                <div key={k as string}>
                  <dt className="label text-[10px] text-paper/45">{k}</dt>
                  <dd className="mt-1 font-mono text-[28px] font-semibold leading-none tracking-[-0.04em]">{v}</dd>
                </div>
              ))}
            </dl>
          </div>
          <div className="hidden lg:block">
            <StageRail current={5} dark />
          </div>
        </div>
      </section>

      {early.map((d) => (
        <section key={d.slug} className="relative overflow-hidden rounded-[18px] bg-vermilion text-white" aria-label="Backers' day">
          <div className="seigaiha-red absolute inset-0 opacity-60 [mask-image:linear-gradient(to_left,black,transparent_70%)]" aria-hidden />
          <div className="relative flex flex-col gap-5 p-6 sm:flex-row sm:items-center sm:justify-between sm:p-8">
            <div>
              <div className="label text-[10px] text-white/70">Backers’ day · today only</div>
              <h2 className="mt-2 text-[26px] font-semibold leading-tight tracking-[-0.03em] sm:text-[32px]">{d.title} is open to you first.</h2>
              <p className="mt-2 max-w-xl text-[14.5px] text-white/85">
                You backed an earlier {p.stamps[0]?.property} run, so you can preorder today. Everyone else gets in on {formatDate(d.phase.launchDate)}. {d.why}.
              </p>
            </div>
            <Link href={`/c/${d.slug}`} className="group inline-flex h-12 shrink-0 items-center gap-2 self-start rounded-lg bg-white px-5 text-[15px] font-medium text-ink sm:self-auto">
              Preorder · {formatINR(d.priceMinor)} <Arrow />
            </Link>
          </div>
        </section>
      ))}

      <section aria-labelledby="stamps">
        <div className="mb-5 flex flex-wrap items-end justify-between gap-3 border-b border-ink pb-4">
          <h2 id="stamps" className="text-[28px] font-semibold tracking-[-0.035em] sm:text-[36px]">Stamps</h2>
          <Link href="/campaigns" className="group flex items-center gap-2 text-sm font-medium">Find another run <Arrow /></Link>
        </div>
        {p.stamps.length === 0 ? (
          <EmptyState title="No stamps yet" action={<LinkButton href="/campaigns">Find a campaign</LinkButton>}>Back a campaign and its stamp lands here once your payment is confirmed.</EmptyState>
        ) : (
          <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {p.stamps.map((s, i) => {
              const c = getCampaign(s.campaignId)!;
              const prog = campaignProgress(c);
              const missed = c.sales_status === "live" && prog.deadlinePassed && !prog.thresholdMet;
              const st = missed ? { label: "Missed its gate · refund due", tone: "warn" as const } : ORDER_STATUS[s.status];
              return (
                <li key={s.orderRef}>
                  <Link href={`/orders/${s.orderRef}?t=${s.orderToken}`} className="group relative block overflow-hidden rounded-[14px] border border-sand bg-[#f7f2e7] p-5 transition hover:shadow-[var(--shadow-lift)]">
                    <div className="washi pointer-events-none absolute inset-0" aria-hidden />
                    <div className="relative flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="label text-[9.5px] text-moss">No. {String(i + 1).padStart(2, "0")} · {formatDate(s.paidAt)}</div>
                        <div className="mt-1.5 text-[17px] font-semibold leading-tight tracking-[-0.02em]">{s.title}</div>
                        <div className="mt-1 text-[12.5px] text-moss">by {s.creator} · v{s.versionNo}</div>
                      </div>
                      <Hanko lines={[initials(s.title), formatDate(s.paidAt, { month: "short", year: "2-digit" }).toUpperCase()]} tone={missed ? "ink" : "vermilion"} className="h-[72px] w-[72px] shrink-0 transition-transform group-hover:rotate-0" />
                    </div>
                    <div className="relative mt-4 flex items-end justify-between gap-3">
                      <Preview svg={s.previewSvg} className="w-20 overflow-hidden rounded-md bg-[#ECEBE5]" />
                      <Badge tone={st.tone}>{st.label}</Badge>
                    </div>
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
        {p.refunded.length > 0 && (
          <p className="mt-4 text-sm text-moss">
            Refunded, no stamp: {p.refunded.map((r, i) => <span key={r.orderRef}>{i ? ", " : ""}<Link className="underline" href={`/orders/${r.orderRef}?t=${r.orderToken}`}>{r.title}</Link></span>)}
          </p>
        )}
      </section>

      {tags.length > 0 && (
        <section aria-labelledby="tags" className="grid gap-8 lg:grid-cols-[1fr_auto] lg:items-center">
          <div>
            <h2 id="tags" className="text-[24px] font-semibold tracking-[-0.03em]">Your authenticity tags</h2>
            <p className="mt-2 max-w-md text-[14.5px] leading-relaxed text-ink-2">
              Each delivered item came with its own numbered tag. Anyone can scan it to confirm it’s licensed — useful if you ever resell or gift it.
            </p>
          </div>
          <ul className="flex flex-wrap gap-5">
            {tags.map((t) => (
              <li key={t.code}>
                <AuthTag {...t} />
              </li>
            ))}
          </ul>
        </section>
      )}

      <section className="grid gap-6 lg:grid-cols-2">
        <Card className="p-5 sm:p-6">
          <h2 className="text-[17px] font-semibold">Drops from what you follow</h2>
          {p.drops.length === 0 ? (
            <p className="mt-2 text-sm text-moss">Nothing open right now. Follow a property or creator to hear first.</p>
          ) : (
            <ul className="mt-3 divide-y divide-sand">
              {p.drops.map((d) => (
                <li key={d.slug} className="flex flex-wrap items-center justify-between gap-3 py-3">
                  <div className="min-w-0">
                    <Link href={`/c/${d.slug}`} className="font-medium hover:underline">{d.title}</Link>
                    <div className="text-[12.5px] text-moss">{d.why} · {formatINR(d.priceMinor)}</div>
                  </div>
                  {d.alreadyBacked ? <Badge tone="ok">Backed</Badge> : d.phase.phase === "open" ? <Badge tone="vermilion">Open now</Badge> : d.earlyAccess ? <Badge tone="gold">Backers’ day</Badge> : <Badge>Opens {formatDate(d.phase.launchDate)}</Badge>}
                </li>
              ))}
            </ul>
          )}
        </Card>
        <Card className="p-5 sm:p-6">
          <h2 className="text-[17px] font-semibold">Following</h2>
          {p.follows.length === 0 ? (
            <p className="mt-2 text-sm text-moss">You don’t follow anyone yet. Follow from any campaign page.</p>
          ) : (
            <ul className="mt-3 divide-y divide-sand">
              {p.follows.map((f) => (
                <li key={`${f.type}-${f.id}`} className="flex flex-wrap items-center justify-between gap-3 py-3">
                  <div>
                    <div className="font-medium">{f.label}</div>
                    <div className="text-[12.5px] text-moss">{f.type === "kit" ? "Property" : "Creator"} · {f.sub} · since {formatDate(f.since)}</div>
                  </div>
                  <FollowButton targetType={f.type} targetId={f.id} label="" initial signedInFan />
                </li>
              ))}
            </ul>
          )}
          {!answered && (
            <Link href="/pulse" className="group mt-4 flex items-center justify-between gap-3 rounded-lg bg-indigo px-4 py-3 text-sm text-paper">
              <span>Tell the studio what you’d buy next — six quick answers.</span>
              <Arrow />
            </Link>
          )}
        </Card>
      </section>

      <section aria-labelledby="history">
        <h2 id="history" className="mb-3 text-[17px] font-semibold">Order history</h2>
        <ul className="divide-y divide-sand rounded-[var(--radius-card)] border border-sand bg-card">
          {orders.map((o) => {
            const v = getVersion(o.campaign_version_id)!;
            const st = ORDER_STATUS[o.status];
            return (
              <li key={o.id}>
                <Link href={`/orders/${o.public_ref}?t=${o.access_token}`} className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 hover:bg-ivory/50 sm:px-5">
                  <span className="min-w-0">
                    <span className="font-medium">{v.content.copy.title}</span>
                    <span className="ml-2 font-mono text-xs text-moss">{o.public_ref} · {o.quantity} × {o.size} · {formatINR(o.total_minor)}</span>
                  </span>
                  <span className="flex items-center gap-2">
                    {!o.livemode && <SimBadge />}
                    <Badge tone={st.tone}>{st.label}</Badge>
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>
      </section>
    </div>
  );
}
