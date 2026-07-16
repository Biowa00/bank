import { LocaleLink as Link } from "@/components/i18n/navigation";

export function Logo({
  className = "",
  href = "/",
  variant = "dark",
}: {
  className?: string;
  href?: string | null;
  variant?: "dark" | "light";
}) {
  const textColor = variant === "light" ? "text-white" : "text-ink";
  const inner = (
    <span className={`flex items-center gap-2 font-bold tracking-tight ${className}`}>
      <span className="grid h-8 w-8 place-items-center rounded-xl bg-gradient-to-br from-brand-500 to-accent-500 text-white shadow-sm">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
          <path
            d="M4 10L12 4l8 6M6 10v8h12v-8"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </span>
      <span className={`text-lg ${textColor}`}>Vantex Bank</span>
    </span>
  );

  if (href === null) return inner;
  return (
    <Link href={href} aria-label="Vantex Bank — accueil">
      {inner}
    </Link>
  );
}
