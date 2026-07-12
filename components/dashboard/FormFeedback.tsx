import type { ActionState } from "@/app/dashboard/actions";

export function FormFeedback({ state }: { state: ActionState }) {
  if (state.error)
    return (
      <p className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
        {state.error}
      </p>
    );
  if (state.success)
    return (
      <p className="rounded-xl border border-accent-500/30 bg-accent-500/10 px-4 py-3 text-sm text-accent-600">
        {state.success}
      </p>
    );
  return null;
}
