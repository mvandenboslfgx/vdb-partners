import Link from "next/link";
import { cn } from "@/lib/utils";
import { Badge, Card } from "@/components/ui";
import { Logo } from "@/components/brand";

export const sellerLinks = [["Overzicht", "/dashboard"], ["Profiel", "/dashboard/profile"], ["Verificatie", "/dashboard/verification"], ["Overeenkomst", "/dashboard/agreement"], ["Producten", "/dashboard/products"], ["Verkopen", "/dashboard/sales"], ["Commissies", "/dashboard/commissions"], ["Uitbetalingen", "/dashboard/payouts"], ["Marketing", "/dashboard/marketing"], ["Verwijzingen", "/dashboard/referrals"], ["Meldingen", "/dashboard/notifications"], ["Support", "/dashboard/support"], ["Instellingen", "/dashboard/settings"]];
export const adminLinks = [["Overzicht", "/admin"], ["Partners", "/admin/sellers"], ["Aanmeldingen", "/admin/applications"], ["Verificaties", "/admin/verifications"], ["Overeenkomsten", "/admin/agreements"], ["Producten", "/admin/products"], ["Orders", "/admin/orders"], ["Betalingen", "/admin/payments"], ["Commissies", "/admin/commissions"], ["Commissieregels", "/admin/commission-rules"], ["Uitbetalingen", "/admin/payouts"], ["Payout batches", "/admin/payouts/batches"], ["Refunds", "/admin/refunds"], ["Geschillen", "/admin/disputes"], ["Rapporten", "/admin/reports"], ["Auditlog", "/admin/audit"], ["Team", "/admin/team"], ["Instellingen", "/admin/settings"]];

export function Sidebar({ admin = false }: { admin?: boolean }) {
  const links = admin ? adminLinks : sellerLinks;
  return <aside className="hidden w-64 shrink-0 border-r border-border bg-[#0d0d0c] p-6 lg:block"><Logo compact /><p className="mb-6 mt-8 text-[10px] font-semibold uppercase tracking-[0.18em] text-muted">{admin ? "Beheeromgeving" : "Partner Portal"}</p><nav className="space-y-1">{links.map(([label, href]) => <Link key={href} href={href} className="block rounded-sm px-3 py-2 text-sm text-[#c9c4ba] transition hover:bg-white/5 hover:text-gold">{label}</Link>)}</nav></aside>;
}
export function MobileNav({ admin = false }: { admin?: boolean }) { return <div className="flex gap-5 overflow-x-auto border-b border-border px-5 py-3 text-xs text-muted lg:hidden">{(admin ? adminLinks : sellerLinks).slice(0, 6).map(([label, href]) => <Link key={href} href={href}>{label}</Link>)}</div>; }
export function StatsCard({ label, value, detail }: { label: string; value: string; detail?: string }) { return <Card className="p-5"><p className="text-xs uppercase tracking-[0.14em] text-muted">{label}</p><p className="display mt-3 text-3xl">{value}</p>{detail && <p className="mt-2 text-xs text-muted">{detail}</p>}</Card>; }
export function StatusBadge({ status }: { status: string }) { const label = status.replaceAll("_", " "); return <Badge className={cn(status === "paid" && "border-emerald-500/40 bg-emerald-500/10 text-emerald-300", status === "pending" && "border-amber-400/40 bg-amber-400/10 text-amber-200")}>{label}</Badge>; }
