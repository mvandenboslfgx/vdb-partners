import Link from "next/link";
import { Logo } from "@/components/brand";
import { Button, Card } from "@/components/ui";

const copy: Record<string, { title: string; body: string }> = {
  klant: {
    title: "Geen partnertoegang",
    body: "Dit is een klantaccount. Het Partner Portal is alleen beschikbaar voor goedgekeurde partners en VDB-staff.",
  },
  geschorst: {
    title: "Account geschorst",
    body: "Uw partnerprofiel is geschorst of ingetrokken. Neem contact op met VDB Partner Support.",
  },
  onvolledig: {
    title: "Account niet compleet",
    body: "Er is geen routbare partner- of staffrol gevonden voor dit account. Registratie of goedkeuring is nog niet afgerond.",
  },
  default: {
    title: "Geen toegang",
    body: "U heeft geen toegang tot dit onderdeel van het Partner Portal.",
  },
};

export default async function GeenToegangPage({
  searchParams,
}: {
  searchParams: Promise<{ reden?: string }>;
}) {
  const { reden } = await searchParams;
  const content = copy[reden ?? ""] ?? copy.default;
  return (
    <main className="flex min-h-screen items-center justify-center px-5 py-12">
      <div className="w-full max-w-md">
        <Logo className="mb-10" />
        <Card className="p-7 sm:p-9">
          <p className="text-gold text-xs tracking-[.18em] uppercase">
            Partner Portal
          </p>
          <h1
            className="display mt-4 text-4xl"
            data-testid="geen-toegang-title"
          >
            {content.title}
          </h1>
          <p className="text-muted mt-3 text-sm leading-6">{content.body}</p>
          <div className="mt-7 flex gap-3">
            <Link href="/login">
              <Button>Inloggen</Button>
            </Link>
            <Link href="/">
              <Button variant="outline">Home</Button>
            </Link>
          </div>
        </Card>
      </div>
    </main>
  );
}
