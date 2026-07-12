import Link from "next/link";
import { NotConfigured } from "@/components/NotConfigured";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { Sidebar } from "@/components/dashboard/Sidebar";
import { LogoutButton } from "@/components/dashboard/LogoutButton";
import { Logo } from "@/components/Logo";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  if (!isSupabaseConfigured()) return <NotConfigured />;

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
          <h1 className="mt-6 text-xl font-bold text-red-600">Compte banni</h1>
          <p className="mt-3 text-sm text-ink/70">
            Votre compte a été banni et l&apos;accès à vos services est suspendu.
          </p>
          {profile.status_reason && (
            <p className="mt-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              <strong>Motif :</strong> {profile.status_reason}
            </p>
          )}
          <div className="mt-6">
            <LogoutButton className="btn-outline" />
          </div>
        </div>
      </div>
    );
  }

  const firstName = (profile.full_name ?? "").split(" ")[0] || "vous";

  return (
    <div className="min-h-screen bg-canvas">
      {/* Barre mobile */}
      <div className="sticky top-0 z-20 flex items-center justify-between border-b border-black/5 bg-canvas/90 px-4 py-3 backdrop-blur lg:hidden">
        <Logo />
        <div className="flex items-center gap-2">
          <Link href="/dashboard/notifications" className="btn-ghost relative px-2">
            <BellIcon />
            {unread > 0 && (
              <span className="absolute -right-0 -top-0 h-2.5 w-2.5 rounded-full bg-brand-600" />
            )}
          </Link>
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
        </aside>

        {/* Nav mobile horizontale */}
        <div className="lg:hidden">{/* la sidebar mobile est gérée par la barre supérieure */}</div>

        {/* Contenu */}
        <main className="min-w-0 flex-1 pb-16">
          {profile.status === "restricted" && (
            <div className="mb-5 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
              <strong>Compte restreint.</strong>{" "}
              {profile.status_reason ??
                "Certaines opérations (virements, retraits) sont indisponibles."}
            </div>
          )}
          {children}
          <MobileNav unread={unread} />
        </main>
      </div>
    </div>
  );
}

function MobileNav({ unread }: { unread: number }) {
  const items = [
    { href: "/dashboard", label: "Accueil" },
    { href: "/dashboard/depot", label: "Dépôt" },
    { href: "/dashboard/virement", label: "Virement" },
    { href: "/dashboard/retrait", label: "Retrait" },
    { href: "/dashboard/transactions", label: "Historique" },
    { href: "/dashboard/notifications", label: `Notifs${unread ? ` (${unread})` : ""}` },
    { href: "/dashboard/profil", label: "Profil" },
  ];
  return (
    <nav className="mt-8 flex flex-wrap gap-2 lg:hidden">
      {items.map((i) => (
        <Link key={i.href} href={i.href} className="btn-outline text-xs">
          {i.label}
        </Link>
      ))}
    </nav>
  );
}

function BellIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
      <path d="M6 8a6 6 0 1112 0c0 7 3 9 3 9H3s3-2 3-9zM9 21a3 3 0 006 0" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
