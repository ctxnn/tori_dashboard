import { currentUser } from "@/lib/auth";
import { listUsers } from "@/lib/domain/core";
import { ROLE_LABEL, ROLE_LABEL_JA } from "@/lib/labels";
import { getT } from "@/lib/i18n";
import { Notice, PageHeader } from "@/components/ui";
import { RoleSwitcher } from "@/components/role-switcher";

export const metadata = { title: "Choose a demo role" };

export default async function SwitchPage({ searchParams }: { searchParams: Promise<{ need?: string; next?: string }> }) {
  const { need, next } = await searchParams;
  const user = await currentUser();
  const t = await getT("owner");
  const users = listUsers().map((u) => ({ id: u.id, name: u.name, role: u.role, roleLabel: t(ROLE_LABEL[u.role], ROLE_LABEL_JA[u.role]), org: u.org, title: u.title, bio: u.bio }));
  const needed = need?.split(",").map((r) => t(ROLE_LABEL[r] ?? r, ROLE_LABEL_JA[r] ?? r));
  return (
    <div>
      <PageHeader
        eyebrow={t("Demo access", "デモ用アクセス")}
        title={t("Who are you in this collaboration?", "このコラボレーションでのお立場をお選びください")}
        description={t(
          "Each person sees and can do different things. Switching is instant; permissions are still enforced on the server for whoever you choose.",
          "お立場ごとに、ご覧いただける内容と操作が異なります。切り替えはすぐに反映され、権限はどなたを選んでもサーバー側で確認されます。",
        )}
      />
      {needed && (
        <Notice tone="warn" title={t("That page needs a different role", "このページは別のお立場でご覧いただけます")} className="mb-6">
          {t(`Continue as ${needed.join(" or ")} to open it.`, `${needed.join("または")}として続けてください。`)}
        </Notice>
      )}
      <RoleSwitcher users={users} currentId={user?.id} next={next} />
    </div>
  );
}
