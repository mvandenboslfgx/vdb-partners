# Payment flow
Customers pay VDB Digital Software. Create a payment against an order, redirect or present the approved provider flow, and treat the provider API as the source of truth. Webhooks first record a unique provider event, then fetch and persist the verified provider status.

Never trust payment status, amount, or order identifiers from a browser callback alone. Webhook endpoint authentication/signature validation must be finalized before a live launch.
