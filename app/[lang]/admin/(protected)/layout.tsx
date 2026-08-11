import { LocaleLink as Link } from "@/components/i18n/navigation";
import { NotConfigured } from "@/components/NotConfigured";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { requireAdmin } from "@/lib/auth";
import { Logo } from "@/components/Logo";
import { AdminSidebar } from "@/components/admin/AdminSidebar";
import { LogoutButton } from "@/components/dashboard/LogoutButton";
import { IdleLogout } from "@/components/IdleLogout";
import { LanguageSwitcher } from "@/components/i18n/LanguageSwitcher";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  if (!isSupabaseConfigured()) return <NotConfigured />;
  const { email } = await requireAdmin();

  return (
    <div className="min-h-screen bg-canvas lg:flex">
      <IdleLogout />
      {/* Sidebar sombre */}
      <aside className="shrink-0 bg-ink text-white lg:sticky lg:top-0 lg:h-screen lg:w-64">
        <div className="flex items-center justify-between p-5">
          <Logo variant="light" href="/admin" />
          <div className="flex items-center gap-2">
            <LanguageSwitcher variant="dark" />
            <span className="badge bg-white/10 text-white/60">Admin</span>
          </div>
        </div>
        <div className="px-3">
          <AdminSidebar />
        </div>
        <div className="mt-6 space-y-2 border-t border-white/10 p-4 lg:absolute lg:bottom-0 lg:w-64">
          <p className="truncate px-1 text-xs text-white/40">{email}</p>
          <div className="flex items-center gap-2">
            <Link href="/dashboard" className="btn border border-white/15 text-xs text-white/70 hover:bg-white/10">
              Espace client
            </Link>
            <LogoutButton className="btn text-xs text-white/70 hover:bg-white/10" />
          </div>
        </div>
      </aside>

      {/* Contenu */}
      <main className="min-w-0 flex-1 px-4 py-8 lg:px-10">
        <div className="mx-auto max-w-5xl">{children}</div>
      </main>
    </div>
  );
}
