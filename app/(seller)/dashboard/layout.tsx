import { MobileNav, Sidebar } from "@/components/dashboard";

export default function SellerLayout({ children }: { children: React.ReactNode }) {
  return <div className="min-h-screen lg:flex"><Sidebar /><div className="min-w-0 flex-1"><MobileNav /><main className="mx-auto max-w-7xl px-5 py-8 md:px-10">{children}</main></div></div>;
}
