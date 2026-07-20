import type { LedgerAccount, LedgerEntry } from "@/lib/ledger/types";
export function computeBalance(entries: readonly LedgerEntry[], account?: LedgerAccount) {
  return entries.filter((entry) => !account || entry.account === account).reduce((balance, entry) => balance + entry.debit - entry.credit, 0);
}
export function computeBalances(entries: readonly LedgerEntry[]) {
  return entries.reduce<Partial<Record<LedgerAccount, number>>>((balances, entry) => {
    balances[entry.account] = (balances[entry.account] ?? 0) + entry.debit - entry.credit; return balances;
  }, {});
}
