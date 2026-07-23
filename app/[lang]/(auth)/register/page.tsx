import { connection } from "next/server";
import { RegisterForm } from "./RegisterForm";

/**
 * Wrapper serveur : force le rendu dynamique (non pré-rendu/mis en cache).
 * Cette page contient un formulaire lié à une Server Action ; si elle était
 * statique, le HTML (et la référence d'action qu'il embarque) pourrait être
 * servi depuis le cache CDN après un nouveau déploiement, avec une référence
 * qui ne correspond plus au build en cours → 404 imprévisible à la soumission.
 */
export default async function RegisterPage() {
  await connection();
  return <RegisterForm />;
}
