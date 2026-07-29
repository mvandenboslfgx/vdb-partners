# CATALOG_LEAD_MATRIX

| Actor              | Catalog         | Lead create                                                                | Notes                         |
| ------------------ | --------------- | -------------------------------------------------------------------------- | ----------------------------- |
| ACTIVE `partner_a` | **11** products | Owner ACTIVE required; probe product UUID → `PRODUCT_NOT_FOUND` (no write) | Expected approved staging set |
| ACTIVE `partner_b` | **11**          | same                                                                       | Cross-partner rows = 0        |
| PENDING            | `FORBIDDEN`     | `FORBIDDEN`                                                                | No commercial snapshot        |
| SUSPENDED          | `FORBIDDEN`     | `FORBIDDEN`                                                                | No partial write              |
| Customer           | `FORBIDDEN`     | `FORBIDDEN`                                                                | No partner profile            |
| Anon               | deny / empty    | table select deny                                                          |                               |

## Policy

- Canonical Owner RPC: `list_partner_catalog` / `create_partner_lead`
- Suspended/pending never receive ACTIVE catalog
- Hidden/disabled products: Owner eligibility rules; fake UUID denied
- Dedupe: Owner `ON CONFLICT (partner_id, dedupe_key)` — not exercised with a successful suspended write (denied before insert)
- No production promotion
