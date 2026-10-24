import { requirePageRole } from "@/lib/auth";
import { assetsForVersion, latestKitVersion, listKits } from "@/lib/domain/kits";
import { formatDate } from "@/lib/labels";
import { Card, CardHeader, PageHeader } from "@/components/ui";
import { AssetGrid, KitRulesSummary } from "@/components/kit-summary";

export const metadata = { title: "Kit & rules" };

export default async function CreatorKitPage() {
  await requirePageRole("creator");
  const kits = listKits();
  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Authorised starting point"
        stage={1}
        title="Kits you can work with"
        description="Everything here was supplied and approved by the IP owner. Proposals are checked against the latest kit version when you submit."
      />
      {kits.map((k) => {
        const kv = latestKitVersion(k.id);
        if (!kv) return null;
        return (
          <div key={k.id} className="grid gap-6 lg:grid-cols-[1fr_1.1fr]">
            <Card>
              <CardHeader eyebrow={k.owner_org} title={`${k.property_name} · kit v${kv.versionNo}`} subtitle={`Published ${formatDate(kv.publishedAt)}${kv.notes ? ` — ${kv.notes}` : ""}`} />
              <div className="px-5 pb-2 sm:px-6">
                <p className="pt-4 text-sm text-ink-2">{k.summary}</p>
                <KitRulesSummary kv={kv} />
              </div>
            </Card>
            <Card>
              <CardHeader title="Approved artwork" subtitle="Protected files. Templates place them as supplied." />
              <div className="p-5 sm:p-6">
                <AssetGrid assets={assetsForVersion(kv)} />
              </div>
            </Card>
          </div>
        );
      })}
    </div>
  );
}
