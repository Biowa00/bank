import { connection } from "next/server";
import { AdminLoginForm } from "./AdminLoginForm";

/** Wrapper serveur : force le rendu dynamique (voir (auth)/register/page.tsx). */
export default async function AdminLoginPage() {
  await connection();
  return <AdminLoginForm />;
}
