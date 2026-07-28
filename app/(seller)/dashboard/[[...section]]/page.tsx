import Link from "next/link";
import { Copy, Plus } from "lucide-react";
import { PageHeader, PaymentRuleBanner } from "@/components/brand";
import { EmptyState, Button, Card, Table } from "@/components/ui";
import { StatsCard, StatusBadge } from "@/components/dashboard";
import { requireRole } from "@/lib/auth/require-auth";
import {
  loadPartnerCommissions,
  loadPartnerCatalog,
  loadPartnerDashboardSummary,
  loadPartnerLeads,
  loadPartnerPayouts,
  loadPartnerSales,
} from "@/lib/partners/loaders";
import { PartnerProductLeadForm } from "@/components/portal/partner-product-lead-form";
import {
  loadConversationMessages,
  loadConversationReadState,
  loadMessageAttachments,
  loadPartnerAppointments,
  loadPartnerConversations,
  loadPartnerSupportTickets,
  loadPublicSupportReplies,
} from "@/lib/partners/rc3-loaders";
import { loadFailClosedFlags } from "@/lib/contract/flags";

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
  support: [
    "Support",
    "Supporttickets en publieke antwoorden (Owner portal_support_*).",
  ],
  conversations: [
    "Gesprekken",
    "Deelnemer-gebonden gesprekken via portal_conversations.",
  ],
  appointments: [
    "Afspraken",
    "Afspraken via portal_appointments. Boeken is fail-closed tot de flag aan staat.",
  ],
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
          description="Live checkout/Mollie blijft fail-closed. Gebruik Producten → lead/offerteaanvraag. De klant betaalt altijd aan VDB Digital."
        />
        <Card className="max-w-2xl space-y-4 p-6 text-sm">
          <p>
            Partners registreren geen eigen checkout of factuur voor
            VDB-producten. Start via{" "}
            <Link className="text-gold" href="/dashboard/products">
              Producten
            </Link>{" "}
            (Owner-catalogus).
          </p>
          <PaymentRuleBanner />
        </Card>
      </>
    );
  }

  if (slug === "products") {
    let catalog: Awaited<ReturnType<typeof loadPartnerCatalog>> = [];
    let catalogError: string | null = null;
    try {
      catalog = await loadPartnerCatalog();
    } catch (caught) {
      catalogError =
        caught instanceof Error
          ? caught.message
          : "Catalogus niet beschikbaar.";
    }

    const productId = section[1];
    const selected = productId
      ? catalog.find((item) => item.product_id === productId)
      : undefined;

    if (productId && selected) {
      const commissionLabel =
        selected.partner_commission_status === "active" &&
        selected.partner_commission_type === "bps" &&
        selected.partner_commission_value != null
          ? `${(Number(selected.partner_commission_value) / 100).toFixed(1)}%`
          : selected.partner_commission_status === "active" &&
              selected.partner_commission_type === "fixed_cents" &&
              selected.partner_commission_value != null
            ? euro(
                Number(selected.partner_commission_value),
                selected.partner_commission_currency ?? "EUR",
              )
            : "Commissie wordt per aanvraag/offerte vastgesteld";

      return (
        <>
          <PageHeader
            title={selected.name}
            description={
              selected.partner_sales_copy ||
              selected.short_description ||
              "Partnerproduct uit centrale Owner-catalogus."
            }
          />
          <div className="grid gap-6 lg:grid-cols-2">
            <Card className="space-y-3 p-6 text-sm">
              {selected.primary_image_path ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={`https://vdbdigital.nl${selected.primary_image_path}`}
                  alt=""
                  className="mb-4 h-40 w-full rounded-lg object-cover"
                />
              ) : null}
              <dl className="grid gap-2">
                <div>
                  <dt className="text-muted">Categorie</dt>
                  <dd>{selected.category_name ?? "—"}</dd>
                </div>
                <div>
                  <dt className="text-muted">Klantprijs</dt>
                  <dd>
                    {selected.price_label ||
                      (selected.price_cents != null
                        ? euro(selected.price_cents, selected.currency ?? "EUR")
                        : selected.from_price_cents != null
                          ? `Vanaf ${euro(selected.from_price_cents, selected.currency ?? "EUR")}`
                          : "Op aanvraag")}
                  </dd>
                </div>
                <div>
                  <dt className="text-muted">Audience</dt>
                  <dd>
                    {[
                      selected.audience_b2b ? "B2B" : null,
                      selected.audience_b2c ? "B2C" : null,
                    ]
                      .filter(Boolean)
                      .join(" · ") || "—"}
                  </dd>
                </div>
                <div>
                  <dt className="text-muted">Partnercommissie</dt>
                  <dd>{commissionLabel}</dd>
                </div>
                <div>
                  <dt className="text-muted">Voorwaarden</dt>
                  <dd className="whitespace-pre-wrap">
                    {selected.partner_terms ||
                      "Zie centrale productvoorwaarden."}
                  </dd>
                </div>
              </dl>
            </Card>
            <Card className="p-6">
              <PartnerProductLeadForm
                productId={selected.product_id}
                productName={selected.name}
                ctaMode={selected.cta_mode ?? "lead"}
              />
            </Card>
          </div>
        </>
      );
    }

    return (
      <>
        <PageHeader
          title={titles.products[0]}
          description={titles.products[1]}
        />
        <Card className="mb-6 p-5 text-sm text-[#e5d3b0]">
          Bron: Owner `list_partner_catalog` (geen lokale producttabel).
          Checkout en Mollie blijven fail-closed.
        </Card>
        {catalogError ? (
          <EmptyState
            title="Catalogus niet beschikbaar"
            description={
              catalogError.includes("FORBIDDEN") ||
              catalogError.includes("AUTH")
                ? "Alleen actieve Partners zien producten. Pending/geschorste accounts krijgen geen verkoopmogelijkheden."
                : catalogError
            }
          />
        ) : catalog.length ? (
          <Card className="p-6">
            <Table>
              <thead>
                <tr className="text-muted border-b text-xs">
                  <th className="pb-3">Product</th>
                  <th className="pb-3">Categorie</th>
                  <th className="pb-3">Prijs</th>
                  <th className="pb-3">Commissie</th>
                  <th className="pb-3">CTA</th>
                </tr>
              </thead>
              <tbody>
                {catalog.map((item) => (
                  <tr
                    key={item.product_id}
                    className="border-border/50 border-b"
                    data-testid={`partner-product-${item.slug}`}
                  >
                    <td className="py-4">
                      <div className="font-medium">{item.name}</div>
                      <div className="text-muted max-w-md text-xs">
                        {(
                          item.partner_sales_copy ||
                          item.short_description ||
                          ""
                        ).slice(0, 120)}
                      </div>
                    </td>
                    <td className="py-4 text-sm">
                      {item.category_name ?? "—"}
                    </td>
                    <td className="py-4 text-sm">
                      {item.price_label ||
                        (item.price_cents != null
                          ? euro(item.price_cents, item.currency ?? "EUR")
                          : "Op aanvraag")}
                    </td>
                    <td className="py-4 text-sm">
                      {item.partner_commission_status === "active" &&
                      item.partner_commission_type === "bps" &&
                      item.partner_commission_value != null
                        ? `${(Number(item.partner_commission_value) / 100).toFixed(1)}%`
                        : item.partner_commission_status === "active" &&
                            item.partner_commission_type === "fixed_cents" &&
                            item.partner_commission_value != null
                          ? euro(
                              Number(item.partner_commission_value),
                              item.partner_commission_currency ?? "EUR",
                            )
                          : "Per offerte"}
                    </td>
                    <td className="py-4">
                      <Link
                        className="text-gold text-sm"
                        href={`/dashboard/products/${item.product_id}`}
                      >
                        {item.cta_mode === "quote"
                          ? "Offerte"
                          : item.cta_mode === "lead_request"
                            ? "Aanvragen"
                            : "Lead"}
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </Table>
          </Card>
        ) : (
          <EmptyState
            title="Geen Partner-producten"
            description="Er zijn geen eligible producten in de centrale catalogus voor dit account."
          />
        )}
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
                  <th className="pb-3">Product</th>
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
                    <td className="py-4 font-mono text-xs">
                      {lead.product_slug ?? "—"}
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
              <Link href="/dashboard/products">
                <Button>
                  <Plus className="mr-2 h-4 w-4" />
                  Lead / offerte
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

  if (slug === "conversations") {
    const conversationId = section[1];
    if (conversationId) {
      const [messages, readState] = await Promise.all([
        loadConversationMessages(conversationId),
        loadConversationReadState(conversationId, profile.id),
      ]);
      const firstMessageId = messages[0]?.id;
      const attachments = firstMessageId
        ? await loadMessageAttachments(firstMessageId)
        : [];
      return (
        <>
          <PageHeader
            title="Gesprek"
            description={`ID ${conversationId.slice(0, 8)}…`}
          />
          <p
            className="text-muted mb-4 text-sm"
            data-testid="conversation-read-state"
          >
            Laatst gelezen: {readState?.last_read_at ?? "—"}
          </p>
          {messages.length ? (
            <Card className="space-y-4 p-6">
              {messages.map((message) => (
                <div
                  key={message.id}
                  className="border-border/50 border-b pb-3 text-sm"
                >
                  <p>{message.body}</p>
                  <p className="text-muted mt-1 text-xs">
                    {new Date(message.created_at).toLocaleString("nl-NL")}
                  </p>
                </div>
              ))}
              {attachments.length > 0 && (
                <p
                  className="text-muted text-xs"
                  data-testid="message-attachments"
                >
                  Bijlagen: {attachments.length}
                </p>
              )}
            </Card>
          ) : (
            <EmptyState
              title="Geen berichten"
              description="Geen publieke berichten zichtbaar voor dit gesprek, of u bent geen deelnemer."
            />
          )}
        </>
      );
    }
    const conversations = await loadPartnerConversations();
    return (
      <>
        <PageHeader title={title} description={description} />
        {conversations.length ? (
          <Card className="p-6">
            <Table>
              <thead>
                <tr className="text-muted border-b text-xs">
                  <th className="pb-3">Onderwerp</th>
                  <th className="pb-3">Status</th>
                  <th className="pb-3"></th>
                </tr>
              </thead>
              <tbody>
                {conversations.map((conversation) => (
                  <tr
                    key={conversation.id}
                    className="border-border/50 border-b"
                  >
                    <td className="py-4">{conversation.subject}</td>
                    <td className="py-4">
                      <StatusBadge
                        status={String(conversation.status).toLowerCase()}
                      />
                    </td>
                    <td className="py-4">
                      <Link
                        className="text-gold"
                        href={`/dashboard/conversations/${conversation.id}`}
                      >
                        Openen
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </Table>
          </Card>
        ) : (
          <EmptyState
            title="Nog geen gesprekken"
            description="Gesprekken verschijnen alleen wanneer u deelnemer bent (Owner portal_conversations)."
          />
        )}
      </>
    );
  }

  if (slug === "support") {
    const ticketId = section[1];
    if (ticketId) {
      const replies = await loadPublicSupportReplies(ticketId);
      return (
        <>
          <PageHeader
            title="Supportticket"
            description={`ID ${ticketId.slice(0, 8)}…`}
          />
          {replies.length ? (
            <Card
              className="space-y-4 p-6"
              data-testid="public-support-replies"
            >
              {replies.map((reply) => (
                <div
                  key={reply.id}
                  className="border-border/50 border-b pb-3 text-sm"
                >
                  <p>{reply.body}</p>
                  <p className="text-muted mt-1 text-xs">
                    {new Date(reply.created_at).toLocaleString("nl-NL")} ·
                    publiek
                  </p>
                </div>
              ))}
            </Card>
          ) : (
            <EmptyState
              title="Geen publieke antwoorden"
              description="Interne supportantwoorden blijven verborgen voor partners."
            />
          )}
        </>
      );
    }
    const tickets = await loadPartnerSupportTickets();
    return (
      <>
        <PageHeader title={title} description={description} />
        {tickets.length ? (
          <Card className="p-6">
            <Table>
              <thead>
                <tr className="text-muted border-b text-xs">
                  <th className="pb-3">Categorie</th>
                  <th className="pb-3">Status</th>
                  <th className="pb-3"></th>
                </tr>
              </thead>
              <tbody>
                {tickets.map((ticket) => (
                  <tr key={ticket.id} className="border-border/50 border-b">
                    <td className="py-4">{ticket.category}</td>
                    <td className="py-4">
                      <StatusBadge
                        status={String(ticket.status).toLowerCase()}
                      />
                    </td>
                    <td className="py-4">
                      <Link
                        className="text-gold"
                        href={`/dashboard/support/${ticket.id}`}
                      >
                        Openen
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </Table>
          </Card>
        ) : (
          <EmptyState
            title="Nog geen supporttickets"
            description="Tickets verschijnen hier wanneer ze aan uw account zijn gekoppeld."
          />
        )}
      </>
    );
  }

  if (slug === "appointments") {
    const flags = await loadFailClosedFlags();
    const appointments = await loadPartnerAppointments();
    return (
      <>
        <PageHeader title={title} description={description} />
        <Card
          className="mb-6 p-5 text-sm text-[#e5d3b0]"
          data-testid="appointments-booking-flag"
        >
          Boeken/herplannen/annuleren via RPC:{" "}
          {flags.appointments_booking
            ? "ingeschakeld"
            : "fail-closed (appointments_booking=false)"}
        </Card>
        {appointments.length ? (
          <Card className="p-6">
            <Table>
              <thead>
                <tr className="text-muted border-b text-xs">
                  <th className="pb-3">Afspraak</th>
                  <th className="pb-3">Status</th>
                  <th className="pb-3">Start</th>
                </tr>
              </thead>
              <tbody>
                {appointments.map((appointment) => (
                  <tr
                    key={appointment.id}
                    className="border-border/50 border-b"
                  >
                    <td className="py-4 font-mono text-xs">
                      {appointment.id.slice(0, 8)}
                    </td>
                    <td className="py-4">
                      <StatusBadge
                        status={String(appointment.status).toLowerCase()}
                      />
                    </td>
                    <td className="text-muted py-4">
                      {appointment.starts_at
                        ? new Date(appointment.starts_at).toLocaleString(
                            "nl-NL",
                          )
                        : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </Table>
          </Card>
        ) : (
          <EmptyState
            title="Nog geen afspraken"
            description="Afspraken verschijnen alleen bij deelname. Nieuwe bookings blijven fail-closed tot Owner de flag zet."
          />
        )}
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
            <Link href="/dashboard/products">
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                Lead / offerte
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
    </>
  );
}
