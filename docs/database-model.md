# VDB Partner Portal database model

## Principles

- The customer is always charged by **VDB Digital Software**. `payments.payee_legal_name` is constrained to that legal name; sellers are compensated through `payouts`, never customer payments.
- Financial history is retained. Foreign keys that feed financial history use `ON DELETE RESTRICT`; `ledger_entries` is append-only at both RLS and trigger level. Corrections require a balancing compensating transaction.
- Every application entity uses a UUID primary key. Mutable entities include `created_at` and `updated_at`; immutable event/history tables retain `created_at`.
- All public tables have RLS enabled. Roles live in `user_roles`, while private security-definer helpers resolve the current role without RLS recursion.

## Identity and partner onboarding

`profiles` mirrors the minimum application identity for `auth.users`. A profile can have one or more `user_roles`.

`seller_profiles` is the seller account, with a unique readable seller number, account type, status, payout destination and referral code. `seller_business_profiles` holds business registration and address data. Status changes are written to `seller_status_history`.

Verification is separated into the current `seller_verifications` record and append-only `verification_events`. Contract text is versioned by `partner_agreement_versions`, and each seller acceptance is recorded in `partner_agreement_acceptances`.

## Catalogue and access

`products` → `product_variants` → time-bounded `product_prices` is the sellable catalogue. Supplier costs are stored independently in `product_costs`; only owners and finance administrators can read it.

`product_compliance` controls whether a product is approved for sale. `product_documents` stores document metadata and `marketing_assets` seller-safe marketing content. `product_seller_access` explicitly grants a seller access to a product. Sellers can read only enabled, active products that have approved compliance.

## Customer, order, and payment flow

`customers` are VDB customer records. A seller attribution begins with `seller_referrals` and append-only `referral_events`.

`orders` and price snapshots in `order_items` record the commercial agreement. Changes in order state are captured by `order_status_history`. VDB's payment collection is represented by `payments`, payment-provider events by `payment_events`, and raw idempotent webhook receipts by `payment_webhook_events`.

Delivery is tracked in `fulfilments` and its event stream. Sellers may see only order/payment/fulfilment data connected to their own `seller_id`; they cannot create or alter VDB payment records.

## Commission and payout lifecycle

Commission configuration uses `commission_rules` and immutable-effective `commission_rule_versions`. `commission_calculations` preserves calculation inputs and result for each order item. `commissions` is the seller-facing lifecycle record; `commission_adjustments` records non-zero corrections.

The commission trigger enforces:

1. A commission cannot be calculated, held, scheduled, or paid until VDB has a verified successful payment.
2. `available`, `scheduled_for_payout`, and `paid` require delivery and the configured `commission_hold_days` (seeded to seven days).
3. A payout item can contain only a currently available commission, at its exact amount.

`payout_batches` groups administrative runs. `payouts`, `payout_items`, and `cash_receipts` preserve the settlement record. Sellers can see only their own commissions and payouts.

## Accounting and operations

`ledger_accounts` is the chart of accounts. Each `ledger_entries` transaction must balance debit and credit totals at commit time. There is intentionally no update or delete policy, and database triggers reject direct mutations.

`refunds` and `disputes` retain payment reversals and dispute outcomes. Operational collaboration uses `notifications`, `support_tickets`, and `support_messages`. Administration is recorded through `audit_logs` and `admin_notes`.

`system_settings` contains controlled configuration values; `feature_flags` gates portal capabilities. The local seed enables the principal portal features and intentionally sets `identity_verification_enabled` to `false`, exercising manual review.

## Readable identifiers

Sequences generate concurrency-safe references:

- `VDB-SELLER-000001`
- `VDB-ORD-000001`
- `VDB-COM-000001`
- `VDB-PAY-000001`
- `VDB-BATCH-000001`
- `VDB-REF-000001`
- `VDB-TICKET-000001`

The database assigns these in `BEFORE INSERT` triggers, so application clients do not generate identifiers.
