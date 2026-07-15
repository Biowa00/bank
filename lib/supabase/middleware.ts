import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import type { Locale } from "@/lib/i18n/config";

/**
 * Rafraîchit la session Supabase à chaque requête et protège les routes
 * privées (/dashboard, /admin).
 *
 * @param locale Langue courante extraite de l'URL (`/de/...`) ou `null` pour
 *   les endpoints machine non localisés. Sert à préfixer les redirections.
 */
export async function updateSession(
  request: NextRequest,
  locale: Locale | null,
) {
  let supabaseResponse = NextResponse.next({ request });

  // Tant que Supabase n'est pas configuré (.env.local vide), on laisse passer
  // pour pouvoir consulter la landing. Les pages privées afficheront un message.
  if (
    !process.env.NEXT_PUBLIC_SUPABASE_URL ||
    !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  ) {
    return supabaseResponse;
  }

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value),
          );
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options),
          );
        },
      },
    },
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const path = request.nextUrl.pathname;
  // Chemin « logique » sans le préfixe de langue, pour tester les zones.
  const logical = locale ? path.replace(`/${locale}`, "") || "/" : path;
  // Préfixe une cible de redirection avec la langue courante.
  const p = (target: string) => (locale ? `/${locale}${target}` : target);

  const isDashboard = logical.startsWith("/dashboard");
  const isAdmin = logical.startsWith("/admin") && logical !== "/admin/login";

  // Non connecté → redirection vers login
  if (!user && (isDashboard || isAdmin)) {
    const url = request.nextUrl.clone();
    url.pathname = p(isAdmin ? "/admin/login" : "/login");
    // `next` conserve l'URL complète (préfixée) pour un retour correct.
    url.searchParams.set("next", path);
    return NextResponse.redirect(url);
  }

  // Cloisonnement des espaces : l'admin n'a pas d'espace client et vice-versa.
  if (user && (isAdmin || isDashboard)) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();
    const isAdminRole = profile?.role === "admin";

    if (isAdmin && !isAdminRole) {
      const url = request.nextUrl.clone();
      url.pathname = p("/dashboard");
      return NextResponse.redirect(url);
    }
    if (isDashboard && isAdminRole) {
      const url = request.nextUrl.clone();
      url.pathname = p("/admin");
      return NextResponse.redirect(url);
    }
  }

  return supabaseResponse;
}
