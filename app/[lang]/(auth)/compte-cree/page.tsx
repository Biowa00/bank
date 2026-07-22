import { LocaleLink as Link } from "@/components/i18n/navigation";
import { getRequestDictionary } from "../../dictionaries";

export default async function AccountCreatedPage() {
  const dict = await getRequestDictionary();
  const t = dict.auth.accountCreated;
  const description = dict.errors.auth.accountCreatedConfirm;

  return (
    <div className="text-center">
      <div className="mx-auto mb-5 grid h-14 w-14 place-items-center rounded-full bg-brand-50 text-brand-600">
        <svg width="26" height="26" viewBox="0 0 24 24" fill="none" aria-hidden>
          <path
            d="M3 7l9 6 9-6M4 5h16a1 1 0 011 1v12a1 1 0 01-1 1H4a1 1 0 01-1-1V6a1 1 0 011-1z"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </div>
      <h1 className="text-2xl font-bold tracking-tight text-ink">{t.title}</h1>
      <p className="mt-2 text-sm text-ink/60">{description}</p>
      <Link href="/login" className="btn btn-primary mt-6 inline-flex">
        {t.backToLogin}
      </Link>
    </div>
  );
}
