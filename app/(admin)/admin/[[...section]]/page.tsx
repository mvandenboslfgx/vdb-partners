import Link from "next/link";
import { PageHeader } from "@/components/brand";
import { ApproveSellerButton, CompleteOrderFlowButton } from "@/components/portal/admin-order-actions";
import { Card, EmptyState, Table } from "@/components/ui";
import { StatsCard, StatusBadge } from "@/components/dashboard";
import { requireRole } from "@/lib/auth/require-auth";
import { createAdminClient } from "@/lib/supabase/admin";

const names: Record<string, [string, string]> = { sellers: ["Partners", "Beheer partnerprofielen en goedkeuringen."], applications: ["Aanmeldingen", "Nieuwe partneraanmeldingen ter beoordeling."], verifications: ["Verificaties", "Identiteitscontroles en uitzonderingen."], agreements: ["Overeenkomsten", "Status van partnerovereenkomsten."], products: ["Producten", "Productcatalogus en commissietarieven."], orders: ["Orders", "Orders en leveringsstatussen."], payments: ["Betalingen", "Betalingen alleen bevestigd via VDB of Mollie."], commissions: ["Commissies", "Vrijgave na geverifieerde betaling en levering."], "commission-rules": ["Commissieregels", "Regels per product en partner."], payouts: ["Uitbetalingen", "Uitbetalingen en batches."], refunds: ["Refunds", "Refunds met impact op commissies."], disputes: ["Geschillen", "Openstaande partner- of klantgeschillen."], reports: ["Rapporten", "Financiële en operationele rapporten."], audit: ["Auditlog", "Onwijzigbare gebeurtenissen en beheerdersacties."], settings: ["Instellingen", "Portalconfiguratie."], team: ["Team", "Beheerders en rollen."] };
async function metrics() { try { const db = createAdminClient(); const [orders, sellers, payouts] = await Promise.all([db.from("orders").select("*", { count: "exact", head: true }), db.from("seller_profiles").select("*", { count: "exact", head: true }), db.from("payouts").select("*", { count: "exact", head: true })]); return { orders: orders.count ?? 0, sellers: sellers.count ?? 0, payouts: payouts.count ?? 0 }; } catch { return null; } }
export default async function AdminPage({ params }: { params: Promise<{ section?: string[] }> }) {
  await requireRole("owner", "finance_admin", "sales_admin", "support_admin");
  const { section = [] } = await params; const slug = section[0]; const db = createAdminClient();
  const [stats, pendingResult] = await Promise.all([metrics(), db.from("seller_profiles").select("id, public_name, created_at").eq("status", "pending_review").order("created_at", { ascending: true })]);
  if (pendingResult.error) throw pendingResult.error;
  const pendingSellers = pendingResult.data ?? [];
  const applications = <Card className="mt-7 p-6"><p className="text-xs uppercase tracking-[.16em] text-gold">Wacht op beoordeling</p>{pendingSellers.length ? <Table className="mt-4"><thead><tr className="border-b text-xs text-muted"><th className="pb-3">Partner</th><th className="pb-3">Aangemeld</th><th className="pb-3">Actie</th></tr></thead><tbody>{pendingSellers.map((seller) => <tr key={seller.id} className="border-b border-border/50"><td className="py-4">{seller.public_name}</td><td className="py-4 text-muted">{new Date(seller.created_at).toLocaleDateString("nl-NL")}</td><td className="py-4"><ApproveSellerButton sellerId={seller.id} /></td></tr>)}</tbody></Table> : <p className="mt-3 text-sm text-muted">Geen partneraanmeldingen wachten op beoordeling.</p>}</Card>;
  if (!slug) return <><PageHeader eyebrow="Beheer" title="Command center" description="Actuele gegevens uit de beheerdatabase." /><div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4"><StatsCard label="Orders" value={String(stats?.orders ?? 0)} detail="Totaal geregistreerd" /><StatsCard label="Partners" value={String(stats?.sellers ?? 0)} detail="Totaal" /><StatsCard label="Uitbetalingen" value={String(stats?.payouts ?? 0)} detail="Geregistreerd" /><StatsCard label="Omzet" value="€ —" detail="Beschikbaar na koppeling" /></div>{applications}</>;
  const [title, description] = names[slug] ?? ["Details", "Beheer de gegevens van dit onderdeel."];
  if (slug === "applications") return <><PageHeader eyebrow="Beheer" title={title} description={description} />{applications}</>;
  if (slug === "orders") {
    const orderId = section[1];
    if (orderId) {
      const { data: order, error } = await db.from("orders").select("id, order_number, status, total_cents, created_at").eq("id", orderId).maybeSingle();
      if (error) throw error;
      if (!order) return <><PageHeader eyebrow="Detail" title="Order niet gevonden" description="Deze order bestaat niet of is verwijderd." /><EmptyState /></>;
      return <><PageHeader eyebrow="Order" title={order.order_number} description={`Status: ${order.status}. Totaal: € ${(order.total_cents / 100).toFixed(2)}.`} /><Card className="p-6" data-testid="admin-order-detail"><p className="text-sm text-[#e5d3b0]">Lokale snelle afronding simuleert een handmatige bankbetaling en levering. Dit gebruikt geen Mollie.</p>{order.status === "submitted" ? <div className="mt-5"><CompleteOrderFlowButton orderId={order.id} /></div> : <div data-testid="admin-order-status"><StatusBadge status={order.status} /></div>}</Card></>;
    }
    const { data: orders, error } = await db.from("orders").select("id, order_number, status, total_cents, created_at").order("created_at", { ascending: false }).limit(30);
    if (error) throw error;
    return <><PageHeader eyebrow="Beheer" title={title} description={description} />{orders?.length ? <Card className="p-6"><Table><thead><tr className="border-b text-xs text-muted"><th className="pb-3">Order</th><th className="pb-3">Status</th><th className="pb-3">Totaal</th><th className="pb-3"></th></tr></thead><tbody>{orders.map((order) => <tr key={order.id} className="border-b border-border/50"><td className="py-4">{order.order_number}</td><td className="py-4"><StatusBadge status={order.status} /></td><td className="py-4">€ {(order.total_cents / 100).toFixed(2)}</td><td className="py-4"><Link className="text-gold" href={`/admin/orders/${order.id}`}>Openen</Link></td></tr>)}</tbody></Table></Card> : <EmptyState title="Geen orders" description="Zodra partners verkopen registreren, verschijnen ze hier." />}</>;
  }
  return <><PageHeader eyebrow={section.length > 1 ? "Detail" : "Beheer"} title={title} description={description} />{slug === "payments" && <Card className="mb-6 p-5 text-sm text-[#e5d3b0]">Betaalstatussen mogen uitsluitend door Mollie-webhooks of bevoegde VDB-beheerders worden bevestigd.</Card>}<EmptyState title={section.length > 1 ? "Record niet gevonden" : `Geen ${title.toLowerCase()}`} description="Er zijn nog geen records beschikbaar." /></>;
}
