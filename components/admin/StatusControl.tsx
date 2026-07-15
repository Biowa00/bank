"use client";

import { useActionState, useState } from "react";
import { setAccountStatus, type AdminState } from "@/app/[lang]/admin/actions";
import { SubmitButton } from "@/components/SubmitButton";
import type { AccountStatus } from "@/lib/types";

export function StatusControl({
  userId,
  current,
}: {
  userId: string;
  current: AccountStatus;
}) {
  const [state, action] = useActionState<AdminState, FormData>(setAccountStatus, {});
  const [status, setStatus] = useState<AccountStatus>(current);
  const needsReason = status !== "active";

  return (
    <form action={action} className="space-y-3">
      <input type="hidden" name="user_id" value={userId} />
      {state.error && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{state.error}</p>}
      {state.success && <p className="rounded-lg bg-accent-500/10 px-3 py-2 text-sm text-accent-600">{state.success}</p>}

      <div>
        <label className="label">Nouveau statut</label>
        <select
          name="status"
          value={status}
          onChange={(e) => setStatus(e.target.value as AccountStatus)}
          className="input"
        >
          <option value="active">Actif (réactiver)</option>
          <option value="restricted">Restreint</option>
          <option value="banned">Banni</option>
        </select>
      </div>

      {needsReason && (
        <div>
          <label className="label">Motif (obligatoire)</label>
          <textarea name="reason" rows={2} required className="input resize-none" placeholder="Motif communiqué à l'utilisateur…" />
        </div>
      )}

      <SubmitButton className="btn-dark w-full" pendingLabel="Application…">
        Appliquer le statut
      </SubmitButton>
    </form>
  );
}
