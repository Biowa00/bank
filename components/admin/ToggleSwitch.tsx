"use client";

/** Interrupteur accessible, purement présentational. */
export function ToggleSwitch({
  checked,
  onChange,
  disabled,
  tone = "brand",
  label,
}: {
  checked: boolean;
  onChange: (next: boolean) => void;
  disabled?: boolean;
  tone?: "brand" | "danger" | "accent";
  label: string;
}) {
  const on =
    tone === "danger"
      ? "bg-red-600"
      : tone === "accent"
        ? "bg-accent-500"
        : "bg-brand-600";

  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors disabled:cursor-not-allowed disabled:opacity-50 ${
        checked ? on : "bg-black/15"
      }`}
    >
      <span
        className={`inline-block h-5 w-5 transform rounded-full bg-white shadow transition-transform ${
          checked ? "translate-x-[22px]" : "translate-x-0.5"
        }`}
      />
    </button>
  );
}
