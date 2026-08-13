"use client";

import { useState, useTransition } from "react";
import { attestPartnerAdminReview } from "@/app/actions/admin-review";
import {
  ADMIN_REVIEW_STAFF_ACTIONS,
  adminReviewStatusCopy,
} from "@/lib/partners/admin-review";

type PartnerRow = {
  id: string;
  display_name: string | null;
  legal_name: string | null;
  identity_verification_status: string | null;
  identity_verified_at: string | null;
  status: string | null;
};

export function AdminReviewPanel({ partners }: { partners: PartnerRow[] }) {
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState<string | null>(null);

  function run(
    partnerId: string,
    outcome: string,
    reasonCode: string,
    label: string,
  ) {
    const confirmed = window.confirm(
      `${label}\n\nDit is een administratieve partnercontrole — geen ID-document-, camera- of selfiecheck.\nDoorgaan?`,
    );
    if (!confirmed) return;
    startTransition(async () => {
      const result = await attestPartnerAdminReview({
        partnerId,
        outcome,
        reasonCode,
      });
      if (!result.ok) {
        setMessage(`${result.code}: ${result.message}`);
        return;
      }
      setMessage(
        result.changed
          ? `Bijgewerkt → ${result.status}. Ontbrekende activatiegates: ${result.missing.join(", ") || "geen (identity)"}`
          : `Geen wijziging (idempotent) — status blijft ${result.status}.`,
      );
    });
  }

  if (!partners.length) {
    return (
      <p className="text-muted mt-3 text-sm" data-testid="admin-review-empty">
        Geen partnerprofielen om administratief te beoordelen.
      </p>
    );
  }

  return (
    <div className="mt-4 space-y-6" data-testid="admin-review-panel">
      <p className="text-muted text-xs leading-5">
        Alleen bevoegd staff met AAL2-sessie. Geen documentupload, camera of
        BSN. Live payouts blijven uit.
      </p>
      {message ? (
        <p
          className="rounded-md border border-amber-500/30 bg-amber-500/5 p-3 text-xs"
          data-testid="admin-review-message"
        >
          {message}
        </p>
      ) : null}
      {partners.map((partner) => {
        const copy = adminReviewStatusCopy(
          partner.identity_verification_status,
        );
        return (
          <div
            key={partner.id}
            className="border-border/50 rounded-md border p-4"
            data-testid={`admin-review-row-${partner.id}`}
          >
            <p className="font-medium">
              {partner.display_name ??
                partner.legal_name ??
                partner.id.slice(0, 8)}
            </p>
            <p className="text-muted mt-1 text-xs">
              Profiel: {partner.status ?? "—"} · Controle: {copy.title}
            </p>
            {partner.identity_verified_at ? (
              <p className="text-muted mt-1 text-xs">
                Afgerond op{" "}
                {new Date(partner.identity_verified_at).toLocaleString("nl-NL")}
              </p>
            ) : null}
            <p className="text-muted mt-2 text-xs leading-5">{copy.body}</p>
            <div className="mt-3 flex flex-wrap gap-2">
              {ADMIN_REVIEW_STAFF_ACTIONS.map((action) => (
                <button
                  key={`${partner.id}-${action.outcome}`}
                  type="button"
                  disabled={pending}
                  className="border-border/60 rounded border px-3 py-1.5 text-xs"
                  data-testid={`admin-review-${action.outcome.toLowerCase()}`}
                  onClick={() =>
                    run(
                      partner.id,
                      action.outcome,
                      action.reasonCode,
                      action.label,
                    )
                  }
                >
                  {action.label}
                </button>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}
