import Link from "next/link";
import { Logo, PaymentRuleBanner } from "@/components/brand";
import { Button, Card } from "@/components/ui";
import { createClient } from "@/lib/supabase/server";
import { requireRole } from "@/lib/auth/require-auth";

export default async function OnboardingPage() {
  const profile = await requireRole("partner_pending", "partner");
  const supabase = await createClient();
  const { data: partner } = await supabase
    .from("partner_profiles")
    .select("id, status, display_name, legal_name, created_at")
    .eq("user_id", profile.id)
    .maybeSingle();

  const status = partner?.status ?? profile.partnerStatus ?? "PENDING";

  return (
    <main className="mx-auto max-w-2xl px-5 py-10">
      <Logo />
      <Card className="mt-12 p-7">
        <p className="text-gold text-xs tracking-[.16em] uppercase">
          Partner onboarding
        </p>
        <h1 className="display mt-3 text-4xl">
          {status === "PENDING" ? "Aanmelding in behandeling" : "Partnerstatus"}
        </h1>
        <p className="text-muted mt-3 text-sm leading-6">
          {status === "PENDING"
            ? "Uw partneraanvraag wacht op beoordeling door VDB. U krijgt toegang tot het dashboard zodra uw profiel ACTIVE is."
            : `Huidige status: ${status}.`}
        </p>
        <dl className="mt-7 space-y-3 text-sm" data-testid="onboarding-status">
          <div>
            <dt className="text-muted">Account</dt>
            <dd>{profile.email ?? profile.id}</dd>
          </div>
          <div>
            <dt className="text-muted">Profielstatus</dt>
            <dd data-testid="partner-status">{status}</dd>
          </div>
          <div>
            <dt className="text-muted">Naam</dt>
            <dd>{partner?.display_name ?? partner?.legal_name ?? "—"}</dd>
          </div>
        </dl>
        <PaymentRuleBanner className="mt-6" />
        <div className="mt-6 flex gap-3">
          {status === "ACTIVE" ? (
            <Link href="/dashboard">
              <Button>Naar dashboard</Button>
            </Link>
          ) : (
            <Link href="/login">
              <Button variant="outline">Opnieuw inloggen</Button>
            </Link>
          )}
        </div>
      </Card>
    </main>
  );
}
