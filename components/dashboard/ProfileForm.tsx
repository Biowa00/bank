"use client";

import { useActionState } from "react";
import { updateProfile, type ActionState } from "@/app/[lang]/dashboard/actions";
import { SubmitButton } from "@/components/SubmitButton";
import { FormFeedback } from "./FormFeedback";
import { useZone } from "@/components/i18n/DictionaryProvider";

export function ProfileForm({
  fullName,
  email,
}: {
  fullName: string;
  email: string;
}) {
  const [state, action] = useActionState<ActionState, FormData>(updateProfile, {});
  const t = useZone("dashboard").profile;

  return (
    <form action={action} className="space-y-4">
      <FormFeedback state={state} />
      <div>
        <label className="label" htmlFor="full_name">{t.fullName}</label>
        <input id="full_name" name="full_name" type="text" required defaultValue={fullName} className="input" />
      </div>
      <div>
        <label className="label" htmlFor="email">{t.email}</label>
        <input id="email" type="email" disabled value={email} className="input cursor-not-allowed opacity-60" />
        <p className="mt-1 text-xs text-ink/40">{t.emailHint}</p>
      </div>
      <SubmitButton className="btn-primary" pendingLabel={t.pending}>
        {t.submit}
      </SubmitButton>
    </form>
  );
}
