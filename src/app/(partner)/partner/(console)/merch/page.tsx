import Link from "next/link";
import { requirePartner } from "@/store/lib/partner-auth";
import { merchForOwner } from "@/store/lib/collabs";
import { currentUser as studioUser } from "@/lib/auth";
import { Card, PageHead, Stat } from "@/store/components/partner/ui";
import { CollabTile } from "@/store/components/Collabs";
import { getT } from "@/lib/i18n";
import { yen } from "@/lib/i18n-shared";

export const dynamic = "force-dynamic";
export const metadata = { title: "Merch collabs" };

/**
 * The publisher's merchandise programme. Kits, approvals and statements are run in the Torii
 * workspace; this page shows the same records from the publisher's side.
 */
export default async function Merch() {
  const { org } = await requirePartner("/partner/merch");
  const m = merchForOwner(org.name);
  const studio = await studioUser();
  const t = await getT("partner");
  const orgName = t.ja ? (org.nameJa || org.name) : org.name;
  // The workspace opens straight in for the IP owner chosen at /switch; anyone else picks a person there.
  const workspace = (path: string) => (studio?.role === "owner" ? path : `/switch?need=owner`);

  if (!m.kits.length) {
    return (
      <div className="space-y-6">
        <PageHead en="Merch collabs" ja="グッズ・コラボ" sub={t("Let Indian artists make official merchandise from your series, with your approval on every design.", "インドのアーティストが貴社の作品から公式グッズを制作します。すべてのデザインは、貴社のご承認を経てから販売されます。")} />
        <Card>
          <div className="grid gap-6 lg:grid-cols-[1.2fr_1fr]">
            <div>
              <h2 className="text-[19px] font-bold tracking-[-0.02em]">{t(`${org.name} has no merch kit yet`, `${orgName}様のグッズ用キットはまだございません`)}</h2>
              <p className="mt-2 text-[15px] leading-relaxed text-muted">
                {t(
                  `A kit is your original artwork plus the rules: which products, which regions, the price range, and who at ${org.name} must approve. Indian creators design inside it, the server refuses anything that breaks a rule, and fans pay before anything is made.`,
                  `キットとは、貴社の原画素材と、商品の種類・販売地域・価格帯・ご承認者といったルールをまとめたものです。インドのクリエイターはその範囲内でデザインを行い、ルールに反するものはシステムが自動的に受け付けません。また、ファンの方の事前決済が集まってから生産いたします。`,
                )}
              </p>
              <ul className="mt-4 space-y-2 text-[14.5px]">
                {[
                  t("Approve one exact version: any later change needs fresh approval", "ご承認いただくのは特定の1バージョンのみです。以降の変更には改めてご承認が必要です"),
                  t("Royalty recorded on every delivered unit, on your statement", "お届けした商品ごとにロイヤリティを計上し、明細に記載いたします"),
                  t("Every unit ships with a tag fans can scan to prove it’s real", "すべての商品に、ファンの方が読み取って正規品と確認できるタグが付きます"),
                ].map((line) => (
                  <li key={line} className="flex gap-2"><span aria-hidden className="text-accent">✓</span>{line}</li>
                ))}
              </ul>
              <p className="mt-5 text-[14px] text-muted">{t("Torii sets up kits with each publisher during onboarding. See how Kumo Lantern Studio runs Sky Courier:", "キットは、ご契約時に各出版社さまと一緒に作成いたします。雲灯スタジオさまの『Sky Courier』の事例をご覧ください。")}</p>
              <Link href="/how-it-works" className="btn-ghost mt-3">{t("How collaborations work", "コラボの仕組み")}</Link>
            </div>
            <div className="rounded-xl bg-accentsoft/60 p-5 text-[14px] leading-relaxed">
              <div className="font-bold">{t("What the numbers look like", "実績の目安")}</div>
              <p className="mt-1 text-muted">{t("On the demo series, creators have built five collaborations from one kit, and half the campaigns that closed reached their production gate. The rest were refunded in full.", "デモ作品では、1つのキットから5件のコラボが生まれ、終了したキャンペーンの半数が生産条件を達成しました。達成しなかったものは全額返金されております。")}</p>
              <Link href="/proof" className="mt-3 inline-block font-semibold text-accent underline underline-offset-2">{t("See the proof dashboard", "実績データを見る")}</Link>
            </div>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHead
        en="Merch collabs"
        ja="グッズ・コラボ"
        sub={t(
          `Official merchandise Indian creators have made from ${org.name}’s kits. You approve every design; fans pay before anything is made.`,
          `インドのクリエイターが${orgName}様のキットから制作した公式グッズです。すべてのデザインを貴社にご承認いただき、ファンの方の事前決済が集まってから生産いたします。`,
        )}
      >
        <Link href={workspace("/owner/kit")} className="btn-ghost">{t("Edit the kit", "キットを編集")}</Link>
        <Link href={workspace("/owner")} className="btn-primary">{t(`Open the workspace${m.awaitingApproval ? ` · ${m.awaitingApproval} to approve` : ""}`, `ワークスペースを開く${m.awaitingApproval ? `（承認待ち${m.awaitingApproval}件）` : ""}`)}</Link>
      </PageHead>

      {m.awaitingApproval > 0 && (
        <div role="status" className="flex flex-wrap items-center gap-3 rounded-panel border border-warn/30 bg-warn/10 px-5 py-4 text-[14.5px]">
          <b className="text-warn">{t(`${m.awaitingApproval} design${m.awaitingApproval === 1 ? "" : "s"} waiting for your approval`, `ご承認をお待ちしているデザインが${m.awaitingApproval}件ございます`)}</b>
          <span className="text-fg/80">{t("Each one has passed the kit’s rule checks. Approving binds to that exact version.", "いずれもキットのルールチェックを通過しております。ご承認は、その特定のバージョンに対して行われます。")}</span>
          <Link href={workspace("/owner")} className="ml-auto font-semibold text-accent underline underline-offset-2">{t("Review now", "確認する")}</Link>
        </div>
      )}

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat label={t("Kits published", "公開中のキット")} value={String(m.kits.length)} sub={m.kits.map((k) => k.property).join(", ")} />
        <Stat label={t("Collaborations", "コラボ件数")} value={String(m.collabs.length)} sub={t(`${m.collabs.filter((c) => c.open).length} taking preorders now`, `うち予約受付中 ${m.collabs.filter((c) => c.open).length}件`)} />
        <Stat label={t("Units backed by fans", "ファンの予約数")} value={m.unitsBacked.toLocaleString("en-IN")} sub={t("paid before production", "生産前に決済済み")} />
        <Stat strong label={t("Royalty earned", "ロイヤリティ")} value={m.royalty} sub={t("recognised on delivery", `約${yen(m.royaltyMinor)} · お届け時に計上`)} />
      </div>

      <Card title="Collaborations" ja="コラボ一覧" action={<Link href="/collabs" className="text-[13.5px] font-semibold text-accent">{t("As fans see them", "ファン向けの表示")}</Link>}>
        {m.collabs.length ? (
          <ul className="grid grid-cols-2 gap-x-4 gap-y-6 sm:grid-cols-3 xl:grid-cols-4">
            {m.collabs.map((c) => <li key={c.slug}><CollabTile c={c} /></li>)}
          </ul>
        ) : <p className="text-[14px] text-muted">{t("No published collaborations yet. Approved designs appear here once the creator publishes them.", "公開中のコラボはまだございません。ご承認いただいたデザインは、クリエイターが公開した時点でこちらに表示されます。")}</p>}
      </Card>
    </div>
  );
}
