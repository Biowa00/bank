import { signOut } from "@/app/(auth)/actions";

export function LogoutButton({
  className = "btn-ghost text-sm",
  label = "Déconnexion",
}: {
  className?: string;
  label?: string;
}) {
  return (
    <form action={signOut}>
      <button type="submit" className={className}>
        {label}
      </button>
    </form>
  );
}
