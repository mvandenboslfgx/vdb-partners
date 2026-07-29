import Link from "next/link";
import { Logo, PaymentRuleBanner } from "@/components/brand";
import { Button, Card } from "@/components/ui";
import { requireRole } from "@/lib/auth/require-auth";
import {
  ACTIVATION_CHECK_COPY,
  PARTNER_FACING_STATUS_COPY,
} from "@/lib/partners/activation";
import { loadPartnerActivationView } from "@/lib/partners/activation-loader";
import { partnerTypeLabels } from "@/lib/validation/partner-type";
import { decidePartnerCapability } from "@/lib/partners/capabilities";

export default async function OnboardingPage() {
  const profile = await requireRole("partner_pending", "partner");
  const view = await loadPartnerActivationView(profile.id);
  const statusCopy =
    PARTNER_FACING_STATUS_COPY[view.facingStatus] ??
    PARTNER_FACING_STATUS_COPY.unknown_safe;
  const salesAllowed = decidePartnerCapability("create_lead", {
    profileStatus: view.profileStatus,
    facingStatus: view.facingStatus,
  }).allowed;
  const missing = view.checklist?.missing ?? [];
  const agreementNotReady =
    view.agreementLegalReviewStatus === "REQUIRED" ||
    view.agreementLegalReviewStatus == null;

  return (
    <main className="mx-auto max-w-2xl px-5 py-10">
      <Logo />
      <Card className="mt-12 p-7">
        <p className="text-gold text-xs tracking-[.16em] uppercase">
          Partner onboarding
        </p>
        <h1 className="display mt-3 text-4xl" data-testid="onboarding-title">
          {statusCopy.title}
        </h1>
        <p className="text-muted mt-3 text-sm leading-6">{statusCopy.body}</p>

        <dl className="mt-7 space-y-3 text-sm" data-testid="onboarding-status">
          <div>
            <dt className="text-muted">Account</dt>
            <dd>{profile.email ?? profile.id}</dd>
          </div>
          <div>
            <dt className="text-muted">Profielstatus (Owner)</dt>
            <dd data-testid="partner-status">{view.profileStatus ?? "—"}</dd>
          </div>
          <div>
            <dt className="text-muted">Aanvraagstatus</dt>
            <dd data-testid="application-status">
              {view.applicationStatus ?? "—"}
            </dd>
          </div>
          <div>
            <dt className="text-muted">Partnertype</dt>
            <dd data-testid="partner-type">
              {view.partnerType
                ? partnerTypeLabels[view.partnerType]
                : "Nog niet vastgelegd"}
            </dd>
          </div>
          <div>
            <dt className="text-muted">Naam</dt>
            <dd>{view.displayName ?? view.legalName ?? "—"}</dd>
          </div>
          <div>
            <dt className="text-muted">Verkoopacties</dt>
            <dd data-testid="sales-capability">
              {salesAllowed
                ? "Beschikbaar (ACTIVE)"
                : "Geblokkeerd tot Owner-status ACTIVE"}
            </dd>
          </div>
        </dl>

        {missing.length > 0 ? (
          <section className="mt-8" data-testid="activation-checklist">
            <h2 className="text-lg font-medium">Activatiechecklist</h2>
            <p className="text-muted mt-1 text-xs leading-5">
              Staffgoedkeuring alleen maakt u niet ACTIVE. Onderstaande stappen
              komen uit de Owner-checklist.
            </p>
            <ul className="mt-4 space-y-3">
              {missing.map((code) => {
                const copy =
                  ACTIVATION_CHECK_COPY[code] ?? ACTIVATION_CHECK_COPY.UNKNOWN;
                return (
                  <li
                    key={code}
                    className="border-border/50 rounded-md border p-3 text-sm"
                    data-testid={`activation-missing-${code}`}
                  >
                    <p className="font-medium">{copy.title}</p>
                    <p className="text-muted mt-1 text-xs leading-5">
                      {copy.body}
                    </p>
                    {code === "IDENTITY_NOT_VERIFIED" ? (
                      <p
                        className="mt-2 text-xs text-amber-200"
                        data-testid="kyc-unavailable"
                      >
                        Identiteitsverificatie is nog niet beschikbaar
                      </p>
                    ) : null}
                  </li>
                );
              })}
            </ul>
          </section>
        ) : null}

        <section className="mt-8" data-testid="agreement-status">
          <h2 className="text-lg font-medium">Overeenkomst</h2>
          {agreementNotReady ? (
            <p className="text-muted mt-2 text-sm leading-6">
              De partnerovereenkomst (
              {view.requiredAgreementType ?? "type nog onbekend"}) is nog niet
              juridisch vrijgegeven. Er is geen acceptatieactie beschikbaar.
            </p>
          ) : (
            <dl className="mt-3 space-y-2 text-sm">
              <div>
                <dt className="text-muted">Type</dt>
                <dd>{view.requiredAgreementType ?? "—"}</dd>
              </div>
              <div>
                <dt className="text-muted">Versie</dt>
                <dd>{view.requiredAgreementVersion ?? "—"}</dd>
              </div>
              <div>
                <dt className="text-muted">Geaccepteerd op</dt>
                <dd>{view.agreementAcceptedAt ?? "Nog niet geaccepteerd"}</dd>
              </div>
            </dl>
          )}
        </section>

        <section className="mt-8" data-testid="payout-status">
          <h2 className="text-lg font-medium">Payoutprofiel</h2>
          <p className="text-muted mt-2 text-sm leading-6">
            Status: {view.payoutProfileStatus ?? "NOT_STARTED"}. Uitbetalen
            uitvoeren blijft uitgeschakeld.
          </p>
        </section>

        <PaymentRuleBanner className="mt-6" />
        <div className="mt-6 flex flex-wrap gap-3">
          {view.profileStatus === "ACTIVE" && salesAllowed ? (
            <Link href="/dashboard">
              <Button data-testid="goto-dashboard">Naar dashboard</Button>
            </Link>
          ) : (
            <Link href="/login">
              <Button variant="outline" data-testid="relogin">
                Opnieuw inloggen
              </Button>
            </Link>
          )}
          <Link href="/">
            <Button variant="outline">Home</Button>
          </Link>
        </div>
      </Card>
    </main>
  );
}
