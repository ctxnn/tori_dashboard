// The workspace's main navigation per role, shared by the classic and new headers.
export interface NavItem {
  href: string;
  label: string;
  /** Japanese label, for the IP owner's menu */
  ja?: string;
}

export const NAV: Record<string, NavItem[]> = {
  owner: [
    { href: "/owner", label: "Overview", ja: "概要" },
    { href: "/owner/kit", label: "Asset kit", ja: "アセットキット" },
    { href: "/partner/dashboard", label: "Manga titles", ja: "作品管理" },
    { href: "/audience", label: "Audience", ja: "オーディエンス" },
    { href: "/campaigns", label: "Campaigns", ja: "キャンペーン" },
    { href: "/proof", label: "Proof", ja: "実績データ" },
    { href: "/how-it-works", label: "How it works", ja: "使い方" },
  ],
  creator: [
    { href: "/creator", label: "Studio" },
    { href: "/creator/kit", label: "Kit & rules" },
    { href: "/audience", label: "Audience" },
    { href: "/campaigns", label: "Campaigns" },
    { href: "/proof", label: "Proof" },
    { href: "/how-it-works", label: "How it works" },
  ],
  fan: [
    { href: "/read", label: "Fan app" },
    { href: "/campaigns", label: "Campaigns" },
    { href: "/fan", label: "Passport" },
    { href: "/pulse", label: "Fan pulse" },
    { href: "/verify", label: "Verify" },
    { href: "/proof", label: "Proof" },
    { href: "/how-it-works", label: "How it works" },
  ],
  operator: [
    { href: "/ops", label: "Operations" },
    { href: "/ops/payments", label: "Payment events" },
    { href: "/ops/settings", label: "Terms" },
    { href: "/publisher", label: "Store" },
    { href: "/campaigns", label: "Campaigns" },
    { href: "/audience", label: "Audience" },
    { href: "/proof", label: "Proof" },
    { href: "/how-it-works", label: "How it works" },
  ],
};

export const GUEST_NAV: NavItem[] = [
  { href: "/read", label: "Fan app" },
  { href: "/campaigns", label: "Campaigns" },
  { href: "/pulse", label: "Fan pulse" },
  { href: "/verify", label: "Verify" },
  { href: "/proof", label: "Proof" },
  { href: "/how-it-works", label: "How it works" },
];
