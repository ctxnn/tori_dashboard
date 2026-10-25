import Link from "next/link";
import { redirect } from "next/navigation";
import { SCAN_CAUTION, verifyCode } from "@/lib/domain/authenticity";
import { SELLER } from "@/lib/domain/core";
import { formatDate } from "@/lib/labels";
import { Card, Notice, ProofFrame, Seal, SimBadge } from "@/components/ui";
import { Hanko, SunEyebrow } from "@/components/japan";
import { Preview } from "@/components/preview";
import { AuthTag } from "@/components/auth-tag";
import { LookupForm } from "../lookup-form";
import { ScanBeacon } from "./scan-beacon";

export const metadata = { title: "Verify a product" };

export default async function VerifyCode({ params }: { params: Promise<{ code: string }> }) {
  const { code: raw } = await params;
  // Book and figure tags from the store (T1-…) are checked, and registered, in the fan app.
  if (/^T1-/i.test(decodeURIComponent(raw))) redirect(`/verify?code=${encodeURIComponent(decodeURIComponent(raw).toUpperCase())}`);
  const v = verifyCode(decodeURIComponent(raw));

  if (!v.found) {
    return (
      <div className="mx-auto max-w-2xl">
        <ScanBeacon code={v.code} />
        <div className="rounded-[18px] border border-fail/30 bg-card p-6 sm:p-10">
          <SunEyebrow>Authenticity check</SunEyebrow>
          <h1 className="mt-5 text-[34px] font-semibold leading-[1.02] tracking-[-0.04em] sm:text-[46px]">Not a Torii tag.</h1>
          <p className="mt-4 text-[15px] leading-relaxed text-ink-2">
            <span className="font-mono text-ink">{v.code || "That code"}</span> wasn’t issued for any licensed item. Check for typos — tags look like <span className="font-mono">SC-XXXX-XXXX</span>. If it’s printed exactly like this, the item is probably not official.
          </p>
          <ul className="mt-5 space-y-1.5 text-sm text-moss">
            <li>· This lookup has been recorded, so the licensor can see codes that don’t exist.</li>
            <li>· Bought it from someone claiming it’s official? Ask them for the seller and campaign name.</li>
          </ul>
          <div className="mt-8 max-w-md">
            <LookupForm initial={v.code} />
          </div>
        </div>
      </div>
    );
  }

  const returned = v.orderStatus === "refunded";
  const genuine = v.approved && v.hashMatches && !returned;
  const caution = genuine && v.priorScans >= SCAN_CAUTION;

  return (
    <div className="mx-auto max-w-5xl">
      <ScanBeacon code={v.code} />
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-sand pb-3">
        <SunEyebrow>Authenticity check · {v.code}</SunEyebrow>
        <SimBadge />
      </div>

      <div className="mt-8 grid gap-10 lg:grid-cols-[1fr_300px]">
        <div className="min-w-0">
          <div className="flex items-start gap-5">
            <Hanko lines={genuine ? ["本物", "GENUINE"] : ["確認", "CHECK"]} tone={genuine ? "vermilion" : "ink"} animate className="h-20 w-20 shrink-0 sm:h-24 sm:w-24" label={genuine ? "Genuine" : "Needs checking"} />
            <div>
              <h1 className="text-[34px] font-semibold leading-[1] tracking-[-0.045em] sm:text-[52px]">
                {genuine ? <>Genuine. <span className="font-serif font-normal italic text-vermilion">Officially licensed.</span></> : returned ? "This tag was voided." : "This tag needs checking."}
              </h1>
              <p className="mt-3 text-[15px] text-ink-2">
                {v.title} · {v.product} · No. <span className="font-mono">{String(v.serialNo).padStart(3, "0")}</span> of {v.runSize}
              </p>
            </div>
          </div>

          {returned && <Notice tone="warn" className="mt-6" title="Returned and refunded">The item this tag was issued for was returned. If someone is selling it as new, ask where it came from.</Notice>}
          {!returned && !genuine && <Notice tone="fail" className="mt-6" title="The design no longer matches its approval">The approval on record doesn’t match this design’s fingerprint. Treat it as unverified.</Notice>}
          {caution && (
            <Notice tone="warn" className="mt-6" title={`Checked ${v.priorScans} times before`}>
              That’s normal for an item that has changed hands, but if you’re being sold it as new, the tag may have been copied. First checked {formatDate(v.firstScanAt)}.
            </Notice>
          )}

          <Card className="mt-8 grid gap-6 p-5 sm:grid-cols-[auto_1fr] sm:p-6">
            <Seal sub={`v${v.versionNo} · ${v.contentHash.slice(0, 6)}`} tone={genuine ? "vermilion" : "moss"} className="h-24 w-24" />
            <dl className="grid grid-cols-2 gap-x-6 gap-y-4 text-sm">
              {[
                ["Licensor", v.owner],
                ["Property", v.property],
                ["Approved by", v.approvedBy ?? "—"],
                ["Approved on", formatDate(v.approvedAt)],
                ["Designed by", `${v.creator}, ${v.creatorOrg}`],
                ["Made & shipped by", SELLER.name],
                ["Design version", `v${v.versionNo}`],
                ["Tag issued", formatDate(v.issuedAt)],
              ].map(([k, val]) => (
                <div key={k}>
                  <dt className="label text-moss">{k}</dt>
                  <dd className="mt-0.5 font-medium">{val}</dd>
                </div>
              ))}
              <div className="col-span-2">
                <dt className="label text-moss">Design fingerprint</dt>
                <dd className="mt-0.5 break-all font-mono text-[11.5px] text-ink-2">{v.contentHash}</dd>
              </div>
            </dl>
          </Card>
          <p className="mt-3 text-xs text-moss">{v.credit}. Checked {v.priorScans + 1} time{v.priorScans ? "s" : ""} including this one.</p>

          <div className="mt-10 max-w-md">
            <div className="label mb-2 text-moss">Check another tag</div>
            <LookupForm />
          </div>
        </div>

        <aside className="space-y-6">
          <ProofFrame label={`Approved design v${v.versionNo}`}>
            <div className="overflow-hidden rounded-md bg-[#ECEBE5]">
              <Preview svg={v.previewSvg} label={`${v.title} approved design`} />
            </div>
          </ProofFrame>
          <AuthTag code={v.code} serialNo={v.serialNo} runSize={v.runSize} title={v.title} property={v.property} className="mx-auto" />
          <Link href={`/c/${v.slug}`} className="block text-center text-sm font-medium text-ink underline underline-offset-2">
            See the campaign this came from
          </Link>
        </aside>
      </div>
    </div>
  );
}
