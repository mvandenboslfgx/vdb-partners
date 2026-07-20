-- Safe local development seed. This intentionally does not create auth.users.
-- Create the local owner in Studio or with the Auth admin API; the auth trigger
-- creates its profile. Then grant the role with:
-- insert into public.user_roles (user_id, role) values ('<auth-user-uuid>', 'owner');

insert into public.system_settings (key, value, description) values
  ('commission_hold_days', '7'::jsonb, 'Days after delivery before a commission is available'),
  ('min_payout_amount', '25'::jsonb, 'Minimum eligible payout amount in the default currency'),
  ('default_currency', '"EUR"'::jsonb, 'Default portal settlement currency')
on conflict (key) do update set value = excluded.value, description = excluded.description;

insert into public.feature_flags (key, enabled, description) values
  ('seller_registration_enabled', true, 'Allow new seller registrations'),
  ('identity_verification_enabled', false, 'False locally: route seller verification to manual review'),
  ('mollie_payments_enabled', false, 'Fail-closed until Mollie keys are configured'),
  ('manual_bank_payments_enabled', true, 'Allow finance/owner to confirm bank transfers to VDB'),
  ('cash_payouts_enabled', true, 'Enable cash payout confirmation (VDB → seller only)'),
  ('bank_payouts_enabled', true, 'Enable bank payout registration'),
  ('marketing_library_enabled', true, 'Enable seller marketing assets'),
  ('support_enabled', true, 'Enable seller support tickets'),
  ('international_registration_enabled', true, 'Allow non-NL registration numbers')
on conflict (key) do update set enabled = excluded.enabled, description = excluded.description;

insert into public.partner_agreement_versions (id, version, locale, title, content_markdown, content_sha256, effective_at)
values (
  '10000000-0000-0000-0000-000000000001',
  '2026.07-NL',
  'nl-NL',
  'VDB Partnerovereenkomst',
  E'# VDB Partnerovereenkomst\n\n## Betalingsstroom\nDe klant betaalt altijd rechtstreeks aan **VDB Digital Software**. De partner mag geen betaling namens VDB innen en ontvangt uitsluitend een commissie via het VDB-uitbetalingsproces.\n\n## Commissie\nEen commissie ontstaat pas nadat VDB de klantbetaling heeft geverifieerd. De commissie wordt pas beschikbaar na levering en de toepasselijke wachttijd. Terugbetalingen, geschillen en fraudeonderzoek kunnen tot aanpassing of terugboeking leiden.\n\n## Gegevens en toegang\nPartners zien uitsluitend hun eigen gegevens, bestellingen, commissies en uitbetalingen.',
  '1d33d07f55df7ccd2caa231773982e1b4371fbda3a22e23b7e861b45400d4f2b',
  '2026-07-20T00:00:00Z'
)
on conflict (version) do update set
  title = excluded.title, content_markdown = excluded.content_markdown,
  content_sha256 = excluded.content_sha256, effective_at = excluded.effective_at;

insert into public.products (id, sku, name, slug, description, product_type, is_active) values
  ('20000000-0000-0000-0000-000000000001', 'VDB-OFFICE-STD', 'Office Standard License', 'office-standard-license', 'Demo digitale softwarelicentie.', 'software_license', true),
  ('20000000-0000-0000-0000-000000000002', 'VDB-SECURE-ANNUAL', 'Secure Annual Subscription', 'secure-annual-subscription', 'Demo jaarlijkse beveiligingsabonnement.', 'subscription', true),
  ('20000000-0000-0000-0000-000000000003', 'VDB-INSTALL-REMOTE', 'Remote Installation Service', 'remote-installation-service', 'Demo installatie op afstand.', 'installation_service', true)
on conflict (sku) do update set
  name = excluded.name, slug = excluded.slug, description = excluded.description,
  product_type = excluded.product_type, is_active = excluded.is_active;

