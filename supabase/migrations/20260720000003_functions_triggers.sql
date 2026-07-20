-- Concurrency-safe business number sequences.
create sequence public.seller_number_seq start with 1 minvalue 1;
create sequence public.order_number_seq start with 1 minvalue 1;
create sequence public.commission_number_seq start with 1 minvalue 1;
create sequence public.payment_number_seq start with 1 minvalue 1;
create sequence public.payout_batch_number_seq start with 1 minvalue 1;
create sequence public.referral_number_seq start with 1 minvalue 1;
create sequence public.ticket_number_seq start with 1 minvalue 1;

create or replace function public.next_business_number(p_kind text)
returns text language plpgsql volatile
set search_path = pg_catalog, public
as $$
declare next_value bigint;
begin
  case p_kind
    when 'seller' then next_value := nextval('public.seller_number_seq'); return 'VDB-SELLER-' || lpad(next_value::text, 6, '0');
    when 'order' then next_value := nextval('public.order_number_seq'); return 'VDB-ORD-' || lpad(next_value::text, 6, '0');
    when 'commission' then next_value := nextval('public.commission_number_seq'); return 'VDB-COM-' || lpad(next_value::text, 6, '0');
    when 'payment' then next_value := nextval('public.payment_number_seq'); return 'VDB-PAY-' || lpad(next_value::text, 6, '0');
    when 'batch' then next_value := nextval('public.payout_batch_number_seq'); return 'VDB-BATCH-' || lpad(next_value::text, 6, '0');
    when 'referral' then next_value := nextval('public.referral_number_seq'); return 'VDB-REF-' || lpad(next_value::text, 6, '0');
    when 'ticket' then next_value := nextval('public.ticket_number_seq'); return 'VDB-TICKET-' || lpad(next_value::text, 6, '0');
    else raise exception 'Unknown business number kind: %', p_kind using errcode = '22023';
  end case;
end;
$$;

create or replace function public.assign_business_number()
returns trigger language plpgsql
set search_path = pg_catalog, public
as $$
begin
  if tg_table_name = 'seller_profiles' and new.seller_number is null then new.seller_number := public.next_business_number('seller'); end if;
  if tg_table_name = 'orders' and new.order_number is null then new.order_number := public.next_business_number('order'); end if;
  if tg_table_name = 'commissions' and new.commission_number is null then new.commission_number := public.next_business_number('commission'); end if;
  if tg_table_name = 'payments' and new.payment_number is null then new.payment_number := public.next_business_number('payment'); end if;
  if tg_table_name = 'payout_batches' and new.batch_number is null then new.batch_number := public.next_business_number('batch'); end if;
  if tg_table_name = 'seller_referrals' and new.referral_number is null then new.referral_number := public.next_business_number('referral'); end if;
  if tg_table_name = 'support_tickets' and new.ticket_number is null then new.ticket_number := public.next_business_number('ticket'); end if;
  return new;
end;
$$;

create trigger seller_profiles_assign_number before insert on public.seller_profiles for each row execute function public.assign_business_number();
create trigger orders_assign_number before insert on public.orders for each row execute function public.assign_business_number();
create trigger commissions_assign_number before insert on public.commissions for each row execute function public.assign_business_number();
create trigger payments_assign_number before insert on public.payments for each row execute function public.assign_business_number();
create trigger payout_batches_assign_number before insert on public.payout_batches for each row execute function public.assign_business_number();
create trigger seller_referrals_assign_number before insert on public.seller_referrals for each row execute function public.assign_business_number();
create trigger support_tickets_assign_number before insert on public.support_tickets for each row execute function public.assign_business_number();

-- Provision the application-safe identity record whenever Supabase Auth creates
-- a user. Authorization is deliberately not inferred from user metadata.
create or replace function private.handle_new_user()
returns trigger language plpgsql
security definer
set search_path = pg_catalog, public
as $$
begin
  insert into public.profiles (id, display_name)
  values (
    new.id,
    coalesce(
      nullif(trim(new.raw_user_meta_data ->> 'display_name'), ''),
      nullif(split_part(coalesce(new.email, ''), '@', 1), ''),
      'Portal user'
    )
  )
  on conflict (id) do nothing;
  return new;
end;
$$;
revoke all on function private.handle_new_user() from public;
create trigger on_auth_user_created
after insert on auth.users
for each row execute function private.handle_new_user();

create or replace function public.set_updated_at()
returns trigger language plpgsql
set search_path = pg_catalog, public
as $$ begin new.updated_at = now(); return new; end; $$;

do $$
declare table_name text;
begin
  foreach table_name in array array[
    'profiles','seller_profiles','seller_business_profiles','seller_verifications','products','product_variants',
    'product_costs','product_compliance','product_seller_access','customers','orders','payments','fulfilments',
    'commission_rules','commissions','payout_batches','payouts','disputes','marketing_assets','support_tickets',
    'admin_notes','system_settings','feature_flags'
  ]
  loop
    execute format('create trigger set_updated_at before update on public.%I for each row execute function public.set_updated_at()', table_name);
  end loop;
end $$;

create or replace function public.record_status_history()
returns trigger language plpgsql
set search_path = pg_catalog, public
as $$
begin
  if new.status is distinct from old.status then
    if tg_table_name = 'seller_profiles' then
      insert into public.seller_status_history (seller_id, from_status, to_status, changed_by)
      values (new.id, old.status, new.status, auth.uid());
    elsif tg_table_name = 'orders' then
      insert into public.order_status_history (order_id, from_status, to_status, changed_by)
      values (new.id, old.status, new.status, auth.uid());
    end if;
  end if;
  return new;
