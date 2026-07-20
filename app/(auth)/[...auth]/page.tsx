import Link from "next/link";
import { Logo, PaymentRuleBanner } from "@/components/brand";
import { Card } from "@/components/ui";
import { ForgotPasswordForm, LoginForm, RegisterForm } from "@/components/forms/auth-forms";

export default async function AuthPage({ params }: { params: Promise<{ auth: string[] }> }) {
  const { auth } = await params;
  const page = auth[0];
  const content = page === "register" ? { title: "Word partner", copy: "Start uw aanvraag voor het VDB Partner Portal.", form: <RegisterForm />, link: ["Al partner?", "/login", "Inloggen"] } : page === "forgot-password" ? { title: "Toegang herstellen", copy: "Wij sturen u een veilige resetlink.", form: <ForgotPasswordForm />, link: ["Terug naar", "/login", "inloggen"] } : page === "verify-email" ? { title: "Verifieer uw e-mail", copy: "Open de link in uw e-mail om uw aanmelding voort te zetten.", form: null, link: ["Terug naar", "/login", "inloggen"] } : { title: "Welkom terug", copy: "Log in om uw partneractiviteiten te beheren.", form: <LoginForm />, link: ["Nog geen partner?", "/register", "Meld u aan"] };
  return <main className="flex min-h-screen items-center justify-center px-5 py-12"><div className="w-full max-w-md"><Logo className="mb-10" /><Card className="p-7 sm:p-9"><p className="text-xs uppercase tracking-[.18em] text-gold">Partner Portal</p><h1 className="display mt-4 text-4xl">{content.title}</h1><p className="mt-3 text-sm leading-6 text-muted">{content.copy}</p><div className="mt-7">{content.form}</div>{page === "verify-email" && <PaymentRuleBanner className="mt-6" />}</Card><p className="mt-5 text-center text-sm text-muted">{content.link[0]} <Link href={content.link[1]} className="text-gold">{content.link[2]}</Link></p></div></main>;
}
