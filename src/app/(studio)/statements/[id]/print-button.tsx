"use client";

import { Button } from "@/components/ui";
import { useT } from "@/components/i18n-client";

export function PrintButton() {
  const t = useT();
  return (
    <Button size="sm" variant="secondary" onClick={() => window.print()}>
      {t("Print / PDF", "印刷 / PDF")}
    </Button>
  );
}
