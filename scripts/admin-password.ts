/**
 * Sets the admin panel password. Only its scrypt hash is saved (ADMIN_PASSWORD_HASH in
 * .env.local); the password itself is never written anywhere.
 *
 *   npm run admin:password -- "new password"
 *
 * Put the same ADMIN_PASSWORD_HASH value in Vercel → Settings → Environment Variables.
 */
import { randomBytes, scryptSync } from "node:crypto";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const password = process.argv[2] ?? "";
if (password.length < 8) {
  console.error('Use at least 8 characters: npm run admin:password -- "your password"');
  process.exit(1);
}
const salt = randomBytes(16);
const hash = `s1.${salt.toString("base64url")}.${scryptSync(password, salt, 32).toString("base64url")}`;

const file = join(dirname(fileURLToPath(import.meta.url)), "..", ".env.local");
const lines = existsSync(file) ? readFileSync(file, "utf8").split("\n") : [];
const kept = lines.filter((l) => !/^ADMIN_PASSWORD(_HASH)?=/.test(l.trim()));
while (kept.length > 0 && kept.at(-1) === "") kept.pop();
kept.push(`ADMIN_PASSWORD_HASH=${hash}`, "");
writeFileSync(file, kept.join("\n"), { mode: 0o600 });
console.log("Saved to .env.local. For Vercel, add this environment variable:");
console.log(`ADMIN_PASSWORD_HASH=${hash}`);
