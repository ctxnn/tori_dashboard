import { Suspense } from "react";
import { uiMode } from "@/lib/ui-mode";
import { UiSwitch } from "@/components/v2/ui-switch";

export const metadata = { title: { default: "Partner Portal", template: "%s | Torii Partner Portal" } };
/** Everything under /partner: the portal Japanese publishers use to bring their series to Torii. */
export default async function PartnerRoot({ children }: { children: React.ReactNode }) {
  return (
    <div data-section="partner" className="store-root partner-root flex-1 antialiased">
      {children}
      <Suspense>
        <UiSwitch mode={await uiMode()} />
      </Suspense>
    </div>
  );
}
