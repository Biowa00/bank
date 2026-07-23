/**
 * Valide une cible de redirection `next` fournie par l'extérieur (query string,
 * champ de formulaire) pour empêcher une redirection ouverte (open redirect).
 *
 * On n'accepte QUE les chemins internes absolus : ils doivent commencer par un
 * seul `/`. Sont donc rejetés :
 *   - les URL absolues  (`https://evil.com`, `http:evil.com`)
 *   - les URL relatives au protocole (`//evil.com`) — pièges classiques car
 *     elles commencent bien par `/` mais mènent hors du site
 *   - les variantes avec antislash (`/\evil.com`) que certains navigateurs
 *     normalisent en `//`
 *
 * Repli sur `fallback` (une cible sûre construite côté serveur) sinon.
 */
export function safeNextPath(
  next: string | null | undefined,
  fallback: string,
): string {
  if (!next) return fallback;
  if (!next.startsWith("/")) return fallback; // externe / relatif
  if (next.startsWith("//") || next.startsWith("/\\")) return fallback; // protocol-relative
  return next;
}
