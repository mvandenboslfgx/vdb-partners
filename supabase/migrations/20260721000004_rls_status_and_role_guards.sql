-- Gate 2: tighten seller status boundaries and role administration under JWT/RLS.
-- Blocked sellers lose seller-scoped access (current_seller_id returns null).
-- Commercial catalogue access requires approved status.
-- user_roles mutations are owner-only; self-select remains.

create or replace function private.current_seller_id()
returns uuid
language sql
stable
security definer
set search_path = pg_catalog, public
as $$
  select sp.id
  from public.seller_profiles sp
  where sp.user_id = auth.uid()
    and sp.status is distinct from 'blocked'
  limit 1;
$$;

create or replace function private.current_approved_seller_id()
returns uuid
language sql
stable
security definer
set search_path = pg_catalog, public
as $$
  select sp.id
  from public.seller_profiles sp
  where sp.user_id = auth.uid()
    and sp.status = 'approved'
  limit 1;
$$;

create or replace function private.current_readable_seller_id()
returns uuid
language sql
stable
security definer
set search_path = pg_catalog, public
as $$
  -- Approved and suspended may read own commercial history; pending/blocked may not.
  select sp.id
  from public.seller_profiles sp
  where sp.user_id = auth.uid()
    and sp.status in ('approved', 'suspended')
  limit 1;
$$;

create or replace function public.current_approved_seller_id()
returns uuid
language sql
stable
security definer
set search_path = pg_catalog, public, private
as $$ select private.current_approved_seller_id(); $$;

create or replace function public.current_readable_seller_id()
returns uuid
language sql
stable
security definer
set search_path = pg_catalog, public, private
as $$ select private.current_readable_seller_id(); $$;

grant execute on function private.current_approved_seller_id() to authenticated, service_role;
grant execute on function private.current_readable_seller_id() to authenticated, service_role;
grant execute on function public.current_approved_seller_id() to authenticated, service_role;
grant execute on function public.current_readable_seller_id() to authenticated, service_role;

-- Products / catalogue: approved sellers only (avoid recursing into products from child policies)
drop policy if exists seller_products_select on public.products;
create policy seller_products_select on public.products for select to authenticated using (
  exists (
    select 1
    from public.product_seller_access psa
    join public.product_compliance pc on pc.product_id = psa.product_id
    where psa.product_id = products.id
      and psa.seller_id = public.current_approved_seller_id()
      and psa.is_enabled
      and pc.status = 'approved_for_sale'
      and products.is_active
  )
);

drop policy if exists seller_variants_select on public.product_variants;
create policy seller_variants_select on public.product_variants for select to authenticated using (
  is_active
  and exists (
    select 1 from public.product_seller_access psa
    where psa.product_id = product_variants.product_id
      and psa.seller_id = public.current_approved_seller_id()
      and psa.is_enabled
  )
);

drop policy if exists seller_prices_select on public.product_prices;
create policy seller_prices_select on public.product_prices for select to authenticated using (
  exists (
    select 1
    from public.product_variants pv
    join public.product_seller_access psa on psa.product_id = pv.product_id
    where pv.id = product_prices.variant_id
      and psa.seller_id = public.current_approved_seller_id()
      and psa.is_enabled
  )
);

-- Break products <-> compliance recursion for seller catalogue reads
drop policy if exists seller_compliance_select on public.product_compliance;
create policy seller_compliance_select on public.product_compliance for select to authenticated using (
  status = 'approved_for_sale'
  and exists (
    select 1 from public.product_seller_access psa
    where psa.product_id = product_compliance.product_id
      and psa.seller_id = public.current_approved_seller_id()
      and psa.is_enabled
  )
);

drop policy if exists seller_documents_select on public.product_documents;
create policy seller_documents_select on public.product_documents for select to authenticated using (
  exists (
    select 1 from public.product_seller_access psa
    where psa.product_id = product_documents.product_id
      and psa.seller_id = public.current_approved_seller_id()
      and psa.is_enabled
  )
);

drop policy if exists seller_marketing_assets_select on public.marketing_assets;
create policy seller_marketing_assets_select on public.marketing_assets for select to authenticated using (
  is_active
  and public.current_approved_seller_id() is not null
  and (
    product_id is null
    or exists (
      select 1 from public.product_seller_access psa
      where psa.product_id = marketing_assets.product_id
        and psa.seller_id = public.current_approved_seller_id()
        and psa.is_enabled
    )
  )
);

