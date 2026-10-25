import crypto from "node:crypto";
/** scrypt password hashes: "scrypt$<salt>$<hash>". Shared by the app and the seed script. */
export function hashPassword(pw: string, salt = crypto.randomBytes(16).toString("hex")): string {
  return `scrypt$${salt}$${crypto.scryptSync(pw, salt, 32).toString("hex")}`;
}
export function verifyPassword(pw: string, stored: string): boolean {
  const [alg, salt, hash] = stored.split("$");
  if (alg !== "scrypt" || !salt || !hash) return false;
  const a = Buffer.from(crypto.scryptSync(pw, salt, 32).toString("hex")), b = Buffer.from(hash);
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}
