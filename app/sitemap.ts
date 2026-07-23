import type { MetadataRoute } from "next";
import { locales, defaultLocale } from "@/lib/i18n/config";

const SITE_URL = "https://www.vantexx.online";

/**
 * `/sitemap.xml` : uniquement les pages PUBLIQUES (landing + auth publiques),
 * une entrée par langue, avec alternates hreflang. Les espaces privés ne sont
 * pas listés. Sert à la racine (exempté du préfixe de langue dans proxy.ts).
 */
export default function sitemap(): MetadataRoute.Sitemap {
  // Chemins publics indexables, sans préfixe de langue.
  const publicPaths = ["", "/login", "/register"];

  return publicPaths.map((path) => ({
    url: `${SITE_URL}/${defaultLocale}${path}`,
    lastModified: new Date(),
    changeFrequency: "monthly" as const,
    priority: path === "" ? 1 : 0.6,
    alternates: {
      languages: Object.fromEntries(
        locales.map((loc) => [loc, `${SITE_URL}/${loc}${path}`]),
      ),
    },
  }));
}
