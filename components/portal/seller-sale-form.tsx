"use client";

import { useState, useTransition } from "react";
import { createOrder } from "@/app/actions/orders";
import { Button, Input, Label, Select } from "@/components/ui";

const demoVariantId = "21000000-0000-0000-0000-000000000001";

export function SellerSaleForm() {
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState("");
  const [form, setForm] = useState({ customerName: "", customerEmail: "", variantId: demoVariantId, quantity: "1", line1: "", postalCode: "", city: "", country: "NL" });
  const update = (field: keyof typeof form) => (event: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => setForm((current) => ({ ...current, [field]: event.target.value }));

  return <form className="grid gap-4" onSubmit={(event) => {
    event.preventDefault();
    startTransition(async () => {
      setMessage("");
      try {
        const order = await createOrder({
          customerName: form.customerName,
          customerEmail: form.customerEmail,
          lines: [{ productId: form.variantId, quantity: Number(form.quantity) }],
          paymentMethod: "bank_transfer",
          deliveryAddress: { line1: form.line1, postalCode: form.postalCode, city: form.city, country: form.country.toUpperCase() },
        });
        setMessage(`Verkoop ${order.order_number} is ingediend.`);
        setForm({ customerName: "", customerEmail: "", variantId: demoVariantId, quantity: "1", line1: "", postalCode: "", city: "", country: "NL" });
      } catch (caught) {
        const raw = caught instanceof Error ? caught.message : "De verkoop kon niet worden ingediend.";
        setMessage(raw.startsWith("[") ? "Controleer de invoer en probeer opnieuw." : raw);
      }
    });
  }}>
    <div><Label htmlFor="sale-customer-name">Klantnaam</Label><Input id="sale-customer-name" data-testid="sale-customer-name" value={form.customerName} onChange={update("customerName")} required /></div>
    <div><Label htmlFor="sale-customer-email">E-mailadres klant</Label><Input id="sale-customer-email" data-testid="sale-customer-email" type="email" value={form.customerEmail} onChange={update("customerEmail")} required /></div>
    <div><Label htmlFor="sale-variant">Product</Label><Select id="sale-variant" data-testid="sale-variant" value={form.variantId} onChange={update("variantId")}><option value={demoVariantId}>Office Standard — 1 apparaat / permanent</option></Select></div>
    <div><Label htmlFor="sale-quantity">Aantal</Label><Input id="sale-quantity" data-testid="sale-quantity" type="number" min="1" value={form.quantity} onChange={update("quantity")} required /></div>
    <div><Label htmlFor="sale-address">Adres</Label><Input id="sale-address" data-testid="sale-address" value={form.line1} onChange={update("line1")} required /></div>
    <div className="grid gap-4 sm:grid-cols-2"><div><Label htmlFor="sale-postal-code">Postcode</Label><Input id="sale-postal-code" data-testid="sale-postal-code" value={form.postalCode} onChange={update("postalCode")} required /></div><div><Label htmlFor="sale-city">Plaats</Label><Input id="sale-city" data-testid="sale-city" value={form.city} onChange={update("city")} required /></div></div>
    <div><Label htmlFor="sale-country">Landcode</Label><Input id="sale-country" data-testid="sale-country" maxLength={2} value={form.country} onChange={update("country")} required /></div>
    <Button data-testid="submit-sale" disabled={pending}>{pending ? "Indienen…" : "Verkoop indienen"}</Button>
    {message && <p data-testid="sale-message" className="text-sm text-muted">{message}</p>}
  </form>;
}
