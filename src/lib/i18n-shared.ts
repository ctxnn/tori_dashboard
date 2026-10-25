// English / Japanese for the IP-owner workspace and the Partner Portal. Client-safe.
import { formatDate, formatDateTime } from "./labels";

export type Lang = "en" | "ja";

export const LANG_COOKIE = "torii_lang";

/** A fixed demonstration rate for showing Japanese licensors a yen equivalent. Not a live rate. */
export const JPY_PER_INR = 1.8;

/** Yen equivalent of an amount in paise, for display only. */
export function yen(minor: number): string {
  return "¥" + Math.round((minor / 100) * JPY_PER_INR).toLocaleString("ja-JP");
}

export interface T {
  /** Picks the English or the Japanese version. Works for strings and JSX alike. */
  <A, B = A>(en: A, ja: B): A | B;
  lang: Lang;
  ja: boolean;
  date(iso: string | null | undefined, opts?: Intl.DateTimeFormatOptions): string;
  dateTime(iso: string | null | undefined): string;
}

export function makeT(lang: Lang): T {
  const ja = lang === "ja";
  const locale = ja ? "ja-JP" : "en-IN";
  const t = (<A, B>(en: A, jp: B): A | B => (ja ? jp : en)) as T;
  t.lang = lang;
  t.ja = ja;
  t.date = (iso, opts) => formatDate(iso, opts, locale);
  t.dateTime = (iso) => formatDateTime(iso, locale);
  return t;
}
