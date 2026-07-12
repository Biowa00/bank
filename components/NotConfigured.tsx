import Link from "next/link";
import { Logo } from "@/components/Logo";

/** Affiché quand Supabase n'est pas encore branché (.env.local vide). */
export function NotConfigured() {
  return (
    <div className="grid min-h-screen place-items-center bg-canvas px-4">
      <div className="card max-w-lg p-8 text-center">
        <div className="mx-auto w-fit">
          <Logo href={null} />
        </div>
        <h1 className="mt-6 text-xl font-bold text-ink">
          Supabase n&apos;est pas encore configuré
        </h1>
        <p className="mt-3 text-sm text-ink/60">
          Renseigne les clés de ton projet Supabase dans le fichier{" "}
          <code className="rounded bg-black/5 px-1.5 py-0.5 font-mono text-xs">
            .env.local
          </code>{" "}
          puis relance le serveur. Vois{" "}
          <code className="rounded bg-black/5 px-1.5 py-0.5 font-mono text-xs">
            .env.local.example
          </code>{" "}
          et{" "}
          <code className="rounded bg-black/5 px-1.5 py-0.5 font-mono text-xs">
            supabase/schema.sql
          </code>
          .
        </p>
        <Link href="/" className="btn-outline mt-6">
          Retour à l&apos;accueil
        </Link>
      </div>
    </div>
  );
}
