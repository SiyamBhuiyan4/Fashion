/**
 * Email notifications through Resend (resend.com, free tier). Off until RESEND_API_KEY and
 * EMAIL_FROM are set; notifications are always shown on the site regardless.
 */
import "server-only";

export async function sendEmail({
  to,
  subject,
  text,
}: {
  to: string;
  subject: string;
  text: string;
}) {
  const key = process.env.RESEND_API_KEY;
  const from = process.env.EMAIL_FROM;
  if (!key || !from) return;
  const site = process.env.SITE_URL ?? "";
  const body = text.replace(
    /(^|\n)(\/[^\s]*)/g,
    (_m, lead: string, path: string) => `${lead}${site}${path}`,
  );
  await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
    body: JSON.stringify({ from, to, subject, text: body }),
  }).catch((error: unknown) => console.warn("[email] not sent:", error));
}