end;
$$;
create trigger seller_status_history_after_update after update of status on public.seller_profiles for each row execute function public.record_status_history();
create trigger order_status_history_after_update after update of status on public.orders for each row execute function public.record_status_history();

-- A seller may maintain payment destination data only; review/status decisions
-- stay with the portal administrators.
create or replace function public.protect_seller_profile()
returns trigger language plpgsql
set search_path = pg_catalog, public
as $$
begin
  if old.user_id = auth.uid() and not public.is_admin() then
    if new.id is distinct from old.id or new.user_id is distinct from old.user_id
       or new.seller_number is distinct from old.seller_number or new.account_type is distinct from old.account_type
       or new.status is distinct from old.status or new.public_name is distinct from old.public_name
       or new.referral_code is distinct from old.referral_code or new.approved_at is distinct from old.approved_at
       or new.suspended_at is distinct from old.suspended_at then
      raise exception 'Sellers may only update payout details' using errcode = '42501';
    end if;
  end if;
  return new;
end;
$$;
create trigger seller_profile_protected before update on public.seller_profiles for each row execute function public.protect_seller_profile();

-- Enforce commission timing independent of API/RLS. A commission cannot be
-- calculated until VDB has verified payment; it becomes available only once the
-- order is delivered and the configured hold period elapsed.
create or replace function public.enforce_commission_lifecycle()
returns trigger language plpgsql
set search_path = pg_catalog, public
as $$
declare
  payment_verified boolean;
  delivered_at_value timestamptz;
  hold_days integer := 7;
  required_available_at timestamptz;
begin
  select exists (
    select 1 from public.payments p
    where p.order_id = new.order_id and p.status = 'paid' and p.verified_at is not null
  ) into payment_verified;
  select delivered_at into delivered_at_value from public.orders where id = new.order_id;
  select coalesce((value #>> '{}')::integer, 7) into hold_days
  from public.system_settings where key = 'commission_hold_days';
  hold_days := coalesce(hold_days, 7);

  if new.status not in ('not_eligible', 'cancelled') and not payment_verified then
    raise exception 'Commission requires verified VDB payment' using errcode = '23514';
  end if;
  if new.status in ('available', 'scheduled_for_payout', 'paid') then
    if delivered_at_value is null then
      raise exception 'Commission requires delivered order' using errcode = '23514';
    end if;
    required_available_at := delivered_at_value + make_interval(days => hold_days);
    if new.available_at is null or new.available_at < required_available_at or now() < required_available_at then
      raise exception 'Commission hold period has not elapsed' using errcode = '23514';
    end if;
  end if;
  return new;
end;
$$;
create trigger commissions_enforce_lifecycle before insert or update on public.commissions for each row execute function public.enforce_commission_lifecycle();

create or replace function public.enforce_payout_item_eligibility()
returns trigger language plpgsql
set search_path = pg_catalog, public
as $$
declare commission_record public.commissions%rowtype;
begin
  select * into commission_record from public.commissions where id = new.commission_id for update;
  if not found or commission_record.status <> 'available' then
    raise exception 'Only available commissions can be added to payouts' using errcode = '23514';
  end if;
  if commission_record.amount_cents <> new.amount_cents then
    raise exception 'Payout item must equal the available commission amount' using errcode = '23514';
  end if;
  return new;
end;
$$;
create trigger payout_items_eligible before insert on public.payout_items for each row execute function public.enforce_payout_item_eligibility();

-- Ledger is append-only. Corrections must be represented as new compensating
-- debit/credit entries with a fresh transaction_id.
create or replace function public.reject_ledger_mutation()
returns trigger language plpgsql
as $$ begin raise exception 'ledger_entries are append-only; use compensating entries' using errcode = '55000'; end; $$;
create trigger ledger_entries_no_update before update on public.ledger_entries for each row execute function public.reject_ledger_mutation();
create trigger ledger_entries_no_delete before delete on public.ledger_entries for each row execute function public.reject_ledger_mutation();

create or replace function public.assert_ledger_transaction_balanced()
returns trigger language plpgsql
set search_path = pg_catalog, public
as $$
declare balance_cents bigint;
begin
  select coalesce(sum(case entry_type when 'debit' then amount_cents else -amount_cents end), 0)
  into balance_cents
  from public.ledger_entries
  where transaction_id = new.transaction_id;
  if balance_cents <> 0 then
    raise exception 'Ledger transaction % is unbalanced by % cents', new.transaction_id, balance_cents using errcode = '23514';
  end if;
  return null;
end;
$$;
create constraint trigger ledger_entries_balanced
after insert on public.ledger_entries
deferrable initially deferred
for each row execute function public.assert_ledger_transaction_balanced();

-- Audit only accepted records from the application layer; webhook payloads are
-- already immutable events and are intentionally not copied into audit_logs.
create or replace function private.audit_row_change()
returns trigger language plpgsql
security definer
set search_path = pg_catalog, public
as $$
begin
  insert into public.audit_logs(actor_id, action, entity_type, entity_id, before_data, after_data)
  values (
    auth.uid(), lower(tg_op), tg_table_name,
    case when tg_op = 'DELETE' then old.id else new.id end,
    case when tg_op in ('UPDATE', 'DELETE') then to_jsonb(old) end,
    case when tg_op in ('INSERT', 'UPDATE') then to_jsonb(new) end
  );
  return coalesce(new, old);
end;
$$;
revoke all on function private.audit_row_change() from public;
create trigger orders_audit after insert or update on public.orders for each row execute function private.audit_row_change();
create trigger payments_audit after insert or update on public.payments for each row execute function private.audit_row_change();
create trigger payouts_audit after insert or update on public.payouts for each row execute function private.audit_row_change();
create trigger commissions_audit after insert or update on public.commissions for each row execute function private.audit_row_change();
