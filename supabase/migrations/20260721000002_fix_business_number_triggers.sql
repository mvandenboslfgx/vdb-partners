-- Fix assign_business_number: PostgreSQL evaluates NEW.<column> for every
-- branch in a shared trigger function, so a shared function referencing
-- order_number/commission_number fails on seller_profiles inserts.
-- Replace with per-table trigger functions.

create or replace function public.assign_seller_number()
returns trigger language plpgsql set search_path = pg_catalog, public as $$
begin
  if new.seller_number is null or btrim(new.seller_number) = '' then
    new.seller_number := public.next_business_number('seller');
  end if;
  return new;
end;
$$;

create or replace function public.assign_order_number()
returns trigger language plpgsql set search_path = pg_catalog, public as $$
begin
  if new.order_number is null or btrim(new.order_number) = '' then
    new.order_number := public.next_business_number('order');
  end if;
  return new;
end;
$$;

create or replace function public.assign_commission_number()
returns trigger language plpgsql set search_path = pg_catalog, public as $$
begin
  if new.commission_number is null or btrim(new.commission_number) = '' then
    new.commission_number := public.next_business_number('commission');
  end if;
  return new;
end;
$$;

create or replace function public.assign_batch_number()
returns trigger language plpgsql set search_path = pg_catalog, public as $$
begin
  if new.batch_number is null or btrim(new.batch_number) = '' then
    new.batch_number := public.next_business_number('batch');
  end if;
  return new;
end;
$$;

create or replace function public.assign_referral_number()
returns trigger language plpgsql set search_path = pg_catalog, public as $$
begin
  if new.referral_number is null or btrim(new.referral_number) = '' then
    new.referral_number := public.next_business_number('referral');
  end if;
  return new;
end;
$$;

create or replace function public.assign_ticket_number()
returns trigger language plpgsql set search_path = pg_catalog, public as $$
begin
  if new.ticket_number is null or btrim(new.ticket_number) = '' then
    new.ticket_number := public.next_business_number('ticket');
  end if;
  return new;
end;
$$;

create or replace function public.assign_payment_number()
returns trigger language plpgsql set search_path = pg_catalog, public as $$
begin
  if new.payment_number is null or btrim(new.payment_number) = '' then
    new.payment_number := public.next_business_number('payment');
  end if;
  return new;
end;
$$;

drop trigger if exists seller_profiles_assign_number on public.seller_profiles;
drop trigger if exists orders_assign_number on public.orders;
drop trigger if exists commissions_assign_number on public.commissions;
drop trigger if exists payments_assign_number on public.payments;
drop trigger if exists payout_batches_assign_number on public.payout_batches;
drop trigger if exists seller_referrals_assign_number on public.seller_referrals;
drop trigger if exists support_tickets_assign_number on public.support_tickets;

create trigger seller_profiles_assign_number before insert on public.seller_profiles
  for each row execute function public.assign_seller_number();
create trigger orders_assign_number before insert on public.orders
  for each row execute function public.assign_order_number();
create trigger commissions_assign_number before insert on public.commissions
  for each row execute function public.assign_commission_number();
create trigger payments_assign_number before insert on public.payments
  for each row execute function public.assign_payment_number();
create trigger payout_batches_assign_number before insert on public.payout_batches
  for each row execute function public.assign_batch_number();
create trigger seller_referrals_assign_number before insert on public.seller_referrals
  for each row execute function public.assign_referral_number();
create trigger support_tickets_assign_number before insert on public.support_tickets
  for each row execute function public.assign_ticket_number();

drop function if exists public.assign_business_number();
