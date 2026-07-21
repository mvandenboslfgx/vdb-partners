"use client";

import { useState, useTransition } from "react";
import { approveSeller } from "@/app/actions/admin-sellers";
import { completeLocalOrderSettlement } from "@/app/actions/admin-order-flow";
import { Button } from "@/components/ui";

function ActionMessage({ message }: { message: string }) {
  return message ? <p className="mt-2 text-xs text-red-300">{message}</p> : null;
}

export function ApproveSellerButton({ sellerId }: { sellerId: string }) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState("");
  return <div>
    <Button data-testid={`approve-seller-${sellerId}`} size="sm" disabled={pending} onClick={() => startTransition(async () => {
      setError("");
      try { await approveSeller(sellerId); window.location.reload(); } catch (caught) { setError(caught instanceof Error ? caught.message : "Goedkeuren is mislukt."); }
    })}>{pending ? "Bezig…" : "Goedkeuren"}</Button>
    <ActionMessage message={error} />
  </div>;
}

export function CompleteOrderFlowButton({ orderId }: { orderId: string }) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState("");
  return <div>
    <Button data-testid="admin-complete-order-flow" disabled={pending} onClick={() => startTransition(async () => {
      setError("");
      try { await completeLocalOrderSettlement(orderId); window.location.reload(); } catch (caught) { setError(caught instanceof Error ? caught.message : "Lokale afronding is mislukt."); }
    })}>{pending ? "Afronden…" : "Lokale snelle afronding"}</Button>
    <ActionMessage message={error} />
  </div>;
}
