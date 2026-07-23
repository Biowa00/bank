import { DM_Sans, Geist_Mono } from "next/font/google";
import "../globals.css";

/**
 * Layout racine pour le sous-arbre `/auth/*` (confirmation d'inscription,
 * réinitialisation de mot de passe). Ces routes vivent HORS de `app/[lang]/`,
 * elles n'héritaient donc pas de `globals.css` ni des polices — la page
 * s'affichait sans aucun style (texte + bouton bruts). Ce layout fournit
 * `<html>/<body>`, les styles et les polices, comme le layout de `[lang]`.
 *
 * Bilingue FR/EN : `lang="fr"` par défaut (ces pages sont ouvertes avant toute
 * session, la langue préférée n'est pas encore connue de façon fiable).
 */
const dmSans = DM_Sans({
  variable: "--font-geist-sans",
  subsets: ["latin", "latin-ext"],
  weight: ["300", "400", "500", "600", "700", "800"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export default function AuthRootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="fr"
      className={`${dmSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full">{children}</body>
    </html>
  );
}
