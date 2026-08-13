"use client";

import Link from "next/link";
import { useActionState, useState } from "react";
import {
  registerPartner,
  sendPasswordReset,
  signIn,
  type ActionState,
} from "@/app/actions/auth";
import { Button, Input, Label } from "@/components/ui";
import type { PartnerType } from "@/lib/validation/partner-type";

const initialState: ActionState = {};

function Message({ state }: { state: ActionState }) {
  return state.error ? (
    <p className="mt-4 text-sm text-red-300">{state.error}</p>
  ) : state.success ? (
    <p className="mt-4 text-sm text-emerald-300">{state.success}</p>
  ) : null;
}

export function LoginForm() {
  const [state, action, pending] = useActionState(signIn, initialState);
  return (
    <form action={action} className="space-y-4">
      <div>
        <Label htmlFor="email">E-mailadres</Label>
        <Input
          id="email"
          name="email"
          type="email"
          required
          autoComplete="email"
        />
      </div>
      <div>
        <Label htmlFor="password">Wachtwoord</Label>
        <Input
          id="password"
          name="password"
          type="password"
          required
          autoComplete="current-password"
        />
      </div>
      <Button className="w-full" disabled={pending}>
        {pending ? "Bezig…" : "Inloggen"}
      </Button>
      <Message state={state} />
      <Link
        className="text-gold block text-center text-sm"
        href="/forgot-password"
      >
        Wachtwoord vergeten?
      </Link>
    </form>
  );
}

export function RegisterForm() {
  const [state, action, pending] = useActionState(
    registerPartner,
    initialState,
  );
  const [partnerType, setPartnerType] = useState<PartnerType | "">("");

  return (
    <form action={action} className="space-y-4" data-testid="register-form">
      <fieldset className="space-y-3">
        <legend className="text-foreground text-sm font-medium">
          Partnertype (verplicht)
        </legend>
        <p className="text-muted text-xs leading-5">
          Kies expliciet Particulier of Zakelijk. Het type wordt niet afgeleid
          uit bedrijfsnaam of KvK.
        </p>
        <div className="grid gap-2 sm:grid-cols-2">
          <label className="border-border/60 flex cursor-pointer items-start gap-2 rounded-md border p-3 text-sm">
            <input
              type="radio"
              name="partnerType"
              value="INDIVIDUAL"
              required
              checked={partnerType === "INDIVIDUAL"}
              onChange={() => setPartnerType("INDIVIDUAL")}
              data-testid="partner-type-individual"
            />
            <span>
              <span className="font-medium">Particulier</span>
              <span className="text-muted mt-1 block text-xs">
                Geen bedrijfsnaam of KvK tijdens intake. Voor activatie volgen
                later leeftijd-, identiteits- en overeenkomststappen.
              </span>
            </span>
          </label>
          <label className="border-border/60 flex cursor-pointer items-start gap-2 rounded-md border p-3 text-sm">
            <input
              type="radio"
              name="partnerType"
              value="BUSINESS"
              required
              checked={partnerType === "BUSINESS"}
              onChange={() => setPartnerType("BUSINESS")}
              data-testid="partner-type-business"
            />
            <span>
              <span className="font-medium">Zakelijk</span>
              <span className="text-muted mt-1 block text-xs">
                Bedrijfsnaam en geldig Nederlands KvK-nummer (8 cijfers) zijn
                verplicht.
              </span>
            </span>
          </label>
        </div>
      </fieldset>

      <div>
        <Label htmlFor="name">
          {partnerType === "BUSINESS"
            ? "Naam bevoegde vertegenwoordiger"
            : "Volledige naam"}
        </Label>
        <Input id="name" name="name" required data-testid="register-name" />
      </div>

      {partnerType === "BUSINESS" ? (
        <>
          <div>
            <Label htmlFor="companyName">Bedrijfsnaam</Label>
            <Input
              id="companyName"
              name="companyName"
              required
              data-testid="register-company"
            />
          </div>
          <div>
            <Label htmlFor="kvkNumber">KvK-nummer</Label>
            <Input
              id="kvkNumber"
              name="kvkNumber"
              inputMode="numeric"
              pattern="\d{8}"
              maxLength={8}
              required
              data-testid="register-kvk"
            />
          </div>
          <div>
            <Label htmlFor="businessSubtype">
              Ondernemingsvorm (optioneel)
            </Label>
            <select
              id="businessSubtype"
              name="businessSubtype"
              className="border-input bg-background h-10 w-full rounded-md border px-3 text-sm"
              defaultValue=""
              data-testid="register-business-subtype"
            >
              <option value="">—</option>
              <option value="sole_trader">ZZP / eenmanszaak</option>
              <option value="company">Bedrijf (BV, VOF, …)</option>
            </select>
          </div>
        </>
      ) : null}

      {partnerType === "INDIVIDUAL" ? (
        <p
          className="text-muted rounded-md border border-amber-500/30 bg-amber-500/5 p-3 text-xs leading-5"
          data-testid="individual-activation-notice"
        >
          Indienen maakt u niet actief. VDB beoordeelt uw gegevens
          administratief. Particuliere overeenkomst, uitbetalingsprofiel en
          goedkeuring blijven vereist vóór activatie. Er is geen automatische
          ID-check, camera- of documentverificatie.
        </p>
      ) : null}

      {partnerType === "BUSINESS" ? (
        <p
          className="text-muted rounded-md border border-amber-500/30 bg-amber-500/5 p-3 text-xs leading-5"
          data-testid="business-activation-notice"
        >
          Indienen maakt u niet actief. Bedrijfsgegevens, overeenkomst,
          uitbetalingsprofiel en VDB-goedkeuring blijven vereist vóór
          activatie. Er is geen automatische ID-check, camera- of
          documentverificatie.
        </p>
      ) : null}

      <div>
        <Label htmlFor="email">Zakelijk e-mailadres</Label>
        <Input
          id="email"
          name="email"
          type="email"
          required
          data-testid="register-email"
        />
      </div>
      <div>
        <Label htmlFor="password">Wachtwoord</Label>
        <Input
          id="password"
          name="password"
          type="password"
          minLength={8}
          required
          data-testid="register-password"
        />
      </div>
      <Button
        className="w-full"
        disabled={pending || !partnerType}
        data-testid="register-submit"
      >
        {pending ? "Bezig…" : "Aanmelding starten"}
      </Button>
      <Message state={state} />
    </form>
  );
}

export function ForgotPasswordForm() {
  const [state, action, pending] = useActionState(
    sendPasswordReset,
    initialState,
  );
  return (
    <form action={action} className="space-y-4">
      <div>
        <Label htmlFor="email">E-mailadres</Label>
        <Input id="email" name="email" type="email" required />
      </div>
      <Button className="w-full" disabled={pending}>
        {pending ? "Versturen…" : "Resetlink versturen"}
      </Button>
      <Message state={state} />
    </form>
  );
}
