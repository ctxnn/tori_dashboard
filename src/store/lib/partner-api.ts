import "server-only";
import { fail } from "./api";
import { currentPartner, type PartnerSession } from "./partner-auth";
import { currentUser } from "./auth";
import type { DB, Submission } from "./types";

/** Runs a Partner Portal API handler with the signed-in publisher, or answers 401. */
export async function partnerOr401(): Promise<PartnerSession | Response> {
  const p = await currentPartner();
  return p ?? fail("Sign in to the Partner Portal", 401);
}

/** The submission, if it belongs to this publisher. */
export const ownSubmission = (db: DB, orgId: string, id: string): Submission | undefined =>
  db.submissions.find((s) => s.id === id && s.orgId === orgId);

/** Torii staff are the fan app's admin accounts. */
export async function toriiStaff() {
  const u = await currentUser();
  return u?.isAdmin ? u : null;
}

const clean = (v: unknown, max: number) => String(v ?? "").replace(/[\u0000-\u001f\u007f]/g, " ").trim().slice(0, max);
export const text = clean;
export const multiline = (v: unknown, max: number) => String(v ?? "").replace(/\r\n?/g, "\n").replace(/[\u0000-\u0009\u000b-\u001f\u007f]/g, " ").trim().slice(0, max);
