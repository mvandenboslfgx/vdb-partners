import "server-only";
import { env } from "@/lib/env";
import { isFeatureEnabled } from "@/lib/feature-flags";

export interface EmailTemplate { subject: string; html: string; }
const brand = (content: string) => `<div style="background:#171717;padding:32px;color:#fff;font-family:Arial"><h1 style="color:#c8a76b">VDB Partners</h1><div style="background:#fff;color:#171717;padding:24px">${content}</div></div>`;
export const emailTemplates = {
  welcome: (name: string): EmailTemplate => ({ subject: "Welkom bij VDB Partners", html: brand(`<p>Beste ${name}, welkom bij VDB Partners.</p>`) }),
  payout: (amount: string): EmailTemplate => ({ subject: "Uw uitbetaling is verwerkt", html: brand(`<p>Uw uitbetaling van <strong>${amount}</strong> is verwerkt.</p>`) }),
};
export async function sendEmail(to: string, template: EmailTemplate) {
  if (!(await isFeatureEnabled("support_enabled")) || !env.RESEND_API_KEY) {
    if (env.NODE_ENV === "production" && env.EMAILS_REQUIRED) throw new Error("Email delivery is required but Resend is not configured");
    console.info("Email not sent (Resend disabled)", { to, subject: template.subject }); return { sent: false as const };
  }
  const response = await fetch("https://api.resend.com/emails", { method: "POST", headers: { Authorization: `Bearer ${env.RESEND_API_KEY}`, "Content-Type": "application/json" }, body: JSON.stringify({ from: "VDB Partners <no-reply@vdbpartners.nl>", to, subject: template.subject, html: template.html }) });
  if (!response.ok) throw new Error(`Resend API error (${response.status}): ${await response.text()}`);
  return { sent: true as const, ...(await response.json() as { id: string }) };
}
