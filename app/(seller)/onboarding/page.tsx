"use client";

import { useState } from "react";
import {
  acceptAgreement,
  saveAccountType,
  savePayoutPreference,
  savePersonalDetails,
  startVerification,
  submitForReview,
} from "@/app/actions/seller-onboarding";
import { Logo, PaymentRuleBanner } from "@/components/brand";
import { Button, Card, Checkbox, Input, Label } from "@/components/ui";

const agreementVersionId = "10000000-0000-0000-0000-000000000001";
const steps = [
  ["Persoonlijke gegevens", "Vertel ons wie u bent."],
  ["Partnerprofiel", "Kies de naam die klanten zien."],
  ["Uitbetaling en verificatie", "Geef de uitbetalingswijze op. Identiteitscontrole start daarna."],
  ["Overeenkomst", "Lees en accepteer de partnerovereenkomst."],
];

export default function OnboardingPage() {
  const [step, setStep] = useState(0);
  const [done, setDone] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const [verificationMessage, setVerificationMessage] = useState("");
  const [name, setName] = useState("");
  const [dateOfBirth, setDateOfBirth] = useState("");
  const [publicName, setPublicName] = useState("");
  const [payoutMethod, setPayoutMethod] = useState<"cash" | "bank_transfer">("cash");
  const [iban, setIban] = useState("");
  const [accountHolder, setAccountHolder] = useState("");
  const [agreementAccepted, setAgreementAccepted] = useState(false);

  const current = steps[step];

  async function next() {
    if (pending) return;
    setError("");
    setPending(true);
    const currentStep = step;
    try {
      if (currentStep === 0) await savePersonalDetails({ name, dateOfBirth });
      if (currentStep === 1) await saveAccountType({ accountType: "particular", publicName, countryCode: "NL" });
      if (currentStep === 2) {
        await savePayoutPreference(
          payoutMethod === "cash"
            ? { method: "cash" }
            : { method: "bank_transfer", iban, accountHolder },
        );
        const result = await startVerification();
        setVerificationMessage(
          result.status === "manual_review"
            ? "Uw verificatie wordt handmatig beoordeeld."
            : "Uw verificatie is gestart.",
        );
      }
      if (currentStep === 3) {
        if (!agreementAccepted) throw new Error("Accepteer eerst de partnerovereenkomst.");
        await acceptAgreement(agreementVersionId, name);
        await submitForReview();
        setDone(true);
        return;
      }
      setStep(currentStep + 1);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Opslaan is momenteel niet beschikbaar.");
    } finally {
      setPending(false);
    }
  }

  return (
    <main className="mx-auto max-w-2xl px-5 py-10">
      <Logo />
      <div className="mt-12 flex gap-2">
        {steps.map((_, index) => (
          <span key={index} className={`h-1 flex-1 ${index <= step ? "bg-gold" : "bg-white/10"}`} />
        ))}
      </div>
      <Card className="mt-8 p-7">
        <p className="text-xs uppercase tracking-[.16em] text-gold" data-testid="onboarding-step-label">
          Stap {step + 1} van {steps.length}
        </p>
        <h1 className="display mt-3 text-4xl">{done ? "Aanmelding ingediend" : current[0]}</h1>
        <p className="mt-2 text-sm text-muted">
          {done
            ? "Uw aanmelding wacht op beoordeling. U ontvangt een bericht zodra u kunt starten."
            : current[1]}
        </p>
        {!done && (
          <div className="mt-7 space-y-4">
            {step === 0 && (
              <>
                <div>
                  <Label htmlFor="onboarding-name">Volledige naam</Label>
                  <Input id="onboarding-name" data-testid="onboarding-name" value={name} onChange={(event) => setName(event.target.value)} required />
                </div>
                <div>
                  <Label htmlFor="onboarding-dob">Geboortedatum</Label>
                  <Input id="onboarding-dob" data-testid="onboarding-dob" type="date" value={dateOfBirth} onChange={(event) => setDateOfBirth(event.target.value)} required />
                </div>
              </>
            )}
            {step === 1 && (
              <div>
                <Label htmlFor="onboarding-public-name">Publieke naam</Label>
                <Input id="onboarding-public-name" data-testid="onboarding-public-name" value={publicName} onChange={(event) => setPublicName(event.target.value)} required />
              </div>
            )}
            {step === 2 && (
              <>
                <PaymentRuleBanner />
                <fieldset>
                  <legend className="mb-2 text-xs font-medium tracking-wide text-[#d6d1c7]">Uitbetalingsmethode</legend>
                  <label className="mr-5 text-sm">
                    <input data-testid="onboarding-payout-cash" type="radio" checked={payoutMethod === "cash"} onChange={() => setPayoutMethod("cash")} /> Contant
                  </label>
                  <label className="text-sm">
                    <input data-testid="onboarding-payout-bank" type="radio" checked={payoutMethod === "bank_transfer"} onChange={() => setPayoutMethod("bank_transfer")} /> Bankoverschrijving
                  </label>
                </fieldset>
                {payoutMethod === "bank_transfer" && (
                  <>
                    <div>
                      <Label htmlFor="onboarding-iban">IBAN</Label>
                      <Input id="onboarding-iban" data-testid="onboarding-iban" value={iban} onChange={(event) => setIban(event.target.value)} />
                    </div>
                    <div>
                      <Label htmlFor="onboarding-account-holder">Rekeninghouder</Label>
                      <Input id="onboarding-account-holder" data-testid="onboarding-account-holder" value={accountHolder} onChange={(event) => setAccountHolder(event.target.value)} />
                    </div>
                  </>
                )}
                {verificationMessage && (
                  <p data-testid="onboarding-verification-message" className="text-sm text-emerald-300">
                    {verificationMessage}
                  </p>
                )}
              </>
            )}
            {step === 3 && (
              <>
                <PaymentRuleBanner />
                {verificationMessage && (
                  <p data-testid="onboarding-verification-message" className="text-sm text-emerald-300">
                    {verificationMessage}
                  </p>
                )}
                <label className="flex gap-3 text-sm text-muted">
                  <Checkbox data-testid="onboarding-agreement" checked={agreementAccepted} onChange={(event) => setAgreementAccepted(event.target.checked)} />
                  Ik accepteer de partnerovereenkomst als {name || "ondertekenaar"}.
                </label>
              </>
            )}
            {error && <p data-testid="onboarding-error" className="text-sm text-red-300">{error}</p>}
            <div className="mt-6 flex justify-between">
              <Button type="button" variant="ghost" onClick={() => setStep(Math.max(0, step - 1))} disabled={step === 0 || pending}>
                Terug
              </Button>
              <Button type="button" data-testid={step === 3 ? "onboarding-submit" : "onboarding-next"} onClick={() => void next()} disabled={pending}>
                {pending ? "Opslaan…" : step === 3 ? "Indienen" : "Volgende"}
              </Button>
            </div>
          </div>
        )}
      </Card>
    </main>
  );
}
