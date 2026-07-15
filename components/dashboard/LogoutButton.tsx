"use client";

import { signOut } from "@/app/[lang]/(auth)/actions";
import { useZone } from "@/components/i18n/DictionaryProvider";

export function LogoutButton({
  className = "btn-ghost text-sm",
  label,
}: {
  className?: string;
  label?: string;
}) {
  const common = useZone("common");
  return (
    <form action={signOut}>
      <button type="submit" className={className}>
        {label ?? common.actions.logout}
      </button>
    </form>
  );
}
