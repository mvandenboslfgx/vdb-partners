# Security model
RLS is enabled for all public application tables. Roles are resolved through private security-definer helpers to avoid recursive policies. Seller policies scope records to the authenticated seller; finance-only data includes costs and ledger entries. The ledger has no update/delete policy and triggers reject mutations.

Security headers include CSP, frame denial, MIME sniffing protection, referrer policy, and a restrictive permissions policy. Store secrets only in deployment environment configuration; rotate them if exposed.
