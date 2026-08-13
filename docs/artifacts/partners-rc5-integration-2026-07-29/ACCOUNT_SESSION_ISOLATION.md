# ACCOUNT_SESSION_ISOLATION

Script case: `account_session_isolation` — **PASS**

| Step                            | Result                                                      |
| ------------------------------- | ----------------------------------------------------------- |
| ACTIVE login (`partner_a`)      | status ACTIVE; catalog 11                                   |
| Logout                          | session cleared (`getSession` empty)                        |
| SUSPENDED login                 | status SUSPENDED; catalog `FORBIDDEN`; different partner id |
| Logout → ACTIVE again           | status ACTIVE; catalog restored; same partner id as before  |
| Partner A → Partner B           | B ACTIVE; `otherPartnerRows = 0`                            |
| SUSPENDED re-login after logout | still SUSPENDED                                             |

## Guarantees

- No stale ACTIVE catalog under suspended session.
- Capability status reloaded from Owner each login.
- Suspended status not overwritten by client cache (stateless supabase-js clients in probe; portal must continue to call Owner RPCs server-side).
- No credentials recorded.
