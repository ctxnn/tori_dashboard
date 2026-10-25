export const inr = (n: number) => "₹" + n.toLocaleString("en-IN");
export const num = (n: number) => n.toLocaleString("en-IN");
export const fmtDate = (s: string) =>
  new Date(s).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
