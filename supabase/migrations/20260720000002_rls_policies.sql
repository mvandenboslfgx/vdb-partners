-- RLS is mandatory for every public application table. Authorization facts are
-- read through a private, security-definer function to avoid RLS recursion.
create schema if not exists private;
revoke all on schema private from public;

create or replace function private.current_user_role()
returns public.app_role
language sql stable security definer
set search_path = pg_catalog, public
as $$
  select ur.role
  from public.user_roles ur
  where ur.user_id = auth.uid()
  order by case ur.role
    when 'owner' then 1 when 'finance_admin' then 2 when 'sales_admin' then 3
    when 'support_admin' then 4 else 5 end
  limit 1;
$$;

create or replace function public.current_user_role()
returns public.app_role
language sql stable
set search_path = pg_catalog, public, private
as $$ select private.current_user_role(); $$;

create or replace function public.is_admin()
returns boolean language sql stable
set search_path = pg_catalog, public
as $$ select coalesce(public.current_user_role() in ('owner', 'finance_admin', 'sales_admin', 'support_admin'), false); $$;

create or replace function public.is_finance_admin()
returns boolean language sql stable
set search_path = pg_catalog, public
as $$ select coalesce(public.current_user_role() in ('owner', 'finance_admin'), false); $$;

create or replace function public.is_sales_admin()
returns boolean language sql stable
set search_path = pg_catalog, public
as $$ select coalesce(public.current_user_role() in ('owner', 'sales_admin'), false); $$;

create or replace function public.is_support_admin()
returns boolean language sql stable
set search_path = pg_catalog, public
as $$ select coalesce(public.current_user_role() in ('owner', 'support_admin'), false); $$;

create or replace function private.current_seller_id()
returns uuid language sql stable security definer
set search_path = pg_catalog, public
as $$ select id from public.seller_profiles where user_id = auth.uid(); $$;

create or replace function public.current_seller_id()
returns uuid language sql stable
set search_path = pg_catalog, public, private
as $$ select private.current_seller_id(); $$;

revoke all on function private.current_user_role() from public;
revoke all on function private.current_seller_id() from public;
grant usage on schema private to authenticated;
grant execute on function private.current_user_role(), private.current_seller_id() to authenticated;

do $$
declare table_name text;
begin
  foreach table_name in array array[
    'profiles','user_roles','seller_profiles','seller_business_profiles','seller_status_history',
    'seller_verifications','verification_events','partner_agreement_versions','partner_agreement_acceptances',
    'products','product_variants','product_prices','product_costs','product_compliance','product_documents',
    'product_seller_access','customers','seller_referrals','referral_events','orders','order_items',
    'order_status_history','payments','payment_events','payment_webhook_events','fulfilments','fulfilment_events',
    'commission_rules','commission_rule_versions','commission_calculations','commissions','commission_adjustments',
    'ledger_accounts','ledger_entries','payout_batches','payouts','payout_items','cash_receipts','refunds',
    'disputes','marketing_assets','notifications','support_tickets','support_messages','audit_logs',
    'admin_notes','system_settings','feature_flags'
  ]
  loop
    execute format('alter table public.%I enable row level security', table_name);
    execute format('create policy admin_manage on public.%I for all to authenticated using (public.is_admin()) with check (public.is_admin())', table_name);
  end loop;
end $$;

-- Costs and the ledger have stricter separation of duties than general portal
-- administration. The ledger deliberately has no UPDATE or DELETE policy.
drop policy admin_manage on public.product_costs;
create policy product_costs_finance_manage on public.product_costs for all to authenticated
  using ((select public.is_finance_admin()))
  with check ((select public.is_finance_admin()));

drop policy admin_manage on public.ledger_entries;
create policy ledger_entries_finance_select on public.ledger_entries for select to authenticated
  using ((select public.is_finance_admin()));
create policy ledger_entries_finance_insert on public.ledger_entries for insert to authenticated
  with check ((select public.is_finance_admin()));

-- Identity and seller onboarding.
create policy profile_self_select on public.profiles for select to authenticated using (id = auth.uid());
create policy profile_self_update on public.profiles for update to authenticated using (id = auth.uid()) with check (id = auth.uid());
create policy role_self_select on public.user_roles for select to authenticated using (user_id = auth.uid());

create policy seller_self_select on public.seller_profiles for select to authenticated using (user_id = auth.uid());
create policy seller_self_update on public.seller_profiles for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy seller_business_self_select on public.seller_business_profiles for select to authenticated using (seller_id = public.current_seller_id());
create policy seller_business_self_update on public.seller_business_profiles for update to authenticated using (seller_id = public.current_seller_id()) with check (seller_id = public.current_seller_id());
create policy seller_status_history_self_select on public.seller_status_history for select to authenticated using (seller_id = public.current_seller_id());
create policy seller_verification_self_select on public.seller_verifications for select to authenticated using (seller_id = public.current_seller_id());
create policy verification_events_self_select on public.verification_events for select to authenticated using (
  exists (select 1 from public.seller_verifications sv where sv.id = verification_id and sv.seller_id = public.current_seller_id())
);
create policy agreement_versions_authenticated_select on public.partner_agreement_versions for select to authenticated using (auth.uid() is not null);
create policy agreement_acceptances_self_select on public.partner_agreement_acceptances for select to authenticated using (seller_id = public.current_seller_id());
create policy agreement_acceptances_self_insert on public.partner_agreement_acceptances for insert to authenticated with check (
  seller_id = public.current_seller_id() and accepted_by = auth.uid()
);

