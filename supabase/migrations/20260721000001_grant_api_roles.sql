-- Ensure API roles can access application tables.
-- Local integration tests and server workflows use the service_role key.
-- Without these grants Postgres returns "permission denied for table ..."
-- even though RLS would otherwise be bypassed by service_role.

grant usage on schema public to anon, authenticated, service_role;

grant select, insert, update, delete, references, trigger on all tables in schema public
  to authenticated, service_role;

grant select on all tables in schema public to anon;

grant usage, select on all sequences in schema public to authenticated, service_role;

alter default privileges in schema public
  grant select, insert, update, delete on tables to authenticated, service_role;

alter default privileges in schema public
  grant usage, select on sequences to authenticated, service_role;

-- service_role must manage auth bootstrap inserts used by local fixtures
grant all on table public.user_roles to service_role;
grant all on table public.profiles to service_role;
grant all on table public.seller_profiles to service_role;
grant all on table public.audit_logs to service_role;
