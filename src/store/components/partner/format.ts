import { JPY_PER_INR } from "@/lib/i18n-shared";

export const inr = (n: number) => "₹" + Math.round(n).toLocaleString("en-IN");

/** Yen equivalent of a rupee amount at the demo rate, for Japanese publishers. */
export const jpy = (rupees: number) => "¥" + Math.round(rupees * JPY_PER_INR).toLocaleString("ja-JP");
