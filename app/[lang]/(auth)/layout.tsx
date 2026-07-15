import { LocaleLink as Link } from "@/components/i18n/navigation";
import { LanguageSwitcher } from "@/components/i18n/LanguageSwitcher";
import { Logo } from "@/components/Logo";
import { NotConfigured } from "@/components/NotConfigured";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { getDictionary } from "../dictionaries";

export default async function AuthLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ lang: string }>;
}) {
  if (!isSupabaseConfigured()) return <NotConfigured />;

  const { lang } = await params;
  const dict = await getDictionary(lang);
  const t = dict.auth.brandPanel;

  return (
    <div className="grid min-h-screen lg:grid-cols-2">
      {/* Panneau marque */}
      <div className="relative hidden overflow-hidden bg-ink p-12 text-white lg:flex lg:flex-col lg:justify-between">
        <div className="flex items-center justify-between">
          <Logo variant="light" />
          <LanguageSwitcher variant="dark" />
        </div>
        <div>
          <h2 className="text-4xl font-bold leading-tight tracking-tight">
            {t.title}
          </h2>
          <p className="mt-4 max-w-sm text-white/60">
            {t.description}
          </p>
        </div>
        <p className="text-xs text-white/40">
          {t.tagline}
        </p>
        <div className="pointer-events-none absolute -bottom-32 -right-32 h-96 w-96 rounded-full bg-brand-500/30 blur-3xl" />
        <div className="pointer-events-none absolute -top-32 -left-20 h-72 w-72 rounded-full bg-accent-500/20 blur-3xl" />
      </div>

      {/* Panneau formulaire */}
      <div className="flex flex-col bg-canvas">
        <div className="flex items-center justify-between p-6 lg:hidden">
          <Logo />
          <div className="flex items-center gap-1">
            <LanguageSwitcher />
            <Link href="/" className="text-sm text-ink/50 hover:text-ink">
              {dict.common.actions.home}
            </Link>
          </div>
        </div>
        <div className="flex flex-1 items-center justify-center px-4 py-10">
          <div className="w-full max-w-md">{children}</div>
        </div>
      </div>
    </div>
  );
}
