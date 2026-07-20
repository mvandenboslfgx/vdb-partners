"use server";
import { requirePermission } from "@/lib/auth/require-auth";
import { productSchema } from "@/lib/validation/product";
import { createAdminClient } from "@/lib/supabase/admin";
export async function saveProduct(input: unknown) { await requirePermission("manage_products"); const product = productSchema.parse(input); const { data, error } = await createAdminClient().from("products").upsert(product).select().single(); if (error) throw error; return data; }
