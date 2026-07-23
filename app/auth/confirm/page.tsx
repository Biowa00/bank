import { Logo } from "@/components/Logo";
import { confirmEmail } from "./actions";

/**
 * Page intermédiaire ouverte depuis le lien reçu par email (confirmation
 * d'inscription ou réinitialisation de mot de passe). La vérification du
 * token n'a lieu QU'AU CLIC sur le bouton (Server Action), jamais au simple
 * chargement de la page — voir actions.ts pour la raison (anti pré-chargement
 * des liens par certains clients mail).
 *
 * Accepte deux formats de lien Supabase selon le gabarit d'email réellement
 * actif côté tableau de bord : `token_hash`+`type` (gabarit personnalisé,
 * vérifié via verifyOtp) ou `code` (gabarit par défaut / flux PKCE, vérifié
 * via exchangeCodeForSession).
 *
 * Bilingue FR/EN par défaut : cette page est ouverte avant toute session,
 * on ne connaît donc pas encore la langue préférée du visiteur de façon fiable.
 */
export default async function ConfirmPage({
  searchParams,
}: {
  searchParams: Promise<{ token_hash?: string; type?: string; code?: string; next?: string }>;
}) {
  const { token_hash, type, code, next } = await searchParams;
  const isRecovery = type === "recovery";
  const hasValidLink = (Boolean(token_hash) && Boolean(type)) || Boolean(code);

  return (
    <div className="flex min-h-screen items-center justify-center bg-canvas px-4 py-12">
      <div className="card w-full max-w-sm p-8 text-center">
        <div className="mb-6 flex justify-center">
          <Logo href={null} />
        </div>

        {!hasValidLink ? (
          <>
            <h1 className="text-lg font-bold text-ink">Lien invalide / Invalid link</h1>
            <p className="mt-2 text-sm text-ink/60">
              Ce lien est invalide ou incomplet. Demandez-en un nouveau.
              <br />
              This link is invalid or incomplete. Please request a new one.
            </p>
          </>
        ) : (
          <>
            <h1 className="text-lg font-bold text-ink">
              {isRecovery
                ? "Continuer la réinitialisation / Continue password reset"
                : "Confirmer votre email / Confirm your email"}
            </h1>
            <p className="mt-2 text-sm text-ink/60">
              {isRecovery ? (
                <>
                  Cliquez ci-dessous pour choisir un nouveau mot de passe.
                  <br />
                  Click below to choose a new password.
                </>
              ) : (
                <>
                  Cliquez ci-dessous pour activer votre compte Vantex Bank S.A.
                  <br />
                  Click below to activate your Vantex Bank S.A account.
                </>
              )}
            </p>
            <form action={confirmEmail} className="mt-6">
              <input type="hidden" name="token_hash" value={token_hash ?? ""} />
              <input type="hidden" name="type" value={type ?? ""} />
              <input type="hidden" name="code" value={code ?? ""} />
              <input type="hidden" name="next" value={next ?? ""} />
              <button type="submit" className="btn btn-primary w-full">
                {isRecovery ? "Continuer / Continue" : "Confirmer mon email / Confirm my email"}
              </button>
            </form>
          </>
        )}
      </div>
    </div>
  );
}