insert into public.product_variants (id, product_id, sku, name, attributes, is_active) values
  ('21000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000001', 'VDB-OFFICE-STD-1Y', '1 apparaat / permanent', '{"devices":1,"term":"perpetual"}', true),
  ('21000000-0000-0000-0000-000000000002', '20000000-0000-0000-0000-000000000002', 'VDB-SECURE-ANNUAL-1Y', '1 apparaat / 12 maanden', '{"devices":1,"term_months":12}', true),
  ('21000000-0000-0000-0000-000000000003', '20000000-0000-0000-0000-000000000003', 'VDB-INSTALL-REMOTE-1H', 'Remote sessie', '{"duration_minutes":60}', true)
on conflict (sku) do update set name = excluded.name, attributes = excluded.attributes, is_active = excluded.is_active;

insert into public.product_prices (variant_id, currency, amount_cents, tax_rate_bps, valid_from) values
  ('21000000-0000-0000-0000-000000000001', 'EUR', 4999, 2100, '2026-07-20T00:00:00Z'),
  ('21000000-0000-0000-0000-000000000002', 'EUR', 2999, 2100, '2026-07-20T00:00:00Z'),
  ('21000000-0000-0000-0000-000000000003', 'EUR', 7900, 2100, '2026-07-20T00:00:00Z')
on conflict do nothing;

insert into public.product_costs (variant_id, currency, amount_cents, supplier_reference, valid_from) values
  ('21000000-0000-0000-0000-000000000001', 'EUR', 2700, 'DEMO-SUPPLIER-OFFICE', '2026-07-20T00:00:00Z'),
  ('21000000-0000-0000-0000-000000000002', 'EUR', 1500, 'DEMO-SUPPLIER-SECURE', '2026-07-20T00:00:00Z'),
  ('21000000-0000-0000-0000-000000000003', 'EUR', 3500, 'DEMO-SUPPLIER-INSTALL', '2026-07-20T00:00:00Z')
on conflict do nothing;

insert into public.product_compliance (product_id, status, reviewed_at, restrictions) values
  ('20000000-0000-0000-0000-000000000001', 'approved_for_sale', now(), null),
  ('20000000-0000-0000-0000-000000000002', 'approved_for_sale', now(), null),
  ('20000000-0000-0000-0000-000000000003', 'approved_for_sale', now(), null)
on conflict (product_id) do update set status = excluded.status, reviewed_at = excluded.reviewed_at, restrictions = excluded.restrictions;

insert into public.commission_rules (id, name, description, is_active) values
  ('30000000-0000-0000-0000-000000000001', 'Demo fixed commission', 'Fixed local demo commission per eligible sold item.', true)
on conflict (name) do update set description = excluded.description, is_active = excluded.is_active;

insert into public.commission_rule_versions
  (commission_rule_id, version, product_id, calculation_type, fixed_amount_cents, currency, effective_from)
values
  ('30000000-0000-0000-0000-000000000001', 1, '20000000-0000-0000-0000-000000000001', 'fixed_amount', 500, 'EUR', '2026-07-20T00:00:00Z'),
  ('30000000-0000-0000-0000-000000000001', 2, '20000000-0000-0000-0000-000000000002', 'fixed_amount', 400, 'EUR', '2026-07-20T00:00:00Z'),
  ('30000000-0000-0000-0000-000000000001', 3, '20000000-0000-0000-0000-000000000003', 'fixed_amount', 900, 'EUR', '2026-07-20T00:00:00Z')
on conflict (commission_rule_id, version) do update set
  product_id = excluded.product_id, calculation_type = excluded.calculation_type,
  fixed_amount_cents = excluded.fixed_amount_cents, currency = excluded.currency;

insert into public.ledger_accounts (code, name, account_type, currency) values
  ('1010', 'VDB Bank', 'asset', 'EUR'),
  ('2100', 'Seller commissions payable', 'liability', 'EUR'),
  ('4000', 'Software sales revenue', 'revenue', 'EUR'),
  ('6100', 'Software supplier costs', 'expense', 'EUR')
on conflict (code) do update set name = excluded.name, account_type = excluded.account_type, currency = excluded.currency;
