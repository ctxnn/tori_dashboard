// Japanese for the review history the Partner Portal records in English. Client-safe.

const FIXED: Record<string, string> = {
  "Created the draft": "下書きを作成しました",
  "Sent for review": "審査を申請しました",
  "Sent back for review with changes": "修正のうえ、再度審査を申請しました",
  "Withdrew from review": "審査の申請を取り下げました",
  "Asked for changes": "修正をお願いいたしました",
  "Taken down until changes are made": "修正いただくまで、配信を一時停止いたしました",
  "Not accepted": "誠に恐れ入りますが、今回は見送らせていただきました",
  "Approved. Goes live when chapter 1 is released": "承認いたしました。第1話の配信開始とともに公開されます",
};

export function actionJa(action: string): string {
  if (FIXED[action]) return FIXED[action];
  let m = action.match(/^Approved\. Live on Torii with (\d+) chapters?$/);
  if (m) return `承認いたしました。${m[1]}話を配信中です`;
  m = action.match(/^Scheduled chapter (\d+) for (.+)$/);
  if (m) return `第${m[1]}話の配信を予約しました（${m[2]}）`;
  m = action.match(/^Released chapter (\d+)$/);
  if (m) return `第${m[1]}話を配信しました`;
  return action;
}
