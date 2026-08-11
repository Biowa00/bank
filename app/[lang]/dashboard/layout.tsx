import { NotConfigured } from "@/components/NotConfigured";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { Sidebar } from "@/components/dashboard/Sidebar";
import { MobileBottomNav } from "@/components/dashboard/MobileBottomNav";
import { LogoutButton } from "@/components/dashboard/LogoutButton";
import { IdleLogout } from "@/components/IdleLogout";
import { Logo } from "@/components/Logo";
import { LanguageSwitcher } from "@/components/i18n/LanguageSwitcher";
import { getRequestDictionary } from "../dictionaries";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  if (!isSupabaseConfigured()) return <NotConfigured />;

  const t = (await getRequestDictionary()).dashboard.layout;
  const { userId, profile } = await requireUser();
  const supabase = await createClient();
  const { count } = await supabase
    .from("notifications")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId)
    .eq("read", false);
  const unread = count ?? 0;

  // Compte banni : accès bloqué (seule la déconnexion reste possible).
  if (profile.status === "banned") {
    return (
      <div className="grid min-h-screen place-items-center bg-canvas px-4">
        <div className="card max-w-md p-8 text-center">
          <Logo href={null} />
          <h1 className="mt-6 text-xl font-bold text-red-600">{t.bannedTitle}</h1>
          <p className="mt-3 text-sm text-ink/70">
            {t.bannedText}
          </p>
          {profile.status_reason && (
            <p className="mt-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              <strong>{t.reason}</strong> {profile.status_reason}
            </p>
          )}
          <div className="mt-6">
            <LogoutButton className="btn-outline" />
          </div>
        </div>
      </div>
    );
  }

  const firstName = (profile.full_name ?? "").split(" ")[0] || t.defaultFirstName;

  return (
    <div className="min-h-screen bg-canvas">
      <IdleLogout />
      {/* Barre mobile supérieure */}
      <div className="sticky top-0 z-20 flex items-center justify-between border-b border-black/5 bg-canvas/90 px-4 py-3 backdrop-blur lg:hidden">
        <Logo />
        <div className="flex items-center gap-1">
          <LanguageSwitcher />
          <LogoutButton className="btn-outline text-xs" />
        </div>
      </div>

      <div className="mx-auto flex max-w-7xl gap-8 px-4 py-6 lg:px-6">
        {/* Sidebar desktop */}
        <aside className="sticky top-6 hidden h-fit w-60 shrink-0 lg:block">
          <div className="card p-3">
            <Sidebar unread={unread} />
          </div>
          <div className="mt-3 flex items-center justify-between px-3 text-sm text-ink/50">
            <span className="truncate">{firstName}</span>
            <LogoutButton className="text-sm text-ink/50 hover:text-ink" />
          </div>
          <div className="mt-2 px-1">
            <LanguageSwitcher />
          </div>
        </aside>

        {/* Contenu (padding bas sur mobile pour la barre fixe) */}
        <main className="min-w-0 flex-1 pb-28 lg:pb-16">
          {profile.status === "restricted" && (
            <div className="mb-5 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
              <strong>{t.restrictedTitle}</strong>{" "}
              {profile.status_reason ?? t.restrictedDefault}
            </div>
          )}
          {children}
        </main>
      </div>

      {/* Barre de navigation fixe (mobile) */}
      <MobileBottomNav unread={unread} />
    </div>
  );
}
