import { notFound } from "next/navigation";
import { currentUser } from "@/lib/auth";
import { audienceInsights, defaultKitId, interestFor } from "@/lib/domain/audience";
import { Fuji, Mist, SunEyebrow, Waves } from "@/components/japan";
import { IndiaMap } from "@/components/india-map";
import { Sakura } from "@/components/sakura";
import { PulseForm } from "./pulse-form";

export const metadata = { title: "Fan pulse", description: "Tell an IP owner where you are, what you'd buy and what you'd pay — before anything is made." };

export default async function PulsePage() {
  const kitId = defaultKitId();
  if (!kitId) notFound();
  const user = await currentUser();
  const a = audienceInsights(kitId);
  const mine = user?.role === "fan" ? interestFor(kitId, user.email) : undefined;

  return (
    <div>
      <section data-dark-band className="bleed relative -mt-10 overflow-hidden bg-indigo text-paper sm:-mt-12" aria-labelledby="pulse-title">
        <div className="seigaiha-indigo absolute inset-x-0 bottom-0 h-40 opacity-70 [mask-image:linear-gradient(to_top,black,transparent)]" aria-hidden />
        <Sakura count={10} />
        <div className="relative mx-auto grid max-w-7xl gap-10 px-4 pb-0 pt-14 sm:px-6 lg:grid-cols-[1.1fr_0.9fr] lg:pt-20">
          <div className="pb-16 lg:pb-28">
            <SunEyebrow dark>Fan pulse · {a.kit.property_name}</SunEyebrow>
            <h1 id="pulse-title" className="mt-6 text-[42px] font-semibold leading-[0.95] tracking-[-0.05em] sm:text-[68px]">
              Tell {a.kit.owner_org.replace(/\s+Studio$/, "")} <span className="font-serif font-normal italic text-sakura">you’re here.</span>
            </h1>
            <p className="mt-6 max-w-md text-[16px] leading-relaxed text-paper/70">
              Six quick answers. {a.kit.owner_org} sees where fans are, what they’d buy and what they’d pay — before a single campaign is proposed. Creators use it to aim theirs.
            </p>
            <dl className="mt-10 flex flex-wrap gap-x-10 gap-y-4">
              {[
                ["Fans counted", a.total.toLocaleString("en-IN")],
                ["Cities", a.cities.length],
                ["Already backed a run", `${Math.round(a.conversion.rate * 100)}%`],
              ].map(([k, v]) => (
                <div key={k as string}>
                  <dt className="label text-[10px] text-paper/45">{k}</dt>
                  <dd className="mt-1 font-mono text-[30px] font-semibold leading-none tracking-[-0.04em]">{v}</dd>
                </div>
              ))}
            </dl>
          </div>
          <div className="relative self-end">
            <div className="absolute left-[2%] top-[0%] h-24 w-24 rounded-full bg-vermilion sm:h-32 sm:w-32" aria-hidden />
            <Mist className="absolute inset-x-0 top-[18%] h-20 w-full opacity-30" />
            <IndiaMap cities={a.cities} dark label={`Where ${a.kit.property_name} fans are, by city`} className="relative mx-auto max-w-[420px]" />
          </div>
        </div>
        <Fuji className="pointer-events-none absolute bottom-6 left-[-6%] h-24 w-[46%] text-[#152340] sm:h-32" snow="#d9dfe9" />
        <Waves className="relative block h-12 w-full sm:h-16" fill="var(--color-paper)" crest="var(--color-indigo)" />
      </section>

      <div className="mx-auto mt-12 grid max-w-6xl gap-10 lg:grid-cols-[1fr_300px]">
        <PulseForm kitId={kitId} property={a.kit.property_name} owner={a.kit.owner_org} defaultEmail={user?.role === "fan" ? user.email : undefined} signedInFan={user?.role === "fan"} />
        <aside className="space-y-6 text-sm text-ink-2">
          {mine && (
            <div className="rounded-[var(--radius-card)] border border-sand bg-card p-4">
              <div className="label text-moss">You answered already</div>
              <p className="mt-1">From {mine.city}. Sending again updates your answer.</p>
            </div>
          )}
          <div>
            <div className="label text-moss">Why it matters</div>
            <p className="mt-2 leading-relaxed">Popularity in India is easy to see and hard to act on. A licensor in Tokyo can’t tell whether Guwahati or Pune wants a poster at ₹449 — so most never try. The pulse turns that into a number before anyone commits money.</p>
          </div>
          <div>
            <div className="label text-moss">What happens to your answer</div>
            <ul className="mt-2 space-y-1.5 leading-relaxed">
              <li>Counted in totals by city — never shown individually.</li>
              <li>Your email is kept only to tell you when a campaign opens.</li>
              <li>Signed in as a fan? You also follow the property.</li>
            </ul>
          </div>
          <p className="text-xs text-moss">Demo data: the property, studio and earlier answers are fictional.</p>
        </aside>
      </div>
    </div>
  );
}
