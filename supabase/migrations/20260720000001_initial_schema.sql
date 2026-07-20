-- VDB Partner Portal: core relational schema.
-- Authentication identities are owned by Supabase Auth (auth.users).

create extension if not exists pgcrypto;

create type public.app_role as enum ('owner', 'finance_admin', 'sales_admin', 'support_admin', 'seller');
create type public.seller_account_type as enum ('particular', 'sole_trader', 'company');
create type public.seller_status as enum ('draft', 'pending_review', 'approved', 'rejected', 'suspended', 'blocked');
create type public.verification_status as enum ('not_started', 'pending', 'requires_action', 'verified', 'rejected', 'expired', 'manual_review');
create type public.order_status as enum ('draft', 'submitted', 'under_review', 'payment_link_pending', 'awaiting_payment', 'payment_received', 'payment_verified', 'fulfilment_pending', 'in_fulfilment', 'delivered', 'completed', 'cancelled', 'refunded', 'disputed', 'fraud_review');
create type public.payment_status as enum ('pending', 'open', 'paid', 'failed', 'cancelled', 'expired', 'refunded', 'partially_refunded', 'charged_back', 'manual_review');
create type public.commission_status as enum ('not_eligible', 'calculated', 'pending', 'on_hold', 'available', 'scheduled_for_payout', 'paid', 'reversed', 'cancelled', 'disputed');
create type public.payout_method as enum ('bank_transfer', 'cash');
create type public.payout_status as enum ('draft', 'prepared', 'awaiting_confirmation', 'confirmed_received', 'cancelled', 'reversed', 'paid');
create type public.payout_batch_status as enum ('draft', 'review', 'approved', 'processing', 'completed', 'cancelled');
create type public.product_type as enum ('software_license', 'subscription', 'shared_subscription', 'private_subscription', 'family_subscription', 'digital_service', 'installation_service', 'renewal', 'upgrade', 'other');
create type public.compliance_status as enum ('draft', 'under_review', 'approved_for_sale', 'restricted', 'suspended', 'rejected', 'expired_review');
create type public.ledger_account_type as enum ('asset', 'liability', 'revenue', 'expense', 'equity');
create type public.dispute_status as enum ('open', 'under_review', 'won', 'lost', 'closed');
create type public.fulfilment_status as enum ('pending', 'processing', 'delivered', 'failed', 'cancelled');
create type public.ticket_status as enum ('open', 'in_progress', 'waiting_on_customer', 'resolved', 'closed');
create type public.ticket_priority as enum ('low', 'normal', 'high', 'urgent');

create table public.profiles (
  id uuid primary key references auth.users(id) on delete restrict,
  display_name text not null check (char_length(trim(display_name)) between 1 and 120),
  locale text not null default 'nl-NL',
  timezone text not null default 'Europe/Amsterdam',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.user_roles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete restrict,
  role public.app_role not null,
  assigned_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  unique (user_id, role)
);
create index user_roles_user_id_idx on public.user_roles(user_id);

create table public.seller_profiles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references public.profiles(id) on delete restrict,
  seller_number text not null unique check (seller_number ~ '^VDB-SELLER-[0-9]{6,}$'),
  account_type public.seller_account_type not null,
  status public.seller_status not null default 'draft',
  public_name text not null check (char_length(trim(public_name)) between 1 and 160),
  referral_code text not null unique,
  payout_method public.payout_method not null default 'bank_transfer',
  payout_iban text,
  payout_account_holder text,
  approved_at timestamptz,
  suspended_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check ((payout_method = 'cash') or (payout_iban is not null and payout_account_holder is not null))
);

