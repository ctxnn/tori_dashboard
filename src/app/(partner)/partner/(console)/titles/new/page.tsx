import { PageHead } from "@/store/components/partner/ui";
import NewTitleForm from "@/store/components/partner/NewTitleForm";
export const metadata = { title: "New title" };
export default function NewTitle() {
  return (
    <div>
      <PageHead en="Start a new title" ja="新規作品の登録" sub="Name the series to create a draft. Nothing is visible to readers until Torii approves it." />
      <NewTitleForm />
    </div>
  );
}
