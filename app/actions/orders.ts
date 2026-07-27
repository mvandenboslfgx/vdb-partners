"use server";
import { requireRole, requireSellerApproved } from "@/lib/auth/require-auth";
import { assertLocalLegacySellerDomainAllowed } from "@/lib/contract/local-legacy";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  assertTransition,
  type OrderStatus,
} from "@/lib/orders/status-machine";
import { orderSchema } from "@/lib/validation/order";

export async function createOrder(input: unknown) {
  assertLocalLegacySellerDomainAllowed();
  const profile = await requireSellerApproved();
  const parsed = orderSchema.parse({
    ...(input as object),
    sellerId: profile.id,
  });
  const db = createAdminClient();
  const { data: seller, error: sellerError } = await db
    .from("seller_profiles")
    .select("id")
    .eq("user_id", profile.id)
    .eq("status", "approved")
    .maybeSingle();
  if (sellerError) throw sellerError;
  if (!seller) throw new Error("Approved seller profile required");
  const variantIds = parsed.lines.map((line) => line.productId);
  const { data: variants, error: variantError } = await db
    .from("product_variants")
    .select("id, name, product_id, is_active")
    .in("id", variantIds)
    .eq("is_active", true);
  if (variantError) throw variantError;
  if (!variants || variants.length !== variantIds.length)
    throw new Error("One or more products are unavailable");
  const productIds = variants.map((variant) => variant.product_id);
  const [
    { data: products, error: productsError },
    { data: compliance, error: complianceError },
    { data: prices, error: pricesError },
  ] = await Promise.all([
    db
      .from("products")
      .select("id, name, is_active")
      .in("id", productIds)
      .eq("is_active", true),
    db
      .from("product_compliance")
      .select("product_id, status")
      .in("product_id", productIds)
      .eq("status", "approved_for_sale"),
    db
      .from("product_prices")
      .select("variant_id, amount_cents, tax_rate_bps, valid_from, valid_to")
      .in("variant_id", variantIds)
      .lte("valid_from", new Date().toISOString())
      .or(`valid_to.is.null,valid_to.gt.${new Date().toISOString()}`),
  ]);
  if (productsError ?? complianceError ?? pricesError)
    throw productsError ?? complianceError ?? pricesError;
  if (
    (products?.length ?? 0) !== productIds.length ||
    (compliance?.length ?? 0) !== productIds.length
  )
    throw new Error("Products must be active and approved for sale");
  const variantById = new Map(variants.map((variant) => [variant.id, variant]));
  const productById = new Map(
    (products ?? []).map((product) => [product.id, product]),
  );
  const priceByVariant = new Map(
    (prices ?? [])
      .sort((a, b) => b.valid_from.localeCompare(a.valid_from))
      .map((price) => [price.variant_id, price]),
  );
  const items = parsed.lines.map((line) => {
    const variant = variantById.get(line.productId);
    const price = priceByVariant.get(line.productId);
    if (!variant || !price)
      throw new Error("A current catalog price is required");
    const subtotal = price.amount_cents * line.quantity;
    const tax = Math.round((subtotal * price.tax_rate_bps) / 10_000);
    return {
      variant_id: variant.id,
      product_name_snapshot:
        productById.get(variant.product_id)?.name ?? "Product",
      variant_name_snapshot: variant.name,
      quantity: line.quantity,
      unit_price_cents: price.amount_cents,
      tax_rate_bps: price.tax_rate_bps,
      line_subtotal_cents: subtotal,
      line_tax_cents: tax,
      line_total_cents: subtotal + tax,
    };
  });
  const subtotal = items.reduce(
    (sum, item) => sum + item.line_subtotal_cents,
    0,
  );
  const tax = items.reduce((sum, item) => sum + item.line_tax_cents, 0);
  const { data: customer, error: customerError } = await db
    .from("customers")
    .upsert(
      {
        email: parsed.customerEmail,
        full_name: parsed.customerName,
        billing_address: parsed.deliveryAddress,
      },
      { onConflict: "email" },
    )
    .select("id")
    .single();
  if (customerError) throw customerError;
  const { data: order, error: orderError } = await db
    .from("orders")
    .insert({
      customer_id: customer.id,
      seller_id: seller.id,
      status: "submitted",
      subtotal_cents: subtotal,
      tax_cents: tax,
      total_cents: subtotal + tax,
      submitted_at: new Date().toISOString(),
    })
    .select()
    .single();
  if (orderError) throw orderError;
  const { error: itemError } = await db
    .from("order_items")
    .insert(items.map((item) => ({ ...item, order_id: order.id })));
  if (itemError) throw itemError;
  await db
    .from("audit_logs")
    .insert({
      actor_id: profile.id,
      action: "order.created",
      entity_type: "orders",
      entity_id: order.id,
      after_data: { status: "submitted", total_cents: order.total_cents },
    });
  return order;
}

export const createSellerOrder = createOrder;

export async function transitionOrderStatus(
  orderId: string,
  toStatus: OrderStatus,
  reason: string,
) {
  const profile = await requireRole("owner", "admin", "staff");
  if (!reason.trim()) throw new Error("A transition reason is required");
  const db = createAdminClient();
  const { data: order, error } = await db
    .from("orders")
    .select("id, status")
    .eq("id", orderId)
    .single();
  if (error) throw error;
  assertTransition(order.status as OrderStatus, toStatus);
  const timestamp = new Date().toISOString();
  const updates: Record<string, unknown> = { status: toStatus };
  if (toStatus === "delivered") updates.delivered_at = timestamp;
  if (toStatus === "completed") updates.completed_at = timestamp;
  if (toStatus === "cancelled") updates.cancelled_at = timestamp;
  const { error: updateError } = await db
    .from("orders")
    .update(updates)
    .eq("id", orderId);
  if (updateError) throw updateError;
  await Promise.all([
    db
      .from("order_status_history")
      .insert({
        order_id: orderId,
        from_status: order.status,
        to_status: toStatus,
        reason,
        changed_by: profile.id,
      }),
    db
      .from("audit_logs")
      .insert({
        actor_id: profile.id,
        action: "order.status_transition",
        entity_type: "orders",
        entity_id: orderId,
        before_data: { status: order.status },
        after_data: { status: toStatus, reason },
      }),
  ]);
}
