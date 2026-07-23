import type { MetadataRoute } from "next";

const SITE_URL = "https://www.vantexx.online";

/**
 * `/robots.txt` généré par Next. Les espaces privés (client/admin) et les
 * endpoints d'auth sont exclus de l'indexation ; la landing publique reste
 * indexable. Sert à la racine (exempté du préfixe de langue dans proxy.ts).
 */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: ["/dashboard", "/admin", "/auth/"],
    },
    sitemap: `${SITE_URL}/sitemap.xml`,
  };
}
