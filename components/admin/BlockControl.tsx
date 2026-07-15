"use client";

import { useActionState } from "react";
import { setBlock, type AdminState } from "@/app/[lang]/admin/actions";
import { SubmitButton } from "@/components/SubmitButton";

export function BlockControl({
  userId,
  kind,
  blocked,
  reason,
}: {
  userId: string;
  kind: "withdrawals" | "transfers";
  blocked: boolean;
  reason: string | null;
}) {
  const [state, action] = useActionState<AdminState, FormData>(setBlock, {});
  const label = kind === "withdrawals" ? "Retraits" : "Virements";

  return (
    <div className="rounded-2xl border border-black/[.06] p-4">
      <div className="flex items-center justify-between">
        <p className="font-medium text-ink">{label}</p>
        <span className={`badge ${blocked ? "bg-red-500/10 text-red-600" : "bg-accent-500/10 text-accent-600"}`}>
          {blocked ? "Bloqués" : "Autorisés"}
        </span>
      </div>

      {blocked && reason && (
        <p className="mt-2 text-xs text-ink/50">Motif : {reason}</p>
      )}

      {state.error && <p className="mt-2 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{state.error}</p>}
      {state.success && <p className="mt-2 rounded-lg bg-accent-500/10 px-3 py-2 text-sm text-accent-600">{state.success}</p>}

      <form action={action} className="mt-3 space-y-2">
        <input type="hidden" name="user_id" value={userId} />
        <input type="hidden" name="kind" value={kind} />
        {blocked ? (
          <>
            <input type="hidden" name="blocked" value="false" />
            <SubmitButton className="btn-outline w-full text-sm" pendingLabel="…">
              Débloquer les {label.toLowerCase()}
            </SubmitButton>
          </>
        ) : (
          <>
            <input type="hidden" name="blocked" value="true" />
            <input name="reason" required className="input text-sm" placeholder="Motif du blocage…" />
            <SubmitButton className="btn-danger w-full text-sm" pendingLabel="…">
              Bloquer les {label.toLowerCase()}
            </SubmitButton>
          </>
        )}
      </form>
    </div>
  );
}