-- Commercial history: approved + suspended
drop policy if exists seller_orders_select on public.orders;
create policy seller_orders_select on public.orders for select to authenticated
  using (seller_id = public.current_readable_seller_id());

drop policy if exists seller_order_items_select on public.order_items;
create policy seller_order_items_select on public.order_items for select to authenticated using (
  exists (
    select 1 from public.orders o
    where o.id = order_id and o.seller_id = public.current_readable_seller_id()
  )
);

drop policy if exists seller_order_history_select on public.order_status_history;
create policy seller_order_history_select on public.order_status_history for select to authenticated using (
  exists (
    select 1 from public.orders o
    where o.id = order_id and o.seller_id = public.current_readable_seller_id()
  )
);

drop policy if exists seller_payments_select on public.payments;
create policy seller_payments_select on public.payments for select to authenticated using (
  exists (
    select 1 from public.orders o
    where o.id = payments.order_id and o.seller_id = public.current_readable_seller_id()
  )
);

drop policy if exists seller_payment_events_select on public.payment_events;
create policy seller_payment_events_select on public.payment_events for select to authenticated using (
  exists (
    select 1
    from public.payments p
    join public.orders o on o.id = p.order_id
    where p.id = payment_id and o.seller_id = public.current_readable_seller_id()
  )
);

drop policy if exists seller_fulfilments_select on public.fulfilments;
create policy seller_fulfilments_select on public.fulfilments for select to authenticated using (
  exists (
    select 1 from public.orders o
    where o.id = order_id and o.seller_id = public.current_readable_seller_id()
  )
);

drop policy if exists seller_fulfilment_events_select on public.fulfilment_events;
create policy seller_fulfilment_events_select on public.fulfilment_events for select to authenticated using (
  exists (
    select 1
    from public.fulfilments f
    join public.orders o on o.id = f.order_id
    where f.id = fulfilment_id and o.seller_id = public.current_readable_seller_id()
  )
);

drop policy if exists seller_commissions_select on public.commissions;
create policy seller_commissions_select on public.commissions for select to authenticated
  using (seller_id = public.current_readable_seller_id());

drop policy if exists seller_commission_calculations_select on public.commission_calculations;
create policy seller_commission_calculations_select on public.commission_calculations for select to authenticated
  using (seller_id = public.current_readable_seller_id());

drop policy if exists seller_commission_adjustments_select on public.commission_adjustments;
create policy seller_commission_adjustments_select on public.commission_adjustments for select to authenticated using (
  exists (
    select 1 from public.commissions c
    where c.id = commission_id and c.seller_id = public.current_readable_seller_id()
  )
);

drop policy if exists seller_payouts_select on public.payouts;
create policy seller_payouts_select on public.payouts for select to authenticated
  using (seller_id = public.current_readable_seller_id());

drop policy if exists seller_payout_items_select on public.payout_items;
create policy seller_payout_items_select on public.payout_items for select to authenticated using (
  exists (
    select 1 from public.payouts p
    where p.id = payout_id and p.seller_id = public.current_readable_seller_id()
  )
);

drop policy if exists seller_cash_receipts_select on public.cash_receipts;
create policy seller_cash_receipts_select on public.cash_receipts for select to authenticated using (
  exists (
    select 1 from public.payouts p
    where p.id = payout_id and p.seller_id = public.current_readable_seller_id()
  )
);

drop policy if exists seller_referrals_select on public.seller_referrals;
create policy seller_referrals_select on public.seller_referrals for select to authenticated
  using (seller_id = public.current_readable_seller_id());

drop policy if exists seller_referrals_insert on public.seller_referrals;
create policy seller_referrals_insert on public.seller_referrals for insert to authenticated
  with check (seller_id = public.current_approved_seller_id());

drop policy if exists seller_referral_events_select on public.referral_events;
create policy seller_referral_events_select on public.referral_events for select to authenticated using (
  exists (
    select 1 from public.seller_referrals sr
    where sr.id = referral_id and sr.seller_id = public.current_readable_seller_id()
  )
);

