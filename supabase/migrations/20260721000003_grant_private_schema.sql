-- Fix privilege and SECURITY DEFINER gaps that blocked service_role workflows.
grant usage on schema private to service_role, authenticated;
grant execute on all functions in schema private to service_role, authenticated;

create or replace function public.current_user_role()
returns public.app_role
language sql
stable
security definer
set search_path = pg_catalog, public, private
as $$ select private.current_user_role(); $$;

create or replace function public.current_seller_id()
returns uuid
language sql
stable
security definer
set search_path = pg_catalog, public, private
as $$ select private.current_seller_id(); $$;

create or replace function public.is_admin()
returns boolean language sql stable security definer
set search_path = pg_catalog, public
as $$ select coalesce(public.current_user_role() in ('owner', 'finance_admin', 'sales_admin', 'support_admin'), false); $$;

create or replace function public.is_finance_admin()
returns boolean language sql stable security definer
set search_path = pg_catalog, public
as $$ select coalesce(public.current_user_role() in ('owner', 'finance_admin'), false); $$;

create or replace function public.is_sales_admin()
returns boolean language sql stable security definer
set search_path = pg_catalog, public
as $$ select coalesce(public.current_user_role() in ('owner', 'sales_admin'), false); $$;

create or replace function public.is_support_admin()
returns boolean language sql stable security definer
set search_path = pg_catalog, public
as $$ select coalesce(public.current_user_role() in ('owner', 'support_admin'), false); $$;

grant execute on function public.current_user_role() to authenticated, service_role;
grant execute on function public.current_seller_id() to authenticated, service_role;
grant execute on function public.is_admin() to authenticated, service_role;
grant execute on function public.is_finance_admin() to authenticated, service_role;
grant execute on function public.is_sales_admin() to authenticated, service_role;
grant execute on function public.is_support_admin() to authenticated, service_role;
grant execute on function public.next_business_number(text) to authenticated, service_role;
