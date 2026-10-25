import { requirePageRole } from "@/lib/auth";
import { latestKitVersion, listAssets, listKitVersions, listKits, ownerTeam } from "@/lib/domain/kits";
import { getUser } from "@/lib/domain/core";
import { listCampaigns, listVersions } from "@/lib/domain/campaigns";
import { formatDate } from "@/lib/labels";
import { TERRITORIES_JA } from "@/lib/catalog";
import { getT } from "@/lib/i18n";
import { Badge, Card, CardHeader, PageHeader } from "@/components/ui";
import { AssetGrid, KitRulesSummary } from "@/components/kit-summary";
import { UploadAsset } from "./upload-asset";
import { KitVersionEditor } from "./kit-version-editor";

export const metadata = { title: "Asset kit" };

export default async function OwnerKitPage() {
  const user = await requirePageRole("owner");
  const t = await getT("owner");
  const kit = listKits().find((k) => k.owner_org === user.org);
  if (!kit) return <p>{t("No kit for your organisation.", "貴社のキットはまだございません。")}</p>;
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
        eyebrow={t(`${kit.owner_org} · Authorised asset kit`, `${kit.owner_org} · 許諾アセットキット`)}
        stage={1}
        t={t}
        meta={[
          [t("In force", "適用中"), `v${kv.versionNo}`],
          [t("Assets", "素材"), `${kv.assetIds.length}/${assets.length}`],
          [t("Territory", "販売地域"), kv.rules.territories.map((x) => t(x, TERRITORIES_JA[x] ?? x)).join(", ")],
        ]}
        title={t(`${kit.property_name} kit`, `『${kit.property_name}』キット`)}
        description={t(
          "Artwork files plus the explicit rules creators must work within. Publishing creates a new immutable version; existing proposals stay tied to the version they were made under.",
          "素材ファイルと、クリエイターが守るべきルールをまとめたものです。公開するたびに変更できない新しいバージョンが作成され、既存の企画は作成時のバージョンに紐づいたままとなります。",
        )}
      />

      <div className="grid gap-6 lg:grid-cols-[1.05fr_1fr]">
        <Card>
          <CardHeader
            eyebrow={t("In force now", "現在適用中")}
            title={t(`Kit v${kv.versionNo}`, `キット第${kv.versionNo}版`)}
            subtitle={t(
              `Published ${formatDate(kv.publishedAt)} by ${getUser(kv.publishedBy)?.name}${kv.notes ? ` — ${kv.notes}` : ""}`,
              `${t.date(kv.publishedAt)}公開（${getUser(kv.publishedBy)?.name}）${kv.notes ? ` — ${kv.notes}` : ""}`,
            )}
          />
          <div className="px-5 pb-3 sm:px-6">
            <KitRulesSummary kv={kv} t={t} />
          </div>
        </Card>
        <Card>
          <CardHeader eyebrow={t("History", "履歴")} title={t("Kit versions", "キットのバージョン")} subtitle={t("Rules can change; past approvals keep the rules they were judged against.", "ルールは変更できますが、過去の承認は判断時のルールに基づいたままとなります。")} />
          <ol className="divide-y divide-sand">
            {versions.map((v) => (
              <li key={v.id} className="flex items-start justify-between gap-3 px-5 py-3 sm:px-6">
                <div>
                  <div className="font-medium">{t(`Version ${v.versionNo}`, `第${v.versionNo}版`)}</div>
                  <div className="text-sm text-moss">{t.date(v.publishedAt)} · {v.notes || t("No notes", "メモなし")}</div>
                </div>
                <div className="flex shrink-0 flex-col items-end gap-1">
                  {v.id === kv.id && <Badge tone="pine">{t("Current", "適用中")}</Badge>}
                  <span className="text-xs text-moss">{t(`${usage.get(v.id) ?? 0} proposal version${usage.get(v.id) === 1 ? "" : "s"}`, `企画バージョン ${usage.get(v.id) ?? 0}件`)}</span>
                </div>
              </li>
            ))}
          </ol>
        </Card>
      </div>

      <Card>
        <CardHeader title={t("Artwork library", "素材ライブラリ")} subtitle={t("Upload original artwork, then include it in a kit version to make it available to creators.", "原画素材をアップロードし、キットのバージョンに含めることで、クリエイターが利用できるようになります。")} />
        <div className="grid gap-6 p-5 sm:p-6 lg:grid-cols-[1fr_300px]">
          <AssetGrid assets={assets} approvedIds={kv.assetIds} t={t} />
          <UploadAsset kitId={kit.id} />
        </div>
      </Card>

      <Card>
        <CardHeader eyebrow={t("Change the rules", "ルールの変更")} title={t(`Publish kit v${kv.versionNo + 1}`, `キット第${kv.versionNo + 1}版を公開`)} subtitle={t("Starts from the current rules. Creators’ next saves and submissions use the new version.", "現在のルールをもとに作成します。クリエイターの次回以降の保存・申請には、新しいバージョンが適用されます。")} />
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