create table public.seller_business_profiles (
  id uuid primary key default gen_random_uuid(),
  seller_id uuid not null unique references public.seller_profiles(id) on delete restrict,
  legal_name text not null,
  trade_name text,
  registration_number text,
  vat_number text,
  country_code char(2) not null default 'NL',
  business_address jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.seller_status_history (
  id uuid primary key default gen_random_uuid(),
  seller_id uuid not null references public.seller_profiles(id) on delete restrict,
  from_status public.seller_status,
  to_status public.seller_status not null,
  reason text,
  changed_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now()
);
create index seller_status_history_seller_id_created_at_idx on public.seller_status_history(seller_id, created_at desc);

create table public.seller_verifications (
  id uuid primary key default gen_random_uuid(),
  seller_id uuid not null references public.seller_profiles(id) on delete restrict,
  verification_type text not null,
  status public.verification_status not null default 'not_started',
  provider text,
  provider_reference text,
  expires_at timestamptz,
  verified_at timestamptz,
  reviewed_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (seller_id, verification_type)
);

create table public.verification_events (
  id uuid primary key default gen_random_uuid(),
  verification_id uuid not null references public.seller_verifications(id) on delete restrict,
  event_type text not null,
  status public.verification_status,
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
create index verification_events_verification_id_created_at_idx on public.verification_events(verification_id, created_at desc);

create table public.partner_agreement_versions (
  id uuid primary key default gen_random_uuid(),
  version text not null unique,
  locale text not null default 'nl-NL',
  title text not null,
  content_markdown text not null,
  content_sha256 text not null unique check (content_sha256 ~ '^[a-f0-9]{64}$'),
  effective_at timestamptz not null,
  retired_at timestamptz,
  created_at timestamptz not null default now(),
  check (retired_at is null or retired_at > effective_at)
);

create table public.partner_agreement_acceptances (
  id uuid primary key default gen_random_uuid(),
  seller_id uuid not null references public.seller_profiles(id) on delete restrict,
  agreement_version_id uuid not null references public.partner_agreement_versions(id) on delete restrict,
  accepted_by uuid not null references public.profiles(id) on delete restrict,
  accepted_at timestamptz not null default now(),
  ip_hash text,
  unique (seller_id, agreement_version_id)
);

create table public.products (
  id uuid primary key default gen_random_uuid(),
  sku text not null unique,
  name text not null,
  slug text not null unique,
  description text,
  product_type public.product_type not null,
  is_active boolean not null default true,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.product_variants (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products(id) on delete restrict,
  sku text not null unique,
  name text not null,
  attributes jsonb not null default '{}'::jsonb,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index product_variants_product_id_idx on public.product_variants(product_id);

create table public.product_prices (
  id uuid primary key default gen_random_uuid(),
  variant_id uuid not null references public.product_variants(id) on delete restrict,
  currency char(3) not null default 'EUR',
  amount_cents integer not null check (amount_cents >= 0),
  tax_rate_bps integer not null default 2100 check (tax_rate_bps between 0 and 10000),
  valid_from timestamptz not null default now(),
  valid_to timestamptz,
  created_at timestamptz not null default now(),
  check (valid_to is null or valid_to > valid_from)
);
create index product_prices_variant_validity_idx on public.product_prices(variant_id, valid_from desc);

create table public.product_costs (
  id uuid primary key default gen_random_uuid(),
  variant_id uuid not null references public.product_variants(id) on delete restrict,
  currency char(3) not null default 'EUR',
  amount_cents integer not null check (amount_cents >= 0),
  supplier_reference text,
  valid_from timestamptz not null default now(),
  valid_to timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (valid_to is null or valid_to > valid_from)
);

create table public.product_compliance (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null unique references public.products(id) on delete restrict,
  status public.compliance_status not null default 'draft',
  reviewed_by uuid references public.profiles(id) on delete set null,
  reviewed_at timestamptz,
  next_review_at timestamptz,
  restrictions text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.product_documents (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products(id) on delete restrict,
  document_type text not null,
  storage_path text not null,
  checksum text,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  unique (product_id, document_type, storage_path)
);

create table public.product_seller_access (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products(id) on delete restrict,
  seller_id uuid not null references public.seller_profiles(id) on delete restrict,
  is_enabled boolean not null default true,
  enabled_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (product_id, seller_id)
);
create index product_seller_access_seller_id_idx on public.product_seller_access(seller_id);

create table public.customers (
  id uuid primary key default gen_random_uuid(),
  email text not null,
  full_name text not null,
  billing_address jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (email)
);

create table public.seller_referrals (
  id uuid primary key default gen_random_uuid(),
  referral_number text not null unique check (referral_number ~ '^VDB-REF-[0-9]{6,}$'),
  seller_id uuid not null references public.seller_profiles(id) on delete restrict,
  customer_id uuid references public.customers(id) on delete restrict,
  referral_code text not null,
  first_order_id uuid,
  converted_at timestamptz,
  created_at timestamptz not null default now(),
  unique (seller_id, referral_code, customer_id)
);
create index seller_referrals_seller_id_idx on public.seller_referrals(seller_id);

create table public.referral_events (
  id uuid primary key default gen_random_uuid(),
  referral_id uuid not null references public.seller_referrals(id) on delete restrict,
  event_type text not null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table public.orders (
  id uuid primary key default gen_random_uuid(),
  order_number text not null unique check (order_number ~ '^VDB-ORD-[0-9]{6,}$'),
  customer_id uuid not null references public.customers(id) on delete restrict,
  seller_id uuid references public.seller_profiles(id) on delete restrict,
  referral_id uuid references public.seller_referrals(id) on delete restrict,
  status public.order_status not null default 'draft',
  currency char(3) not null default 'EUR',
  subtotal_cents integer not null default 0 check (subtotal_cents >= 0),
  tax_cents integer not null default 0 check (tax_cents >= 0),
  total_cents integer not null default 0 check (total_cents >= 0),
  payment_due_at timestamptz,
  submitted_at timestamptz,
  delivered_at timestamptz,
  completed_at timestamptz,
  cancelled_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (total_cents = subtotal_cents + tax_cents)
);
alter table public.seller_referrals
  add constraint seller_referrals_first_order_id_fkey
  foreign key (first_order_id) references public.orders(id) on delete restrict;
create index orders_customer_id_idx on public.orders(customer_id);
create index orders_seller_id_status_idx on public.orders(seller_id, status);

create table public.order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete restrict,
  variant_id uuid not null references public.product_variants(id) on delete restrict,
  product_name_snapshot text not null,
  variant_name_snapshot text not null,
  quantity integer not null check (quantity > 0),
  unit_price_cents integer not null check (unit_price_cents >= 0),
  tax_rate_bps integer not null check (tax_rate_bps between 0 and 10000),
  line_subtotal_cents integer not null check (line_subtotal_cents >= 0),
  line_tax_cents integer not null check (line_tax_cents >= 0),
  line_total_cents integer not null check (line_total_cents >= 0),
  created_at timestamptz not null default now(),
  check (line_total_cents = line_subtotal_cents + line_tax_cents)
);
create index order_items_order_id_idx on public.order_items(order_id);

create table public.order_status_history (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete restrict,
  from_status public.order_status,
  to_status public.order_status not null,
  reason text,
  changed_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now()
);
create index order_status_history_order_id_created_at_idx on public.order_status_history(order_id, created_at desc);

create table public.payments (
  id uuid primary key default gen_random_uuid(),
  payment_number text not null unique check (payment_number ~ '^VDB-PAY-[0-9]{6,}$'),
  order_id uuid not null references public.orders(id) on delete restrict,
  payee_legal_name text not null default 'VDB Digital Software'
    check (payee_legal_name = 'VDB Digital Software'),
  provider text not null,
  provider_payment_id text,
  status public.payment_status not null default 'pending',
  currency char(3) not null default 'EUR',
  amount_cents integer not null check (amount_cents > 0),
  paid_at timestamptz,
  verified_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (provider, provider_payment_id)
);
create index payments_order_id_status_idx on public.payments(order_id, status);

create table public.payment_events (
  id uuid primary key default gen_random_uuid(),
  payment_id uuid not null references public.payments(id) on delete restrict,
  event_type text not null,
  provider_event_id text,
  payload jsonb not null default '{}'::jsonb,
  occurred_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  unique (payment_id, provider_event_id)
);

create table public.payment_webhook_events (
  id uuid primary key default gen_random_uuid(),
  provider text not null,
  provider_event_id text not null,
  signature_valid boolean not null default false,
  payload jsonb not null,
  received_at timestamptz not null default now(),
  processed_at timestamptz,
  processing_error text,
  unique (provider, provider_event_id)
);

create table public.fulfilments (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null unique references public.orders(id) on delete restrict,
  status public.fulfilment_status not null default 'pending',
  delivery_reference text,
  delivered_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.fulfilment_events (
  id uuid primary key default gen_random_uuid(),
  fulfilment_id uuid not null references public.fulfilments(id) on delete restrict,
  event_type text not null,
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table public.commission_rules (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  description text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.commission_rule_versions (
  id uuid primary key default gen_random_uuid(),
  commission_rule_id uuid not null references public.commission_rules(id) on delete restrict,
  version integer not null check (version > 0),
  product_id uuid references public.products(id) on delete restrict,
  calculation_type text not null check (calculation_type in ('fixed_amount', 'percentage')),
  fixed_amount_cents integer check (fixed_amount_cents >= 0),
  percentage_bps integer check (percentage_bps between 0 and 10000),
  currency char(3) not null default 'EUR',
  effective_from timestamptz not null default now(),
  effective_to timestamptz,
  created_at timestamptz not null default now(),
  check (
    (calculation_type = 'fixed_amount' and fixed_amount_cents is not null and percentage_bps is null)
    or (calculation_type = 'percentage' and percentage_bps is not null and fixed_amount_cents is null)
  ),
  check (effective_to is null or effective_to > effective_from),
  unique (commission_rule_id, version)
);

create table public.commission_calculations (
  id uuid primary key default gen_random_uuid(),
  order_item_id uuid not null unique references public.order_items(id) on delete restrict,
  seller_id uuid not null references public.seller_profiles(id) on delete restrict,
  commission_rule_version_id uuid not null references public.commission_rule_versions(id) on delete restrict,
  basis_amount_cents integer not null check (basis_amount_cents >= 0),
  calculated_amount_cents integer not null check (calculated_amount_cents >= 0),
  currency char(3) not null default 'EUR',
  calculated_at timestamptz not null default now(),
  calculation_metadata jsonb not null default '{}'::jsonb
);

create table public.commissions (
  id uuid primary key default gen_random_uuid(),
  commission_number text not null unique check (commission_number ~ '^VDB-COM-[0-9]{6,}$'),
  calculation_id uuid not null unique references public.commission_calculations(id) on delete restrict,
  seller_id uuid not null references public.seller_profiles(id) on delete restrict,
  order_id uuid not null references public.orders(id) on delete restrict,
  status public.commission_status not null default 'not_eligible',
  amount_cents integer not null check (amount_cents >= 0),
  currency char(3) not null default 'EUR',
  available_at timestamptz,
  paid_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index commissions_seller_status_available_idx on public.commissions(seller_id, status, available_at);

create table public.commission_adjustments (
  id uuid primary key default gen_random_uuid(),
  commission_id uuid not null references public.commissions(id) on delete restrict,
  amount_cents integer not null check (amount_cents <> 0),
  reason text not null,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now()
);

create table public.ledger_accounts (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  name text not null,
  account_type public.ledger_account_type not null,
  currency char(3) not null default 'EUR',
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

create table public.ledger_entries (
  id uuid primary key default gen_random_uuid(),
  transaction_id uuid not null,
  account_id uuid not null references public.ledger_accounts(id) on delete restrict,
  order_id uuid references public.orders(id) on delete restrict,
  payment_id uuid references public.payments(id) on delete restrict,
  commission_id uuid references public.commissions(id) on delete restrict,
  payout_id uuid,
  entry_type text not null check (entry_type in ('debit', 'credit')),
  amount_cents integer not null check (amount_cents > 0),
  currency char(3) not null default 'EUR',
  description text not null,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now()
);
create index ledger_entries_transaction_id_idx on public.ledger_entries(transaction_id);
create index ledger_entries_account_id_created_at_idx on public.ledger_entries(account_id, created_at);

create table public.payout_batches (
  id uuid primary key default gen_random_uuid(),
  batch_number text not null unique check (batch_number ~ '^VDB-BATCH-[0-9]{6,}$'),
  status public.payout_batch_status not null default 'draft',
  currency char(3) not null default 'EUR',
  prepared_by uuid references public.profiles(id) on delete set null,
  approved_by uuid references public.profiles(id) on delete set null,
  approved_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.payouts (
  id uuid primary key default gen_random_uuid(),
  payout_batch_id uuid references public.payout_batches(id) on delete restrict,
  seller_id uuid not null references public.seller_profiles(id) on delete restrict,
  method public.payout_method not null,
  status public.payout_status not null default 'draft',
  currency char(3) not null default 'EUR',
  total_amount_cents integer not null default 0 check (total_amount_cents >= 0),
  payment_reference text,
  confirmed_at timestamptz,
  paid_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.ledger_entries
  add constraint ledger_entries_payout_id_fkey foreign key (payout_id) references public.payouts(id) on delete restrict;
create index payouts_seller_status_idx on public.payouts(seller_id, status);

create table public.payout_items (
  id uuid primary key default gen_random_uuid(),
  payout_id uuid not null references public.payouts(id) on delete restrict,
  commission_id uuid not null unique references public.commissions(id) on delete restrict,
  amount_cents integer not null check (amount_cents > 0),
  created_at timestamptz not null default now()
);

create table public.cash_receipts (
  id uuid primary key default gen_random_uuid(),
  payout_id uuid not null unique references public.payouts(id) on delete restrict,
  received_by uuid not null references public.profiles(id) on delete restrict,
  receipt_reference text not null unique,
  received_at timestamptz not null,
  created_at timestamptz not null default now()
);

create table public.refunds (
  id uuid primary key default gen_random_uuid(),
  payment_id uuid not null references public.payments(id) on delete restrict,
  order_id uuid not null references public.orders(id) on delete restrict,
  amount_cents integer not null check (amount_cents > 0),
  currency char(3) not null default 'EUR',
  reason text not null,
  provider_refund_id text,
  refunded_at timestamptz,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  unique (payment_id, provider_refund_id)
);

create table public.disputes (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete restrict,
  payment_id uuid references public.payments(id) on delete restrict,
  status public.dispute_status not null default 'open',
  reason text not null,
  amount_cents integer not null check (amount_cents > 0),
  currency char(3) not null default 'EUR',
  opened_at timestamptz not null default now(),
  resolved_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.marketing_assets (
  id uuid primary key default gen_random_uuid(),
  product_id uuid references public.products(id) on delete restrict,
  title text not null,
  asset_type text not null,
  storage_path text not null,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.notifications (
  id uuid primary key default gen_random_uuid(),
  recipient_id uuid not null references public.profiles(id) on delete restrict,
  type text not null,
  title text not null,
  body text not null,
  metadata jsonb not null default '{}'::jsonb,
  read_at timestamptz,
  created_at timestamptz not null default now()
);
create index notifications_recipient_unread_idx on public.notifications(recipient_id, read_at) where read_at is null;

create table public.support_tickets (
  id uuid primary key default gen_random_uuid(),
  ticket_number text not null unique check (ticket_number ~ '^VDB-TICKET-[0-9]{6,}$'),
  opened_by uuid not null references public.profiles(id) on delete restrict,
  seller_id uuid references public.seller_profiles(id) on delete restrict,
  order_id uuid references public.orders(id) on delete restrict,
  subject text not null,
  status public.ticket_status not null default 'open',
  priority public.ticket_priority not null default 'normal',
  assigned_to uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.support_messages (
  id uuid primary key default gen_random_uuid(),
  ticket_id uuid not null references public.support_tickets(id) on delete restrict,
  author_id uuid references public.profiles(id) on delete set null,
  body text not null,
  is_internal boolean not null default false,
  created_at timestamptz not null default now()
);

create table public.audit_logs (
  id uuid primary key default gen_random_uuid(),
  actor_id uuid references public.profiles(id) on delete set null,
  action text not null,
  entity_type text not null,
  entity_id uuid,
  before_data jsonb,
  after_data jsonb,
  ip_hash text,
  created_at timestamptz not null default now()
);
create index audit_logs_entity_idx on public.audit_logs(entity_type, entity_id, created_at desc);

create table public.admin_notes (
  id uuid primary key default gen_random_uuid(),
  entity_type text not null,
  entity_id uuid not null,
  body text not null,
  created_by uuid not null references public.profiles(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index admin_notes_entity_idx on public.admin_notes(entity_type, entity_id);

create table public.system_settings (
  key text primary key,
  value jsonb not null,
  description text,
  updated_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.feature_flags (
  key text primary key,
  enabled boolean not null default false,
  description text not null,
  updated_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
