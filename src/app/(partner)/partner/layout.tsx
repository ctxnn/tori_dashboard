import { Suspense } from "react";
import { uiMode } from "@/lib/ui-mode";
import { langFor } from "@/lib/i18n";
import { UiSwitch } from "@/components/v2/ui-switch";
import { LangProvider, LangSwitch } from "@/components/i18n-client";

export const metadata = { title: { default: "Partner Portal", template: "%s | Torii Partner Portal" } };
/** Everything under /partner: the portal Japanese publishers use to bring their series to Torii. */
export default async function PartnerRoot({ children }: { children: React.ReactNode }) {
  const lang = await langFor("partner");
  return (
    <div data-section="partner" lang={lang} className="store-root partner-root flex-1 antialiased">
      <LangProvider lang={lang}>
        {children}
        <Suspense>
          <LangSwitch lang={lang} />
          <UiSwitch mode={await uiMode()} />
        </Suspense>
      </LangProvider>
    </div>
  );
}
