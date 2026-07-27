import Link from "next/link";
import { Copy, ExternalLink, Plus } from "lucide-react";
import { PageHeader, PaymentRuleBanner } from "@/components/brand";
import { SellerSaleForm } from "@/components/portal/seller-sale-form";
import { EmptyState, Button, Card, Table } from "@/components/ui";
import { StatsCard, StatusBadge } from "@/components/dashboard";
import { requireRole } from "@/lib/auth/require-auth";
import {
  loadPartnerCommissions,
  loadPartnerDashboardSummary,
  loadPartnerLeads,
  loadPartnerPayouts,
  loadPartnerSales,
} from "@/lib/partners/loaders";

const titles: Record<string, [string, string]> = {
  profile: ["Mijn profiel", "Houd uw bedrijfs- en contactgegevens actueel."],
  verification: [
    "Identiteitsverificatie",
    "Voltooi de verificatie voordat u actief verkoopt.",
  ],
  agreement: [
    "Partnerovereenkomst",
    "Bekijk en accepteer uw partnervoorwaarden.",
  ],
  products: ["Producten", "Beschikbare VDB-producten voor uw verkoopkanaal."],
  leads: ["Leads", "Leads die aan uw partnerprofiel zijn gekoppeld."],
  sales: ["Verkopen", "Alle door u geregistreerde verkopen."],
  commissions: [
    "Commissies",
    "Commissies worden alleen vrijgegeven na betaling en levering.",
  ],
  payouts: ["Uitbetalingen", "Uitbetalingen naar uw geverifieerde rekening."],
  marketing: [
    "Marketingmateriaal",
    "Gebruik uitsluitend goedgekeurde VDB-materialen.",
  ],
  referrals: [
    "Verwijzingen",
    "Partners die via uw introductie zijn aangemeld.",
  ],
  notifications: [
    "Meldingen",
    "Belangrijke updates over uw account en verkopen.",
  ],
  support: ["Support", "Neem contact op met VDB Partner Support."],
  settings: ["Instellingen", "Beheer uw portal- en notificatievoorkeuren."],
};

function euro(cents: number | null | undefined, currency = "EUR") {
  if (cents == null) return "€ 0,00";
  return new Intl.NumberFormat("nl-NL", { style: "currency", currency }).format(
    cents / 100,
  );
}

