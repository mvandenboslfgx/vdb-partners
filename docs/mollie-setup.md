# Mollie setup
Use separate test and live Mollie keys. Store `MOLLIE_API_KEY` only in local/deployment secrets, set `FEATURE_MOLLIE=true` only after configuration, and expose a HTTPS webhook URL. Process each provider event idempotently and retrieve the payment from Mollie before updating local state.

Confirm accepted payment methods, webhook security, refund handling, and operational ownership before enabling production payments.
