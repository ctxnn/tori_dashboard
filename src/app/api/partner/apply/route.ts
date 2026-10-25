import { id, mutate, now, read } from "@/store/lib/db";
import { body, fail, ok } from "@/store/lib/api";
import { normEmail, setPartnerSession, validEmail } from "@/store/lib/partner-auth";
import { text } from "@/store/lib/partner-api";
import { hashPassword } from "@/store/lib/password";
import { slugify } from "@/store/lib/partner";
import { PARTNER_TERMS } from "@/store/lib/config";

/**
 * A publisher joins the partner programme: company details, an owner account and acceptance of the
 * standard terms. The account works at once (they can prepare titles), but nothing goes live and no
 * sales data is shown until Torii has verified the company.
 */
export async function POST(req: Request) {
  const b = await body<Record<string, unknown>>(req);
  const company = text(b.company, 80), companyJa = text(b.companyJa, 80), contactName = text(b.contactName, 80);
  const website = text(b.website, 120), country = text(b.country, 40) || "Japan";
  const email = normEmail(b.email), password = String(b.password ?? "");
  if (company.length < 2) return fail("Enter your company's name");
  if (contactName.length < 2) return fail("Enter your name");
  if (!validEmail(email)) return fail("Enter a valid work email");
  if (password.length < 8) return fail("Use a password of at least 8 characters");
  if (website && !/^https?:\/\/[^\s]+\.[^\s]+$/.test(website)) return fail("Enter the website as a full address, like https://example.co.jp");
  if (b.agree !== true) return fail("Accept the partner terms to continue");
  const db = await read();
  if (db.partnerUsers.some((u) => u.email === email)) return fail("There is already a partner account for this email. Sign in instead.", 409);

  // A company already in the catalogue keeps its publisher id (once verified it sees its existing
  // titles' data); anyone else gets a new publisher.
  const claimed = new Set(db.partners.map((o) => o.publisherId));
  const match = db.publishers.find((p) => p.name.toLowerCase() === company.toLowerCase() && p.id !== "other" && !claimed.has(p.id));
  let publisherId = match?.id ?? `pub-${slugify(company)}`;
  while (!match && (claimed.has(publisherId) || db.publishers.some((p) => p.id === publisherId))) publisherId = `pub-${slugify(company)}-${id().slice(0, 4)}`;

  const userId = await mutate((d) => {
    const orgId = id("org_"), uid = id("pu_"), ts = now();
    d.partners.push({ id: orgId, publisherId, name: company, nameJa: companyJa, country, website, contactName, email, verified: false,
      agreementVersion: PARTNER_TERMS.version, agreementAcceptedAt: ts, createdAt: ts });
    d.partnerUsers.push({ id: uid, orgId, email, name: contactName, passwordHash: hashPassword(password), role: "owner", createdAt: ts, lastLoginAt: ts });
    return uid;
  });
  await setPartnerSession(userId);
  return ok({ ok: true });
}
