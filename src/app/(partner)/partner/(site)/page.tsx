import Link from "next/link";
import { read } from "@/store/lib/db";
import { currentPartner } from "@/store/lib/partner-auth";
import { CHAPTER_PRICE, PARTNER_TERMS } from "@/store/lib/config";
import { LANGS } from "@/store/lib/types";
import { Cover } from "@/store/components/Art";
import { getT } from "@/lib/i18n";

export const dynamic = "force-dynamic";
export const metadata = { title: "Bring your manga to India" };

const pct = (n: number) => `${Math.round(n * 100)}%`;

export default async function PartnerLanding() {
  const [db, me, t] = await Promise.all([read(), currentPartner(), getT("partner")]);
  const since = Date.now() - 90 * 864e5;
  const recent = db.events.filter((e) => Date.parse(e.createdAt) > since);
  const reads = recent.filter((e) => e.type === "read").length;
  const states = new Set(recent.map((e) => e.state).filter((s) => s !== "Unknown")).size;
  const shelf = [...db.series].sort((a, b) => b.popularity - a.popularity).slice(0, 6);
  const unlockCut = (CHAPTER_PRICE * PARTNER_TERMS.unlockShare).toFixed(2);

  const steps = [
    { n: "01", en: "Join and get verified", ja: "参加登録・審査", body: t("Create a company account and accept the standard terms. Torii checks your company and rights, usually within two working days.", "企業アカウントを作成し、標準契約条件にご同意ください。貴社情報と権利関係を、通常2営業日以内に確認いたします。") },
    { n: "02", en: "Submit a series", ja: "作品の申請", body: t("Add the details, cover, licensed languages and rights, then upload chapters as images or a .cbz/.zip. Pages are optimised for Indian mobile data in your browser.", "作品情報・表紙・許諾言語・権利範囲をご入力のうえ、各話を画像または .cbz/.zip でアップロードしてください。ページはインドのモバイル回線向けに、ブラウザ上で最適化されます。") },
    { n: "03", en: "Torii reviews it", ja: "審査", body: t("Our team checks content, rights and page quality, and replies with approval or clear notes on what to change.", "弊社チームが内容・権利・画質を確認し、承認、または修正点を具体的にご連絡いたします。") },
    { n: "04", en: "Go live and grow", ja: "配信開始", body: t("Chapters appear in the Read app, with simulpub scheduling, ₹9 unlocks, India-printed volumes and authenticity-tagged merchandise.", "各話がリーダーアプリで配信されます。日本との同時配信予約、1話₹9での販売、インド国内印刷の単行本、正規品タグ付きグッズにも対応しております。") },
  ];
  const terms: [string, string, string][] = [
    [t("Chapter unlocks", "各話の購入"), pct(PARTNER_TERMS.unlockShare), t(`of every ₹${CHAPTER_PRICE} unlock (₹${unlockCut} to you)`, `1話₹${CHAPTER_PRICE}のうち（貴社へ₹${unlockCut}）`)],
    [t("India-printed volumes", "インド国内印刷の単行本"), pct(PARTNER_TERMS.printShare), t("of the cover price, when you license print", "定価に対して（紙の出版を許諾いただいた場合）")],
    [t("Figures and merchandise", "フィギュア・グッズ"), pct(PARTNER_TERMS.figureShare), t("licensing royalty on each sale", "販売ごとのライセンス料")],
    [t("Statements", "支払明細"), t("Monthly", "毎月"), t(`paid ${PARTNER_TERMS.payoutDays} days after the month closes`, `月末締め、${PARTNER_TERMS.payoutDays}日後にお支払い`)],
  ];

  return (
    <div>
      <section className="relative overflow-hidden border-b border-line paper-band">
        <div className="tone pointer-events-none absolute inset-0 opacity-50" />
        <div className="relative mx-auto grid max-w-6xl items-center gap-10 px-5 py-14 sm:px-8 lg:grid-cols-[1.15fr_.85fr] lg:py-20">
          <div>
            <div className="jp text-[14px] font-medium tracking-[.1em] text-accent">{t("日本の出版社の皆さまへ", "To publishers in Japan")}</div>
            <h1 className="mt-3 font-display text-[clamp(34px,5.4vw,60px)] leading-[1.02]">{t("Bring your manga to India, officially.", "貴社の作品を、インドの読者へ。公式に。")}</h1>
            <p className="mt-5 max-w-xl text-[17px] leading-relaxed">
              {t(
                `Submit a series once. Torii localises it into ${LANGS.length} Indian languages, sells chapters for ₹${CHAPTER_PRICE}, prints volumes in India, tags every product against counterfeits, and shows you exactly who is reading, state by state.`,
                `作品は一度ご申請いただくだけで結構です。Toriiがインドの${LANGS.length}言語へローカライズし、1話₹${CHAPTER_PRICE}で販売、単行本をインド国内で印刷し、すべての商品に模倣品対策のタグを付け、どの州で誰が読んでいるかを詳しくご報告いたします。`,
              )}
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              {me ? <Link href="/partner/dashboard" className="btn-primary text-[16px]">{t("Open your console", "管理画面を開く")}</Link> : <Link href="/partner/apply" className="btn-primary text-[16px]">{t("Join the partner programme", "パートナー登録のお申し込み")}</Link>}
              {!me && <Link href="/partner/login" className="btn-ghost text-[16px]">{t("Sign in", "ログイン")}</Link>}
            </div>
          </div>
          <div aria-hidden className="relative mx-auto grid w-full max-w-[420px] grid-cols-3 gap-3 [transform:rotate(-4deg)]">
            {shelf.map((s, i) => (
              <div key={s.id} className={i % 3 === 1 ? "translate-y-6" : ""}><Cover title={s.title} color={s.color} image={s.image} size="sm" /></div>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-5 py-12 sm:px-8">
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          {[[db.series.length.toLocaleString("en-IN"), t("series on Torii today", "Toriiで配信中の作品")], [reads.toLocaleString("en-IN"), t("chapters read in 90 days", "直近90日の閲覧話数")],
            [String(states), t("Indian states reading", "読者のいるインドの州")], [String(LANGS.length), t("languages: ", "対応言語：") + LANGS.map((l) => l.name).join(", ")]].map(([v, l]) => (
            <div key={l} className="card p-5"><div className="price font-display text-[34px] leading-none">{v}</div><div className="mt-2 text-[13.5px] text-muted">{l}</div></div>
          ))}
        </div>
        <p className="mt-3 text-[12.5px] text-muted">{t("Live figures from this prototype’s store.", "本試作版ストアの実データです。")}</p>
      </section>

      <section className="mx-auto max-w-6xl px-5 pb-14 sm:px-8">
        <h2 className="font-display text-[28px]">{t(<>How it works <span className="jp ml-2 text-[15px] font-normal text-muted">ご利用の流れ</span></>, <span className="jp">ご利用の流れ</span>)}</h2>
        <ol className="mt-6 grid gap-3 md:grid-cols-2 lg:grid-cols-4">
          {steps.map((s) => (
            <li key={s.n} className="card relative p-5">
              <div className="font-display text-[30px] text-accent">{s.n}</div>
              <div className="mt-2 text-[17px] font-bold tracking-[-0.02em]">{t(s.en, s.ja)}</div>
              {!t.ja && <div className="jp text-[12.5px] text-muted">{s.ja}</div>}
              <p className="mt-3 text-[14px] leading-relaxed text-muted">{s.body}</p>
            </li>
          ))}
        </ol>
      </section>

      <section id="terms" className="scroll-mt-20 border-y border-line bg-card">
        <div className="mx-auto grid max-w-6xl gap-10 px-5 py-14 sm:px-8 lg:grid-cols-[.9fr_1.1fr]">
          <div>
            <h2 className="font-display text-[28px]">{t(<>Standard partner terms <span className="jp ml-2 text-[15px] font-normal text-muted">契約条件</span></>, <span className="jp">標準契約条件</span>)}</h2>
            <p className="mt-4 text-[15px] leading-relaxed text-muted">
              {t(
                `One agreement covers every title you bring. You keep ownership of your works and choose, per title, which languages and rights (digital, print, merchandise) you license for India, for how long, and whether exclusively. Version ${PARTNER_TERMS.version}.`,
                `一つの契約で、お預けいただくすべての作品が対象となります。作品の権利はすべて貴社に帰属し、作品ごとに、インドで許諾いただく言語・権利（電子・紙・グッズ）・期間・独占の有無をお選びいただけます。（第${PARTNER_TERMS.version}版）`,
              )}
            </p>
            <ul className="mt-5 space-y-2 text-[14.5px]">
              {[
                t("See reads, unlocks and sales by series, language, state and city", "作品・言語・州・都市ごとに、閲覧数・購入数・売上をご確認いただけます"),
                t("“Translate next” tells you which language each region is waiting for", "「次に翻訳すべき言語」で、各地域で求められている言語がわかります"),
                t("Schedule chapters to release in India the moment they release in Japan", "日本での発売と同時に、インドでも配信できるよう予約いただけます"),
                t("Every print volume and figure carries a signed, scannable authenticity tag", "すべての単行本・フィギュアに、読み取り可能な署名付き正規品タグが付きます"),
              ].map((line) => (
                <li key={line} className="flex gap-2.5"><span className="mt-[3px] text-ok" aria-hidden>✓</span>{line}</li>
              ))}
            </ul>
          </div>
          <div className="overflow-hidden rounded-panel border border-line">
            <table className="w-full text-left text-[14.5px]">
              <thead className="bg-fg/[.03] text-[12.5px] text-muted"><tr><th className="px-4 py-3 font-semibold">{t("Revenue stream", "収益の種類")}</th><th className="px-4 py-3 font-semibold">{t("Your share", "貴社の取り分")}</th><th className="hidden px-4 py-3 font-semibold sm:table-cell">{t("Notes", "備考")}</th></tr></thead>
              <tbody className="divide-y divide-line">
                {terms.map(([a, b, c]) => (
                  <tr key={a}><td className="px-4 py-3.5 font-semibold">{a}</td><td className="price px-4 py-3.5 text-[18px]">{b}</td><td className="hidden px-4 py-3.5 text-muted sm:table-cell">{c}</td></tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-5 py-14 sm:px-8">
        <div className="panel flex flex-wrap items-center gap-6 p-6 sm:p-8">
          <div className="mr-auto max-w-xl">
            <h2 className="text-[22px] font-bold tracking-[-0.02em]">{t("Try the demo", "デモをお試しください")}</h2>
            <p className="mt-2 text-[14.5px] leading-relaxed text-muted">
              {t(
                <>Sign in as Shueisha with <b className="text-fg">partner@shueisha.example</b> and password <b className="text-fg">torii-demo</b>, or join as a new publisher.
                Torii staff review submissions in the reader app at <Link href="/publisher/review" className="font-semibold text-fg underline underline-offset-2">/publisher/review</Link> (phone 9999999999, OTP 123456).</>,
                <>メールアドレス <b className="text-fg">partner@shueisha.example</b>、パスワード <b className="text-fg">torii-demo</b> で集英社としてログインいただくか、新しい出版社としてご登録いただけます。
                Torii担当者による審査は、リーダーアプリの <Link href="/publisher/review" className="font-semibold text-fg underline underline-offset-2">/publisher/review</Link>（電話番号 9999999999、認証コード 123456）で行います。</>,
              )}
            </p>
          </div>
          <Link href="/partner/login?demo=1" className="btn-ink">{t("Sign in as Shueisha", "集英社としてログイン")}</Link>
        </div>
      </section>
    </div>
  );
}
