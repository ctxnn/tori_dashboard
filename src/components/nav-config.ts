// The workspace's main navigation per role, shared by the classic and new headers.
export const NAV: Record<string, { href: string; label: string }[]> = {
  owner: [
    { href: "/owner", label: "Overview" },
    { href: "/owner/kit", label: "Asset kit" },
    { href: "/partner/dashboard", label: "Manga titles" },
    { href: "/audience", label: "Audience" },
    { href: "/campaigns", label: "Campaigns" },
    { href: "/proof", label: "Proof" },
    { href: "/how-it-works", label: "How it works" },
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

export const GUEST_NAV = [
  { href: "/read", label: "Fan app" },
  { href: "/campaigns", label: "Campaigns" },
  { href: "/pulse", label: "Fan pulse" },
  { href: "/verify", label: "Verify" },
  { href: "/proof", label: "Proof" },
  { href: "/how-it-works", label: "How it works" },
];
