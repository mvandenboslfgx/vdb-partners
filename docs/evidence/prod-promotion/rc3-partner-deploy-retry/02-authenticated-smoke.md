# Authenticated production smoke (Vercel URL)

**Site:** `https://vdb-partners-u1lhs8muc-matthijs-projects-301cd812.vercel.app`  
**Deployment:** `dpl_8Zu94M3UwFm5rT6Lt2m2YLLZZePF`  
**Vault:** `C:\Users\XXX\.vdb-vault\partner-production-auth-smoke.env`  
**Command:** `node scripts/prod-partner-rc3-smoke.mjs`  
**Result:** **86/86 PASS** (exit 0)

See `authenticated-smoke.json` for full matrix.

## Highlights

- Production Supabase host only; no staging ref
- Health: `ok`, `mollieConfigured=false`
- Partner A/B login, dashboard dest, refresh, relogin
- Partner A/B financial surfaces + `partner_financial_summary` (non-500 / ok)
- A/B lead isolation (cross-ID empty/denied)
- Pending → onboarding; sales empty/denied
- Customer → `/geen-toegang`; partner_leads denied/empty
- Staff/admin/owner → `/admin`
- Anon private tables denied/empty
- `user_roles` / `seller_profiles` denied/missing
- Internal support reply not leaked to partner
- DB pre-check: **48** migrations, tip **`20260728090100`**, auth users **12**
- Fail-closed: no checkout/Mollie/payout execution/realtime/booking exercised

Credentials never printed.
