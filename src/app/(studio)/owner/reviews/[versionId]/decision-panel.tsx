"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { api } from "@/components/client-api";
import { Button, Notice, Seal, Textarea } from "@/components/ui";
import { useT } from "@/components/i18n-client";

type Decision = "approved" | "changes_requested" | "rejected";

export function DecisionPanel(props: { versionId: string; versionNo: number; contentHash: string; canApprove: boolean; approverName: string; hasFailures: boolean }) {
  const router = useRouter();
  const t = useT();
  const [comment, setComment] = useState("");
  const [busy, setBusy] = useState<Decision | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<string | null>(null);
  const [approved, setApproved] = useState(false);

  async function decide(decision: Decision) {
    setBusy(decision);
    setError(null);
    try {
      await api(`/api/versions/${props.versionId}/review`, { decision, comment, expectedHash: props.contentHash });
      setApproved(decision === "approved");
      setDone(
        decision === "approved"
          ? t(`Version ${props.versionNo} approved. The creator can now publish it.`, `バージョン${props.versionNo}を承認いたしました。クリエイターが公開できるようになりました。`)
          : decision === "rejected"
            ? t("Proposal rejected. The creator has been told why.", "企画を見送りといたしました。理由はクリエイターにお伝えしております。")
            : t("Changes requested. The creator will see your note.", "修正をご依頼いたしました。コメントはクリエイターに届きます。"),
      );
      router.refresh();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(null);
    }
  }

  if (done)
    return (
      <div className="mt-4 flex items-center gap-4">
        {approved && <Seal label={t("Approved", "Approved")} sub={`v${props.versionNo} · ${props.contentHash.slice(0, 6)}`} className="h-24 w-24 shrink-0 animate-rise" />}
        <p className="text-sm text-ink-2" role="status">{done}</p>
      </div>
    );

  return (
    <div className="mt-3 space-y-3">
      <label htmlFor="review-comment" className="block text-sm font-medium">{t("Note to the creator", "クリエイターへのコメント")}</label>
      <Textarea id="review-comment" value={comment} onChange={(e) => setComment(e.target.value)} rows={3} placeholder={t("Required when requesting changes or rejecting.", "修正のご依頼や見送りの際は、ご記入をお願いいたします。")} />
      {error && <Notice tone="fail">{error}</Notice>}
      <div className="flex flex-col gap-2">
        <Button onClick={() => decide("approved")} disabled={!!busy || !props.canApprove || props.hasFailures}>
          {busy === "approved" ? t("Approving…", "承認しています…") : t(`Approve version ${props.versionNo}`, `バージョン${props.versionNo}を承認する`)}
        </Button>
        {!props.canApprove && <p className="text-xs text-warn">{t(`Kit rules require approval from ${props.approverName}. You can still request changes or reject.`, `キットのルールにより、承認は${props.approverName}様が行います。修正のご依頼や見送りは可能です。`)}</p>}
        {props.hasFailures && <p className="text-xs text-fail">{t("Rule checks are failing, so this version can’t be approved.", "ルールチェックに不適合があるため、このバージョンは承認できません。")}</p>}
        <div className="grid grid-cols-2 gap-2">
          <Button variant="secondary" onClick={() => decide("changes_requested")} disabled={!!busy || comment.trim().length < 3}>
            {busy === "changes_requested" ? t("Sending…", "送信中…") : t("Request changes", "修正を依頼する")}
          </Button>
          <Button variant="danger" onClick={() => decide("rejected")} disabled={!!busy || comment.trim().length < 3}>
            {busy === "rejected" ? t("Rejecting…", "処理中…") : t("Reject", "見送る")}
          </Button>
        </div>
      </div>
      <p className="text-xs leading-relaxed text-moss">
        {t(
          <>Approval is recorded against fingerprint <span className="font-mono">{props.contentHash.slice(0, 12)}</span>. Any later edit creates a new version that needs a fresh decision.</>,
          <>ご承認は、フィンガープリント <span className="font-mono">{props.contentHash.slice(0, 12)}</span> に対して記録されます。以降に編集があった場合は新しいバージョンとなり、改めてご判断をお願いすることになります。</>,
        )}
      </p>
    </div>
  );
}
