"use client";

import { useActionState } from "react";
import { updateProfile, type ActionState } from "@/app/dashboard/actions";
import { SubmitButton } from "@/components/SubmitButton";
import { FormFeedback } from "./FormFeedback";

export function ProfileForm({
  fullName,
  email,
}: {
  fullName: string;
  email: string;
}) {
  const [state, action] = useActionState<ActionState, FormData>(updateProfile, {});

  return (
    <form action={action} className="space-y-4">
      <FormFeedback state={state} />
      <div>
        <label className="label" htmlFor="full_name">Nom complet</label>
        <input id="full_name" name="full_name" type="text" required defaultValue={fullName} className="input" />
      </div>
      <div>
        <label className="label" htmlFor="email">Adresse e-mail</label>
        <input id="email" type="email" disabled value={email} className="input cursor-not-allowed opacity-60" />
        <p className="mt-1 text-xs text-ink/40">L&apos;e-mail n&apos;est pas modifiable dans cette démo.</p>
      </div>
      <SubmitButton className="btn-primary" pendingLabel="Enregistrement…">
        Enregistrer
      </SubmitButton>
    </form>
  );
}
