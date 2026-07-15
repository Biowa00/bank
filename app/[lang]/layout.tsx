import type { Metadata } from "next";
import { DM_Sans, Geist_Mono } from "next/font/google";
import { notFound } from "next/navigation";
import "../globals.css";
import { isLocale, locales } from "@/lib/i18n/config";
import { getDictionary } from "./dictionaries";
import { DictionaryProvider } from "@/components/i18n/DictionaryProvider";

const dmSans = DM_Sans({
  variable: "--font-geist-sans",
  // latin-ext couvre les diacritiques d'Europe centrale (pl, cs, sk, sl, hu).
  // DM Sans n'a pas de glyphes grecs/cyrilliques : el et bg retombent sur la
  // police système, ce qui reste lisible.
  subsets: ["latin", "latin-ext"],
  weight: ["300", "400", "500", "600", "700", "800"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Nébula — Banque en ligne",
  description:
    "Nébula, la néobanque nouvelle génération : compte, IBAN, virements et suivi en temps réel.",
};

/** Pré-génère une route statique par langue supportée. */
export function generateStaticParams() {
  return locales.map((lang) => ({ lang }));
}

export default async function RootLayout({
  children,
  params,
}: LayoutProps<"/[lang]">) {
  const { lang } = await params;
  // Une langue inconnue dans l'URL → 404 (plutôt qu'un rendu cassé).
  if (!isLocale(lang)) notFound();

  const dict = await getDictionary(lang);

  return (
    <html
      lang={lang}
      className={`${dmSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full">
        <DictionaryProvider lang={lang} dict={dict}>
          {children}
        </DictionaryProvider>
      </body>
    </html>
  );
}
