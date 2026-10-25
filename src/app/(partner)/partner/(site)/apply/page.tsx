import ApplyForm from "@/store/components/partner/ApplyForm";
import { PARTNER_TERMS } from "@/store/lib/config";
import { getT } from "@/lib/i18n";

export const metadata = { title: "Join the partner programme" };
const pct = (n: number) => `${Math.round(n * 100)}%`;

export default async function Apply() {
  const t = await getT("partner");
  return (
    <div className="mx-auto max-w-3xl px-5 py-12 sm:px-8 md:py-16">
      <div className="jp text-[13px] tracking-[.1em] text-accent">{t("パートナー登録", "Partner registration")}</div>
      <h1 className="mt-2 font-display text-[clamp(30px,4vw,44px)] leading-[1.05]">{t("Join the Torii partner programme", "Toriiパートナープログラムへのご登録")}</h1>
      <p className="mb-8 mt-3 max-w-xl text-[15.5px] leading-relaxed text-muted">{t("Takes two minutes. You can start preparing titles straight away; they go live once Torii has verified your company.", "ご登録は2分ほどで完了します。登録後すぐに作品の準備を始めていただけます。配信は、弊社にて貴社の確認が完了した後に開始されます。")}</p>
      <ApplyForm terms={{ version: PARTNER_TERMS.version, unlock: pct(PARTNER_TERMS.unlockShare), print: pct(PARTNER_TERMS.printShare), figure: pct(PARTNER_TERMS.figureShare), payoutDays: PARTNER_TERMS.payoutDays }} />
    </div>
  );
}