-- Financial mutations: finance (+ owner via is_finance_admin); other admins read-only
drop policy if exists admin_manage on public.payments;
create policy admin_select_payments on public.payments for select to authenticated
  using (public.is_admin());
create policy finance_write_payments on public.payments for insert to authenticated
  with check (public.is_finance_admin());
create policy finance_update_payments on public.payments for update to authenticated
  using (public.is_finance_admin()) with check (public.is_finance_admin());

drop policy if exists admin_manage on public.payment_events;
create policy admin_select_payment_events on public.payment_events for select to authenticated
  using (public.is_admin());
create policy finance_insert_payment_events on public.payment_events for insert to authenticated
  with check (public.is_finance_admin());

drop policy if exists admin_manage on public.commissions;
create policy admin_select_commissions on public.commissions for select to authenticated
  using (public.is_admin());
create policy finance_write_commissions on public.commissions for insert to authenticated
  with check (public.is_finance_admin());
create policy finance_update_commissions on public.commissions for update to authenticated
  using (public.is_finance_admin()) with check (public.is_finance_admin());

drop policy if exists admin_manage on public.commission_adjustments;
create policy admin_select_commission_adjustments on public.commission_adjustments for select to authenticated
  using (public.is_admin());
create policy finance_write_commission_adjustments on public.commission_adjustments for insert to authenticated
  with check (public.is_finance_admin());

drop policy if exists admin_manage on public.payout_batches;
create policy admin_select_payout_batches on public.payout_batches for select to authenticated
  using (public.is_admin());
create policy finance_write_payout_batches on public.payout_batches for all to authenticated
  using (public.is_finance_admin()) with check (public.is_finance_admin());

drop policy if exists admin_manage on public.payouts;
create policy admin_select_payouts on public.payouts for select to authenticated
  using (public.is_admin());
create policy finance_write_payouts on public.payouts for all to authenticated
  using (public.is_finance_admin()) with check (public.is_finance_admin());

drop policy if exists admin_manage on public.payout_items;
create policy admin_select_payout_items on public.payout_items for select to authenticated
  using (public.is_admin());
create policy finance_write_payout_items on public.payout_items for all to authenticated
  using (public.is_finance_admin()) with check (public.is_finance_admin());

drop policy if exists admin_manage on public.cash_receipts;
create policy admin_select_cash_receipts on public.cash_receipts for select to authenticated
  using (public.is_admin());
create policy finance_write_cash_receipts on public.cash_receipts for all to authenticated
  using (public.is_finance_admin()) with check (public.is_finance_admin());

drop policy if exists admin_manage on public.refunds;
create policy admin_select_refunds on public.refunds for select to authenticated
  using (public.is_admin());
create policy finance_write_refunds on public.refunds for all to authenticated
  using (public.is_finance_admin()) with check (public.is_finance_admin());

-- Seller status changes: owner/sales_admin only (service_role with null auth.uid() still allowed for fixtures)
create or replace function public.enforce_seller_status_authority()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
begin
  if new.status is distinct from old.status
     and auth.uid() is not null
     and public.current_user_role() not in ('owner', 'sales_admin') then
    raise exception 'Only owner or sales_admin may change seller status' using errcode = '42501';
  end if;
  return new;
end;
$$;

drop trigger if exists seller_status_authority on public.seller_profiles;
create trigger seller_status_authority
  before update of status on public.seller_profiles
  for each row execute function public.enforce_seller_status_authority();

drop policy if exists admin_manage on public.user_roles;
create policy owner_manage_roles on public.user_roles for all to authenticated
  using (public.current_user_role() = 'owner')
  with check (public.current_user_role() = 'owner');

-- Partner agreement versions: read for authenticated; mutate owner-only
drop policy if exists admin_manage on public.partner_agreement_versions;
create policy owner_manage_agreement_versions on public.partner_agreement_versions for all to authenticated
  using (public.current_user_role() = 'owner')
  with check (public.current_user_role() = 'owner');

-- Audit logs: admins may select/insert; no delete/update via policy
drop policy if exists admin_manage on public.audit_logs;
create policy admin_select_audit_logs on public.audit_logs for select to authenticated
  using (public.is_admin());
create policy admin_insert_audit_logs on public.audit_logs for insert to authenticated
  with check (public.is_admin());
