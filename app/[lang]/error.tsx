"use client";

/**
 * Filet de sécurité pour toute erreur imprévue (ex. requête rejetée par le
 * serveur) qui, sans cela, laisserait un écran vide ou une trace technique
 * brute au lieu d'un message clair. Bilingue FR/EN : une erreur peut survenir
 * avant que le contexte de langue ne soit fiable.
 */
export default function ErrorBoundary({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-canvas px-4 py-12">
      <div className="card w-full max-w-sm p-8 text-center">
        <h1 className="text-lg font-bold text-ink">
          Une erreur est survenue / Something went wrong
        </h1>
        <p className="mt-2 text-sm text-ink/60">
          Si vous envoyiez un fichier, essayez avec une image plus légère.
          <br />
          If you were uploading a file, try again with a smaller image.
        </p>
        <button type="button" onClick={() => reset()} className="btn btn-primary mt-6 w-full">
          Réessayer / Try again
        </button>
      </div>
    </div>
  );
}
