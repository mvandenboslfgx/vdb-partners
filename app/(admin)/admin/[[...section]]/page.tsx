import { PageHeader } from "@/components/brand";
import { Card, EmptyState, Table } from "@/components/ui";
import { StatsCard, StatusBadge } from "@/components/dashboard";
import { requireRole } from "@/lib/auth/require-auth";
import { createAdminClient } from "@/lib/supabase/admin";

const names: Record<string, [string, string]> = {
  sellers: ["Partners", "Beheer partnerprofielen en goedkeuringen."],
  applications: ["Aanmeldingen", "Nieuwe partneraanmeldingen ter beoordeling."],
  verifications: ["Verificaties", "Identiteitscontroles en uitzonderingen."],
  agreements: ["Overeenkomsten", "Status van partnerovereenkomsten."],
  products: ["Producten", "Productcatalogus en commissietarieven."],
  orders: ["Orders", "Orders en leveringsstatussen."],
  payments: ["Betalingen", "Betalingen alleen bevestigd via VDB of Mollie."],
  commissions: [
    "Commissies",
    "Vrijgave na geverifieerde betaling en levering.",
  ],
  "commission-rules": ["Commissieregels", "Regels per product en partner."],
  payouts: ["Uitbetalingen", "Uitbetalingen en batches."],
  refunds: ["Refunds", "Refunds met impact op commissies."],
  disputes: ["Geschillen", "Openstaande partner- of klantgeschillen."],
  reports: ["Rapporten", "Financiële en operationele rapporten."],
  audit: ["Auditlog", "Onwijzigbare gebeurtenissen en beheerdersacties."],
  settings: ["Instellingen", "Portalconfiguratie."],
  team: ["Team", "Beheerders en rollen."],
};
async function metrics() {
  try {
    const db = createAdminClient();
    const [sales, partners, payouts] = await Promise.all([
      db.from("partner_sales").select("*", { count: "exact", head: true }),
      db.from("partner_profiles").select("*", { count: "exact", head: true }),
      db.from("partner_payouts").select("*", { count: "exact", head: true }),
    ]);
    return {
      orders: sales.count ?? 0,
      sellers: partners.count ?? 0,
      payouts: payouts.count ?? 0,
    };
  } catch {
    return null;
  }
}

export default async function AdminPage({
  params,
}: {
  params: Promise<{ section?: string[] }>;
}) {
  await requireRole("owner", "admin", "staff");
  const { section = [] } = await params;
  const slug = section[0];
  const db = createAdminClient();
  const [stats, pendingResult] = await Promise.all([
    metrics(),
    db
      .from("partner_profiles")
      .select("id, display_name, legal_name, created_at")
      .eq("status", "PENDING")
      .order("created_at", { ascending: true }),
  ]);
  if (pendingResult.error) throw pendingResult.error;
  const pendingPartners = pendingResult.data ?? [];
  const applications = (
    <Card className="mt-7 p-6">
      <p className="text-gold text-xs tracking-[.16em] uppercase">
        Wacht op beoordeling
      </p>
      {pendingPartners.length ? (
        <Table className="mt-4">
          <thead>
            <tr className="text-muted border-b text-xs">
              <th className="pb-3">Partner</th>
              <th className="pb-3">Aangemeld</th>
              <th className="pb-3">Actie</th>
            </tr>
          </thead>
          <tbody>
            {pendingPartners.map((partner) => (
              <tr key={partner.id} className="border-border/50 border-b">
                <td className="py-4">
                  {partner.display_name ??
                    partner.legal_name ??
                    partner.id.slice(0, 8)}
                </td>
                <td className="text-muted py-4">
                  {new Date(partner.created_at).toLocaleDateString("nl-NL")}
                </td>
                <td className="text-muted py-4 text-sm">
                  Beoordeling via Owner review_partner_application
                </td>
              </tr>
            ))}
          </tbody>
        </Table>
      ) : (
        <p className="text-muted mt-3 text-sm">
          Geen partneraanmeldingen wachten op beoordeling.
        </p>
      )}
    </Card>
  );
  if (!slug) {
    return (
      <>
        <PageHeader
          eyebrow="Beheer"
          title="Command center"
          description="Actuele gegevens uit Owner RC2 partneroppervlakken."
        />
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <StatsCard
            label="Verkopen"
            value={String(stats?.orders ?? 0)}
            detail="partner_sales"
          />
          <StatsCard
            label="Partners"
            value={String(stats?.sellers ?? 0)}
            detail="partner_profiles"
          />
          <StatsCard
            label="Uitbetalingen"
            value={String(stats?.payouts ?? 0)}
            detail="partner_payouts"
          />
          <StatsCard label="Omzet" value="€ —" detail="Ledger via RPC" />
        </div>
        {applications}
      </>
    );
  }
  const [title, description] = names[slug] ?? [
    "Details",
    "Beheer de gegevens van dit onderdeel.",
  ];
  if (slug === "applications")
    return (
      <>
        <PageHeader eyebrow="Beheer" title={title} description={description} />
        {applications}
      </>
    );
  if (slug === "orders") {
    const { data: sales, error } = await db
      .from("partner_sales")
      .select("id, status, gross_amount_cents, currency, created_at")
      .order("created_at", { ascending: false })
      .limit(30);
    if (error) throw error;
    return (
      <>
        <PageHeader eyebrow="Beheer" title={title} description={description} />
        {sales?.length ? (
          <Card className="p-6">
            <Table>
              <thead>
                <tr className="text-muted border-b text-xs">
                  <th className="pb-3">Sale</th>
                  <th className="pb-3">Status</th>
                  <th className="pb-3">Totaal</th>
                </tr>
              </thead>
              <tbody>
                {sales.map((sale) => (
                  <tr key={sale.id} className="border-border/50 border-b">
                    <td className="py-4 font-mono text-xs">
                      {sale.id.slice(0, 8)}
                    </td>
                    <td className="py-4">
                      <StatusBadge status={String(sale.status).toLowerCase()} />
                    </td>
                    <td className="py-4">
                      {new Intl.NumberFormat("nl-NL", {
                        style: "currency",
                        currency: sale.currency,
                      }).format(sale.gross_amount_cents / 100)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </Table>
          </Card>
        ) : (
          <EmptyState
            title="Geen verkopen"
            description="Zodra partners verkopen registreren, verschijnen ze hier."
          />
        )}
      </>
    );
  }
  return (
    <>
      <PageHeader
        eyebrow={section.length > 1 ? "Detail" : "Beheer"}
        title={title}
        description={description}
      />
      {slug === "payments" && (
        <Card className="mb-6 p-5 text-sm text-[#e5d3b0]">
          Checkout/Mollie blijven fail-closed in RC2. Betaalstatussen worden
          niet via deze portal bevestigd.
        </Card>
      )}
      <EmptyState
        title={
          section.length > 1
            ? "Record niet gevonden"
            : `Geen ${title.toLowerCase()}`
        }
        description="Er zijn nog geen records beschikbaar."
      />
    </>
  );
}
