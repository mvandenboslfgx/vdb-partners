"use client";

import { useActionState } from "react";
import {
  createPartnerLeadAction,
  type CreatePartnerLeadState,
} from "@/app/actions/partner-leads";
import { Button, Input, Label, Select } from "@/components/ui";

const initial: CreatePartnerLeadState = {};

export function PartnerProductLeadForm({
  productId,
  productName,
  ctaMode,
}: {
  productId: string;
  productName: string;
  ctaMode: string;
}) {
  const [state, action, pending] = useActionState(
    createPartnerLeadAction,
    initial,
  );

  const submitLabel =
    ctaMode === "quote"
      ? "Offerte laten maken"
      : ctaMode === "lead_request"
        ? "Product aanvragen"
        : "Lead aanmelden";

  return (
    <form
      action={action}
      className="grid gap-4"
      data-testid="partner-lead-form"
    >
      <input type="hidden" name="productId" value={productId} />
      <p className="text-muted text-sm">
        Product:{" "}
        <span className="text-foreground font-medium">{productName}</span>. De
        klant betaalt altijd aan VDB Digital. Checkout/Mollie blijft fail-closed
        — deze flow eindigt in lead/offerteaanvraag.
      </p>
      <div>
        <Label htmlFor="customerType">Klanttype</Label>
        <Select id="customerType" name="customerType" defaultValue="b2c">
          <option value="b2c">B2C</option>
          <option value="b2b">B2B</option>
        </Select>
      </div>
      <div>
        <Label htmlFor="contactName">Klantnaam</Label>
        <Input id="contactName" name="contactName" required maxLength={200} />
      </div>
      <div>
        <Label htmlFor="contactEmail">E-mailadres klant</Label>
        <Input
          id="contactEmail"
          name="contactEmail"
          type="email"
          required
          maxLength={320}
        />
      </div>
      <div>
        <Label htmlFor="company">Bedrijf (optioneel)</Label>
        <Input id="company" name="company" maxLength={200} />
      </div>
      <div>
        <Label htmlFor="phone">Telefoon (optioneel)</Label>
        <Input id="phone" name="phone" maxLength={40} />
      </div>
      <div>
        <Label htmlFor="message">Notities</Label>
        <textarea
          id="message"
          name="message"
          maxLength={4000}
          className="border-border bg-surface min-h-24 w-full rounded-lg border px-3 py-2 text-sm"
        />
      </div>
      <label className="flex items-start gap-2 text-sm">
        <input
          type="checkbox"
          name="consentContact"
          required
          className="mt-1"
        />
        <span>
          Klant heeft toestemming gegeven om door VDB Digital te worden benaderd
          over dit product.
        </span>
      </label>
      <Button
        type="submit"
        disabled={pending}
        data-testid="submit-partner-lead"
      >
        {pending ? "Indienen…" : submitLabel}
      </Button>
      {state.error && (
        <p className="text-sm text-red-300" data-testid="partner-lead-error">
          {state.error}
        </p>
      )}
      {state.success && (
        <p
          className="text-sm text-emerald-300"
          data-testid="partner-lead-success"
        >
          Lead ingediend. Status volgt via Owner partner_leads (NEW →
          review/conversie). Geen live betaling.
        </p>
      )}
    </form>
  );
}
