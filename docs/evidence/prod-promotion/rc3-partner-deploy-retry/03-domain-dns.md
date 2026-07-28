# Domain / DNS status

## Project binding

`partners.vdbdigital.nl` is already assigned to Vercel project `vdb-partners` (`prj_o5KSI7m7TldChUDpL0SgmdEl0pdq`), `verified: true`, `redirect: null`.

## Vercel-required DNS (live recommendation)

From `GET /v6/domains/partners.vdbdigital.nl/config`:

| Rank | Type | Value |
|------|------|-------|
| 1 (preferred) | CNAME | `ec26c162b599cc19.vercel-dns-016.com.` |
| 2 | CNAME | `cname.vercel-dns.com.` |
| alt | A | `216.150.1.1` / `216.150.16.1` |
| alt | A | `76.76.21.21` |

`misconfigured: true`, `aValues: []`, `cnames: []`.

DNS provider (apex): **mijndomein.nl** (`nsn1` / `nsn2`).

## Mutation this gate

**Not applied.** No mijndomein/DNS API credentials available in the operator vault. Apex NS / MX / SPF / DKIM / DMARC were **not** changed.

## Alias / SSL

`vercel alias set … partners.vdbdigital.nl` failed during certificate issuance (DNS missing).  
Subdomain remains **NXDOMAIN** for public resolvers.

## Domain smoke

**Not executed** — blocked on DNS.