-- Product catalogue: only products explicitly enabled for the seller and approved
-- for sale are visible. Product costs intentionally have no seller policy.
create policy seller_products_select on public.products for select to authenticated using (
  exists (
    select 1 from public.product_seller_access psa
    join public.product_compliance pc on pc.product_id = psa.product_id
    where psa.product_id = products.id and psa.seller_id = public.current_seller_id()
      and psa.is_enabled and pc.status = 'approved_for_sale' and products.is_active
  )
);
create policy seller_variants_select on public.product_variants for select to authenticated using (
  is_active and exists (select 1 from public.products p where p.id = product_id)
);
create policy seller_prices_select on public.product_prices for select to authenticated using (
  exists (select 1 from public.product_variants pv where pv.id = variant_id)
);
create policy seller_compliance_select on public.product_compliance for select to authenticated using (
  status = 'approved_for_sale' and exists (select 1 from public.products p where p.id = product_id)
);
create policy seller_documents_select on public.product_documents for select to authenticated using (
  exists (select 1 from public.products p where p.id = product_id)
);
create policy seller_product_access_select on public.product_seller_access for select to authenticated using (seller_id = public.current_seller_id());
create policy seller_marketing_assets_select on public.marketing_assets for select to authenticated using (
  is_active and (product_id is null or exists (select 1 from public.products p where p.id = marketing_assets.product_id))
);

-- Attribution and commercial flow. Customers pay VDB; sellers may only inspect
-- records attributed to themselves and cannot create payments or financial records.
create policy seller_referrals_select on public.seller_referrals for select to authenticated using (seller_id = public.current_seller_id());
create policy seller_referrals_insert on public.seller_referrals for insert to authenticated with check (seller_id = public.current_seller_id());
create policy seller_referral_events_select on public.referral_events for select to authenticated using (
  exists (select 1 from public.seller_referrals sr where sr.id = referral_id and sr.seller_id = public.current_seller_id())
);
create policy seller_orders_select on public.orders for select to authenticated using (seller_id = public.current_seller_id());
create policy seller_order_items_select on public.order_items for select to authenticated using (
  exists (select 1 from public.orders o where o.id = order_id and o.seller_id = public.current_seller_id())
);
create policy seller_order_history_select on public.order_status_history for select to authenticated using (
  exists (select 1 from public.orders o where o.id = order_id and o.seller_id = public.current_seller_id())
);
create policy seller_payments_select on public.payments for select to authenticated using (
  exists (select 1 from public.orders o where o.id = payments.order_id and o.seller_id = public.current_seller_id())
);
create policy seller_payment_events_select on public.payment_events for select to authenticated using (
  exists (select 1 from public.payments p join public.orders o on o.id = p.order_id where p.id = payment_id and o.seller_id = public.current_seller_id())
);
create policy seller_fulfilments_select on public.fulfilments for select to authenticated using (
  exists (select 1 from public.orders o where o.id = order_id and o.seller_id = public.current_seller_id())
);
create policy seller_fulfilment_events_select on public.fulfilment_events for select to authenticated using (
  exists (select 1 from public.fulfilments f join public.orders o on o.id = f.order_id where f.id = fulfilment_id and o.seller_id = public.current_seller_id())
);

-- Sellers can see only their own commission and payout results, never the
-- accounts, ledger, customer records, costs, or other sellers' data.
create policy seller_commissions_select on public.commissions for select to authenticated using (seller_id = public.current_seller_id());
create policy seller_commission_calculations_select on public.commission_calculations for select to authenticated using (seller_id = public.current_seller_id());
create policy seller_commission_adjustments_select on public.commission_adjustments for select to authenticated using (
  exists (select 1 from public.commissions c where c.id = commission_id and c.seller_id = public.current_seller_id())
);
create policy seller_payouts_select on public.payouts for select to authenticated using (seller_id = public.current_seller_id());
create policy seller_payout_items_select on public.payout_items for select to authenticated using (
  exists (select 1 from public.payouts p where p.id = payout_id and p.seller_id = public.current_seller_id())
);
create policy seller_cash_receipts_select on public.cash_receipts for select to authenticated using (
  exists (select 1 from public.payouts p where p.id = payout_id and p.seller_id = public.current_seller_id())
);

create policy commission_rules_seller_select on public.commission_rules for select to authenticated using (auth.uid() is not null);
create policy commission_rule_versions_seller_select on public.commission_rule_versions for select to authenticated using (auth.uid() is not null);
create policy notification_recipient_select on public.notifications for select to authenticated using (recipient_id = auth.uid());
create policy notification_recipient_update on public.notifications for update to authenticated using (recipient_id = auth.uid()) with check (recipient_id = auth.uid());
create policy tickets_seller_select on public.support_tickets for select to authenticated using (opened_by = auth.uid() or seller_id = public.current_seller_id());
create policy tickets_seller_insert on public.support_tickets for insert to authenticated with check (
  opened_by = auth.uid() and (seller_id is null or seller_id = public.current_seller_id())
);
create policy messages_seller_select on public.support_messages for select to authenticated using (
  not is_internal and exists (select 1 from public.support_tickets t where t.id = ticket_id and (t.opened_by = auth.uid() or t.seller_id = public.current_seller_id()))
);
create policy messages_seller_insert on public.support_messages for insert to authenticated with check (
  author_id = auth.uid() and not is_internal and exists (select 1 from public.support_tickets t where t.id = ticket_id and (t.opened_by = auth.uid() or t.seller_id = public.current_seller_id()))
);
create policy settings_authenticated_select on public.system_settings for select to authenticated using (auth.uid() is not null);
create policy flags_authenticated_select on public.feature_flags for select to authenticated using (auth.uid() is not null);
