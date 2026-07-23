import { connection } from "next/server";
import { ForgotPasswordForm } from "./ForgotPasswordForm";

/** Wrapper serveur : force le rendu dynamique (voir register/page.tsx). */
export default async function ForgotPasswordPage() {
  await connection();
  return <ForgotPasswordForm />;
}
