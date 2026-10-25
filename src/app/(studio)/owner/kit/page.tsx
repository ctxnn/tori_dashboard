import { requirePageRole } from "@/lib/auth";
import { latestKitVersion, listAssets, listKitVersions, listKits, ownerTeam } from "@/lib/domain/kits";
import { getUser } from "@/lib/domain/core";
import { listCampaigns, listVersions } from "@/lib/domain/campaigns";
import { formatDate } from "@/lib/labels";
import { Badge, Card, CardHeader, PageHeader } from "@/components/ui";
import { AssetGrid, KitRulesSummary } from "@/components/kit-summary";
import { UploadAsset } from "./upload-asset";
import { KitVersionEditor } from "./kit-version-editor";

export const metadata = { title: "Asset kit" };

export default async function OwnerKitPage() {
  const user = await requirePageRole("owner");
  const kit = listKits().find((k) => k.owner_org === user.org);
  if (!kit) return <p>No kit for your organisation.</p>;
  const kv = latestKitVersion(kit.id)!;
  const versions = listKitVersions(kit.id);
  const assets = listAssets(kit.id);
  const team = ownerTeam(user.org).map((u) => ({ id: u.id, name: u.name, title: u.title }));
  // How many campaign versions reference each kit version: proposals stay tied to one.
  const usage = new Map<string, number>();
  for (const c of listCampaigns({ kitIds: [kit.id] })) for (const v of listVersions(c.id)) usage.set(v.kitVersionId, (usage.get(v.kitVersionId) ?? 0) + 1);

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow={`${kit.owner_org} · Authorised asset kit`}
        stage={1}
        meta={[["In force", `v${kv.versionNo}`], ["Assets", `${kv.assetIds.length}/${assets.length}`], ["Territory", kv.rules.territories.join(", ")]]}
        title={`${kit.property_name} kit`}
        description="Artwork files plus the explicit rules creators must work within. Publishing creates a new immutable version; existing proposals stay tied to the version they were made under."
      />

      <div className="grid gap-6 lg:grid-cols-[1.05fr_1fr]">
        <Card>
          <CardHeader eyebrow="In force now" title={`Kit v${kv.versionNo}`} subtitle={`Published ${formatDate(kv.publishedAt)} by ${getUser(kv.publishedBy)?.name}${kv.notes ? ` — ${kv.notes}` : ""}`} />
          <div className="px-5 pb-3 sm:px-6">
            <KitRulesSummary kv={kv} />
          </div>
        </Card>
        <Card>
          <CardHeader eyebrow="History" title="Kit versions" subtitle="Rules can change; past approvals keep the rules they were judged against." />
          <ol className="divide-y divide-sand">
            {versions.map((v) => (
              <li key={v.id} className="flex items-start justify-between gap-3 px-5 py-3 sm:px-6">
                <div>
                  <div className="font-medium">Version {v.versionNo}</div>
                  <div className="text-sm text-moss">{formatDate(v.publishedAt)} · {v.notes || "No notes"}</div>
                </div>
                <div className="flex shrink-0 flex-col items-end gap-1">
                  {v.id === kv.id && <Badge tone="pine">Current</Badge>}
                  <span className="text-xs text-moss">{usage.get(v.id) ?? 0} proposal version{usage.get(v.id) === 1 ? "" : "s"}</span>
                </div>
              </li>
            ))}
          </ol>
        </Card>
      </div>

      <Card>
        <CardHeader title="Artwork library" subtitle="Upload original artwork, then include it in a kit version to make it available to creators." />
        <div className="grid gap-6 p-5 sm:p-6 lg:grid-cols-[1fr_300px]">
          <AssetGrid assets={assets} approvedIds={kv.assetIds} />
          <UploadAsset kitId={kit.id} />
        </div>
      </Card>

      <Card>
        <CardHeader eyebrow="Change the rules" title={`Publish kit v${kv.versionNo + 1}`} subtitle="Starts from the current rules. Creators’ next saves and submissions use the new version." />
        <div className="p-5 sm:p-6">
          <KitVersionEditor
            kitId={kit.id}
            current={kv.rules}
            currentAssetIds={kv.assetIds}
            assets={assets.map((a) => ({ id: a.id, code: a.code, name: a.name }))}
            team={team}
          />
        </div>
      </Card>
    </div>
  );
}
