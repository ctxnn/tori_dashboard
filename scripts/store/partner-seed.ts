/*
 * Demo Partner Portal accounts. Password for all: torii-demo.
 * Kumo Lantern Studio is the IP owner in the collaboration workspace: Haruka and Daichi open its
 * console straight from /switch, without the password.
 */
import { hashPassword } from "../../src/store/lib/password";
import { PARTNER_TERMS } from "../../src/store/lib/config";
import type { PartnerOrg, PartnerUser } from "../../src/store/lib/types";

export function partnerSeed(t: (daysAgo: number) => string) {
  const org = (id: string, publisherId: string, name: string, nameJa: string, website: string, contactName: string, days: number): PartnerOrg => ({
    id, publisherId, name, nameJa, country: "Japan", website, contactName, email: `rights@${publisherId}.example`, verified: true,
    agreementVersion: PARTNER_TERMS.version, agreementAcceptedAt: t(days), createdAt: t(days),
  });
  const partners: PartnerOrg[] = [
    org("org_kumo", "kumo-lantern", "Kumo Lantern Studio", "雲灯スタジオ", "https://kumolantern.example", "Haruka Sato", 140),
    org("org_shueisha", "shueisha", "Shueisha", "集英社", "https://www.shueisha.co.jp", "Yuki Tanaka", 110),
    org("org_kodansha", "kodansha", "Kodansha", "講談社", "https://www.kodansha.co.jp", "Kenji Mori", 95),
  ];
  // Fixed salts keep the seed output stable between runs.
  const partnerUsers: PartnerUser[] = [
    { id: "pu_kumo", orgId: "org_kumo", email: "partner@kumolantern.example", name: "Haruka Sato", role: "owner",
      passwordHash: hashPassword("torii-demo", "5eedkum0lan7e001"), createdAt: t(140), lastLoginAt: null, studioIds: ["usr_haruka", "usr_daichi"] },
    { id: "pu_shueisha", orgId: "org_shueisha", email: "partner@shueisha.example", name: "Yuki Tanaka", role: "owner",
      passwordHash: hashPassword("torii-demo", "5eed5hue15ha0001"), createdAt: t(110), lastLoginAt: null },
    { id: "pu_kodansha", orgId: "org_kodansha", email: "partner@kodansha.example", name: "Kenji Mori", role: "owner",
      passwordHash: hashPassword("torii-demo", "5eedk0dan5ha0001"), createdAt: t(95), lastLoginAt: null },
  ];
  return { partners, partnerUsers, submissions: [] };
}
