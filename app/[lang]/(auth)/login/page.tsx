import { connection } from "next/server";
import { LoginForm } from "./LoginForm";

/** Wrapper serveur : force le rendu dynamique (voir register/page.tsx). */
export default async function LoginPage() {
  await connection();
  return <LoginForm />;
}
