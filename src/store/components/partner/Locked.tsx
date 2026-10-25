"use client";
import { Card } from "./ui";
import { useT } from "@/components/i18n-client";

export default function Locked({ name }: { name: string }) {
  const t = useT();
  return (
    <Card>
      <div className="py-8 text-center">
        <div className="text-[18px] font-bold">{t(`Available once ${name} is verified`, `${name}様の確認完了後にご覧いただけます`)}</div>
        <p className="mx-auto mt-2 max-w-md text-[14.5px] text-muted">
          {t(
            "Sales and reading data are shared only with verified rights holders. Torii is checking your company now, usually within two working days.",
            "販売・閲覧データは、確認済みの権利者さまにのみ共有しております。現在、貴社の確認を進めております（通常2営業日以内）。",
          )}
        </p>
      </div>
    </Card>
  );
}
