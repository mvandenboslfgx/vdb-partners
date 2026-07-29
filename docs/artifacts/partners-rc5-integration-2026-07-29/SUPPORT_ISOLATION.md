# SUPPORT_ISOLATION

| Actor             | Internal notes visible (`is_internal=true` select) | `add_portal_support_internal_note` |
| ----------------- | -------------------------------------------------- | ---------------------------------- |
| ACTIVE partner    | **false**                                          | `FORBIDDEN`                        |
| PENDING partner   | **false**                                          | `FORBIDDEN`                        |
| SUSPENDED partner | **false**                                          | `FORBIDDEN`                        |
| Staff / Admin     | true (expected staff visibility)                   | allowed / not partner path         |

## Conclusions

- Partner JWT cannot read internal reply rows.
- Partner JWT cannot call internal-note RPC.
- Feature flag `support_internal_notes_rpc` does not leak notes to Partner clients.
- Cross-partner ticket write not available to partners via this RPC (FORBIDDEN).
