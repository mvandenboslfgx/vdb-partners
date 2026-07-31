import Link from "next/link";
import { ArrowRight, CheckCircle2 } from "lucide-react";
import { Logo, PaymentRuleBanner } from "@/components/brand";
import { Button, Card } from "@/components/ui";
import { isFeatureEnabled } from "@/lib/feature-flags";

export default async function Home() {
  const registrationEnabled = await isFeatureEnabled(
    "seller_registration_enabled",
  );

  return (
    <main className="min-h-screen">
      <nav className="mx-auto flex max-w-7xl items-center justify-between px-6 py-6">
        <Logo />
        <div className="flex items-center gap-3">
          <Link
            href="/login"
            className="text-sm text-[#d4cec3] hover:text-gold"
          >
            Inloggen
          </Link>
          {registrationEnabled ? (
            <Link href="/register">
              <Button size="sm">Partner worden</Button>
            </Link>
          ) : null}
        </div>
      </nav>
      <section className="mx-auto grid max-w-7xl gap-12 px-6 py-20 lg:grid-cols-[1.15fr_.85fr] lg:py-32">
        <div>
          <p className="mb-5 text-xs font-semibold uppercase tracking-[0.24em] text-gold">
            Partner Portal
          </p>
          <h1 className="display max-w-4xl text-6xl leading-[.92] md:text-8xl">
            Verkoop software met een partner die uw reputatie beschermt.
          </h1>
          <p className="mt-7 max-w-xl text-lg leading-8 text-[#aaa59b]">
            Beheer leads, orders, commissies en uitbetalingen vanuit één heldere
            omgeving.
          </p>
          <div className="mt-9 flex flex-wrap gap-3">
            {registrationEnabled ? (
              <Link href="/register">
                <Button size="lg">
                  Start uw aanmelding{" "}
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </Link>
            ) : null}
            <Link href="/login">
              <Button size="lg" variant={registrationEnabled ? "outline" : "default"}>
                Inloggen
              </Button>
            </Link>
          </div>
          <PaymentRuleBanner className="mt-10 max-w-xl" />
        </div>
        <Card className="relative overflow-hidden p-8">
          <div className="absolute inset-x-0 top-0 gold-rule" />
          <p className="text-xs uppercase tracking-[.18em] text-gold">
            Voor partners
          </p>
          <h2 className="display mt-5 text-4xl">Helder in elke fase.</h2>
          <div className="mt-8 space-y-5">
            {[
              "Uw unieke partnercode en verkooplink",
              "Commissies na geverifieerde betaling",
              "Inzichtelijke statussen en uitbetalingen",
            ].map((item) => (
              <div key={item} className="flex gap-3 text-sm text-[#d5d0c7]">
                <CheckCircle2 className="h-5 w-5 shrink-0 text-gold" />
                {item}
              </div>
            ))}
          </div>
        </Card>
      </section>
    </main>
  );
}