export default async function SellerPage({
  params,
}: {
  params: Promise<{ section?: string[] }>;
}) {
  const profile = await requireRole("partner");
  const { section = [] } = await params;
  const slug = section[0];
  const isDetail = section.length > 1;
  const summary = await loadPartnerDashboardSummary(profile.id, profile.email);

  if (!slug) {
    return (
      <>
        <PageHeader
          eyebrow="Partner Portal"
          title={`Goedendag${summary.displayName || summary.email ? "," : ""}`}
          description={
            summary.email
              ? `Ingelogd als ${summary.email}${summary.status ? ` · status ${summary.status}` : ""}`
              : "Partnerdashboard"
          }
          actions={
            <StatusBadge
              status={summary.status === "ACTIVE" ? "approved" : "in_review"}
            />
          }
        />
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <StatsCard
            label="Leads"
            value={String(summary.leads)}
            detail="Gekoppeld"
          />
          <StatsCard
            label="Verkopen"
            value={String(summary.sales)}
            detail="Geregistreerd"
          />
          <StatsCard
            label="Commissies"
            value={String(summary.commissions)}
            detail="Records"
          />
          <StatsCard
            label="Beschikbaar"
            value={euro(summary.availableCents)}
            detail="Na vrijgave"
          />
        </div>
        <div className="mt-7 grid gap-6 lg:grid-cols-2">
          <Card className="p-6">
            <p className="text-gold text-xs tracking-[.16em] uppercase">
              Uw partnercode
            </p>
            <p className="display mt-2 text-3xl">{summary.code ?? "—"}</p>
            <p className="text-muted mt-2 text-sm">
              {summary.code
                ? "Actieve partnercode uit Owner RC2."
                : "Uw code wordt zichtbaar na goedkeuring."}
            </p>
          </Card>
          <Card className="p-6">
            <p className="text-gold text-xs tracking-[.16em] uppercase">
              Uw partnerlink
            </p>
            <div className="mt-4 flex gap-2">
              <code className="text-muted flex-1 truncate rounded-sm border bg-black/20 p-2 text-xs">
                {summary.code
                  ? `https://vdb.digital/r/${summary.code}`
                  : "Beschikbaar na goedkeuring"}
              </code>
              <Button variant="outline" size="sm" disabled={!summary.code}>
                <Copy className="h-4 w-4" />
              </Button>
            </div>
          </Card>
        </div>
        <PaymentRuleBanner className="mt-7" />
      </>
    );
  }

  const [title, description] = titles[slug] ?? [
    "Details",
    "Bekijk de gegevens van dit onderdeel.",
  ];
  const newSale = slug === "sales" && !isDetail;
  if (slug === "sales" && section[1] === "new") {
    return (
      <>
        <PageHeader
          title="Nieuwe verkoop"
          description="Registreer een verkoop. Betaling en commissie worden uitsluitend door VDB bevestigd."
        />
        <Card className="max-w-2xl p-6">
          <SellerSaleForm />
        </Card>
        <PaymentRuleBanner className="mt-6" />
      </>
    );
  }

  if (!summary.partnerId) {
    return (
      <>
        <PageHeader title={title} description={description} />
        <EmptyState
          title="Geen partnerprofiel"
          description="Er is geen actief partnerprofiel gekoppeld aan dit account."
        />
      </>
    );
  }

  if (slug === "leads") {
    const leads = await loadPartnerLeads(summary.partnerId);
    return (
      <>
        <PageHeader title={title} description={description} />
        {leads.length ? (
          <Card className="p-6">
            <Table>
              <thead>
                <tr className="text-muted border-b text-xs">
                  <th className="pb-3">Contact</th>
                  <th className="pb-3">Bedrijf</th>
                  <th className="pb-3">Status</th>
                </tr>
              </thead>
              <tbody>
                {leads.map((lead) => (
                  <tr
                    key={lead.id}
                    className="border-border/50 border-b"
                    data-testid={`lead-row-${lead.id}`}
                  >
                    <td className="py-4">
                      {lead.contact_name}
                      <div className="text-muted text-xs">
                        {lead.contact_email}
                      </div>
                    </td>
                    <td className="py-4">{lead.company_name ?? "—"}</td>
                    <td className="py-4">
                      <StatusBadge status={String(lead.status).toLowerCase()} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </Table>
          </Card>
        ) : (
          <EmptyState
            title="Nog geen leads"
            description="Nieuwe leads verschijnen hier zodra ze aan uw profiel zijn gekoppeld."
          />
        )}
      </>
    );
  }

  if (slug === "commissions") {
    const commissions = await loadPartnerCommissions(summary.partnerId);
    return (
      <>
        <PageHeader title={title} description={description} />
        <PaymentRuleBanner className="mb-6" />
        {commissions.length ? (
          <Card className="p-6">
            <Table>
              <thead>
                <tr className="text-muted border-b text-xs">
                  <th className="pb-3">Commissie</th>
                  <th className="pb-3">Status</th>
                  <th className="pb-3">Bedrag</th>
                </tr>
              </thead>
              <tbody>
                {commissions.map((commission) => (
                  <tr
                    key={commission.id}
                    className="border-border/50 border-b"
                    data-testid={`commission-row-${commission.id}`}
                  >
                    <td className="py-4 font-mono text-xs">
                      {commission.id.slice(0, 8)}
                    </td>
                    <td
                      className="py-4"
                      data-testid={`commission-status-${commission.id}`}
                    >
                      <StatusBadge
                        status={String(commission.status).toLowerCase()}
                      />
                    </td>
                    <td className="py-4">
                      {euro(commission.amount_cents, commission.currency)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </Table>
          </Card>
        ) : (
          <EmptyState
            title="Nog geen commissies"
            description="Commissies worden zichtbaar na geverifieerde betaling en levering."
          />
        )}
      </>
    );
  }

  if (slug === "sales") {
    const sales = await loadPartnerSales(summary.partnerId);
    return (
      <>
        <PageHeader
          title={title}
          description={description}
          actions={
            newSale ? (
              <Link href="/dashboard/sales/new">
                <Button>
                  <Plus className="mr-2 h-4 w-4" />
                  Nieuwe verkoop
                </Button>
              </Link>
            ) : undefined
          }
        />
        {sales.length ? (
          <Card className="p-6">
            <Table>
              <thead>
                <tr className="text-muted border-b text-xs">
                  <th className="pb-3">Verkoop</th>
                  <th className="pb-3">Status</th>
                  <th className="pb-3">Bedrag</th>
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
                      {euro(sale.gross_amount_cents, sale.currency)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </Table>
          </Card>
        ) : (
          <EmptyState
            title="Nog geen verkopen"
            description="Statussen worden nooit als betaald weergegeven zonder verificatie."
          />
        )}
      </>
    );
  }

  if (slug === "payouts") {
    const payouts = await loadPartnerPayouts(summary.partnerId);
    return (
      <>
        <PageHeader title={title} description={description} />
        <PaymentRuleBanner className="mb-6" />
        {payouts.length ? (
          <Card className="p-6">
            <Table>
              <thead>
                <tr className="text-muted border-b text-xs">
                  <th className="pb-3">Uitbetaling</th>
                  <th className="pb-3">Status</th>
                  <th className="pb-3">Bedrag</th>
                </tr>
              </thead>
              <tbody>
                {payouts.map((payout) => (
                  <tr key={payout.id} className="border-border/50 border-b">
                    <td className="py-4 font-mono text-xs">
                      {payout.id.slice(0, 8)}
                    </td>
                    <td className="py-4">
                      <StatusBadge
                        status={String(payout.status).toLowerCase()}
                      />
                    </td>
                    <td className="py-4">
                      {euro(payout.amount_cents, payout.currency)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </Table>
          </Card>
        ) : (
          <EmptyState
            title="Nog geen uitbetalingen"
            description="Uitbetalingen verschijnen hier na goedkeuring door VDB."
          />
        )}
      </>
    );
  }

  if (slug === "profile") {
    return (
      <>
        <PageHeader title={title} description={description} />
        <Card className="max-w-xl p-6">
          <dl className="space-y-3 text-sm">
            <div>
              <dt className="text-muted">Status</dt>
              <dd>{summary.status ?? "—"}</dd>
            </div>
            <div>
              <dt className="text-muted">Weergavenaam</dt>
              <dd>{summary.displayName ?? "—"}</dd>
            </div>
            <div>
              <dt className="text-muted">E-mail</dt>
              <dd>{summary.email ?? "—"}</dd>
            </div>
          </dl>
        </Card>
      </>
    );
  }

  return (
    <>
      <PageHeader
        title={title}
        description={description}
        actions={
          newSale ? (
            <Link href="/dashboard/sales/new">
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                Nieuwe verkoop
              </Button>
            </Link>
          ) : undefined
        }
      />
      <EmptyState
        title={
          isDetail ? "Record niet gevonden" : `Nog geen ${title.toLowerCase()}`
        }
        description="Statussen worden nooit als betaald weergegeven zonder verificatie."
        action={
          slug === "support" ? (
            <Button variant="outline">Supportverzoek starten</Button>
          ) : undefined
        }
      />
      {slug === "products" && (
        <Card className="mt-6 p-5">
          <Table>
            <thead>
              <tr className="text-muted border-b text-xs">
                <th className="pb-3">Product</th>
                <th className="pb-3">Status</th>
                <th className="pb-3">Actie</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td className="py-4">
                  Productcatalogus volgt via Owner-catalogus (buiten RC2
                  partnerpin).
                </td>
                <td>
                  <StatusBadge status="pending" />
                </td>
                <td>
                  <ExternalLink className="text-gold h-4 w-4" />
                </td>
              </tr>
            </tbody>
          </Table>
        </Card>
      )}
    </>
  );
}
