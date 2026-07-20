import Link from "next/link";
import { ShieldCheck } from "lucide-react";
import { cn } from "@/lib/utils";

export function Logo({ compact = false, className }: { compact?: boolean; className?: string }) {
  // Place the production logo at public/brand/vdb-logo.svg when it becomes available.
  return <Link href="/" className={cn("inline-flex items-center gap-3", className)}><span className="flex h-9 w-9 items-center justify-center border border-gold text-sm text-gold">V</span><span className="leading-none"><strong className="block text-sm tracking-[0.18em]">VDB DIGITAL</strong>{!compact && <small className="mt-1 block text-[10px] tracking-[0.22em] text-gold">SOFTWARE</small>}</span></Link>;
}

export function PaymentRuleBanner({ className }: { className?: string }) {
  return <div className={cn("flex items-start gap-3 border border-gold/35 bg-gold/10 px-4 py-3 text-sm text-[#e5d3b0]", className)}><ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-gold" /><p><strong>Betaalregel:</strong> Klanten betalen altijd rechtstreeks aan VDB Digital Software.</p></div>;
}

export function PageHeader({ eyebrow, title, description, actions }: { eyebrow?: string; title: string; description?: string; actions?: React.ReactNode }) {
  return <header className="mb-8 flex flex-col justify-between gap-5 border-b border-border pb-6 md:flex-row md:items-end"><div>{eyebrow && <p className="mb-2 text-xs font-semibold uppercase tracking-[0.18em] text-gold">{eyebrow}</p>}<h1 className="display text-4xl leading-none md:text-5xl">{title}</h1>{description && <p className="mt-3 max-w-2xl text-sm leading-6 text-muted">{description}</p>}</div>{actions && <div className="shrink-0">{actions}</div>}</header>;
}
