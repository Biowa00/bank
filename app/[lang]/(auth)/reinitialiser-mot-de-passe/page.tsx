import { connection } from "next/server";
import { ResetPasswordForm } from "./ResetPasswordForm";

/** Wrapper serveur : force le rendu dynamique (voir register/page.tsx). */
export default async function ResetPasswordPage() {
  await connection();
  return <ResetPasswordForm />;
}
