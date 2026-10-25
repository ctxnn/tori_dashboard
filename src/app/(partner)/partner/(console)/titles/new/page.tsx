import { PageHead } from "@/store/components/partner/ui";
import NewTitleForm from "@/store/components/partner/NewTitleForm";
import { getT } from "@/lib/i18n";
export const metadata = { title: "New title" };
export default async function NewTitle() {
  const t = await getT("partner");
  return (
    <div>
      <PageHead
        en="Start a new title"
        ja="新規作品の登録"
        sub={t("Name the series to create a draft. Nothing is visible to readers until Torii approves it.", "作品名をご入力いただくと下書きが作成されます。弊社の承認までは、読者に公開されることはございません。")}
      />
      <NewTitleForm />
    </div>
  );
}
