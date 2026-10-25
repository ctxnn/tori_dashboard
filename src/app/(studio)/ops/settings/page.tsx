import { requirePageRole } from "@/lib/auth";
import { getCostAssumptions, getPlatformTerms } from "@/lib/domain/core";
import { Card, CardHeader, Notice, PageHeader } from "@/components/ui";
import { SettingsForm } from "./settings-form";

export const metadata = { title: "Terms & assumptions" };

export default async function SettingsPage() {
  await requirePageRole("operator");
  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Illustrative commercial terms"
        title="Terms & cost assumptions"
        description="Platform terms are copied into each campaign version when it’s saved, so changing them affects new versions only — and a changed version needs fresh approval. Cost assumptions only affect estimates on statements."
      />
      <Notice tone="gold" title="Demonstration values">These are illustrative numbers for discussion with partners, not offered commercial terms.</Notice>
      <Card>
        <CardHeader title="Settings" />
        <div className="p-5 sm:p-6">
          <SettingsForm terms={getPlatformTerms()} costs={getCostAssumptions()} />
        </div>
      </Card>
    </div>
  );
}
