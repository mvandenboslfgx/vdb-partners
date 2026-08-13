import { createSupportRequest, replySupportRequest } from "@/app/actions/support";
import { Button } from "@/components/ui";

export function PartnerSupportCreateForm() {
  return (
    <form
      action={createSupportRequest}
      className="mt-6 space-y-4"
      data-testid="partner-support-create-form"
    >
      <div>
        <label className="text-muted mb-1 block text-xs" htmlFor="support-subject">
          Onderwerp
        </label>
        <input
          id="support-subject"
          name="subject"
          required
          minLength={3}
          className="border-border bg-background w-full rounded-md border px-3 py-2 text-sm"
          data-testid="input-partner-support-subject"
        />
      </div>
      <div>
        <label className="text-muted mb-1 block text-xs" htmlFor="support-category">
          Categorie
        </label>
        <select
          id="support-category"
          name="category"
          defaultValue="OTHER"
          className="border-border bg-background w-full rounded-md border px-3 py-2 text-sm"
          data-testid="input-partner-support-category"
        >
          <option value="BILLING">Facturatie</option>
          <option value="TECHNICAL">Technisch</option>
          <option value="ACCOUNT">Account</option>
          <option value="OTHER">Overig</option>
        </select>
      </div>
      <div>
        <label className="text-muted mb-1 block text-xs" htmlFor="support-message">
          Bericht
        </label>
        <textarea
          id="support-message"
          name="message"
          required
          minLength={8}
          rows={4}
          className="border-border bg-background w-full rounded-md border px-3 py-2 text-sm"
          data-testid="input-partner-support-message"
        />
      </div>
      <Button type="submit" data-testid="btn-partner-support-submit">
        Supportverzoek starten
      </Button>
    </form>
  );
}

export function PartnerSupportReplyForm({ ticketId }: { ticketId: string }) {
  return (
    <form
      action={replySupportRequest}
      className="mt-6 space-y-3"
      data-testid="partner-support-reply-form"
    >
      <input type="hidden" name="ticketId" value={ticketId} />
      <label className="text-muted mb-1 block text-xs" htmlFor="support-reply-body">
        Publieke reactie
      </label>
      <textarea
        id="support-reply-body"
        name="body"
        required
        minLength={1}
        rows={3}
        className="border-border bg-background w-full rounded-md border px-3 py-2 text-sm"
        data-testid="input-partner-support-reply"
      />
      <Button type="submit" data-testid="btn-partner-support-reply">
        Reactie versturen
      </Button>
    </form>
  );
}
