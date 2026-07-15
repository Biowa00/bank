import { LocaleLink as Link } from "@/components/i18n/navigation";
import { LanguageSwitcher } from "@/components/i18n/LanguageSwitcher";
import { Logo } from "@/components/Logo";
import { Reveal } from "@/components/Reveal";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { getSessionProfile } from "@/lib/auth";
import { getDictionary } from "./dictionaries";
import type { Dictionary } from "./dictionaries";

type L = Dictionary["landing"];
type C = Dictionary["common"];

export default async function LandingPage({ params }: PageProps<"/[lang]">) {
  const { lang } = await params;
  const dict = await getDictionary(lang);
  const t = dict.landing;
  const c = dict.common;

  // Le logo ramène ici sans casser la session ; on détecte l'utilisateur
  // connecté pour afficher un accès direct à son espace personnel.
  const session = isSupabaseConfigured() ? await getSessionProfile() : null;
  const loggedIn = Boolean(session);
  // L'admin est dirigé vers son back-office, le client vers son espace.
  const spaceHref = session?.profile.role === "admin" ? "/admin" : "/dashboard";

  return (
    <div className="flex min-h-screen flex-col bg-canvas">
      <SiteNav loggedIn={loggedIn} spaceHref={spaceHref} t={t} c={c} />
      <main className="flex-1">
        <Hero t={t} c={c} />
        <LogoStrip t={t} />
        <Reveal><Features t={t} /></Reveal>
        <Reveal><AccountShowcase t={t} c={c} /></Reveal>
        <Reveal><Steps t={t} /></Reveal>
        <Reveal><Security t={t} /></Reveal>
        <Reveal><Stats t={t} /></Reveal>
        <Reveal><Testimonials t={t} /></Reveal>
        <Reveal><FinalCta t={t} /></Reveal>
      </main>
      <SiteFooter t={t} c={c} />
    </div>
  );
}

/* ---------------- Navigation ---------------- */
function SiteNav({
  loggedIn,
  spaceHref,
  t,
  c,
}: {
  loggedIn: boolean;
  spaceHref: string;
  t: L;
  c: C;
}) {
  return (
    <header className="sticky top-0 z-30 border-b border-black/5 bg-canvas/80 backdrop-blur">
      <nav className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3.5">
        {/* Le logo ramène à l'accueil public, sans déconnecter. */}
        <Logo />
        <div className="hidden items-center gap-8 text-sm font-medium text-ink/70 md:flex">
          <a href="#fonctionnalites" className="hover:text-ink">{t.nav.features}</a>
          <a href="#securite" className="hover:text-ink">{t.nav.security}</a>
          <a href="#etapes" className="hover:text-ink">{t.nav.howItWorks}</a>
        </div>
        <div className="flex items-center gap-2">
          <LanguageSwitcher />
          {loggedIn ? (
            // Accès rapide à l'espace personnel — visible uniquement connecté.
            <Link
              href={spaceHref}
              aria-label={c.actions.mySpaceAria}
              title={c.actions.mySpace}
              className="btn-primary gap-2"
            >
              <UserIcon />
              <span className="hidden sm:inline">{c.actions.mySpace}</span>
            </Link>
          ) : (
            <>
              <Link href="/login" className="btn-ghost">{c.actions.login}</Link>
              <Link href="/register" className="btn-primary">{c.actions.register}</Link>
            </>
          )}
        </div>
      </nav>
    </header>
  );
}

function UserIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path d="M12 12a4 4 0 100-8 4 4 0 000 8zm-7 8a7 7 0 0114 0" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

/* ---------------- Hero ---------------- */
function Hero({ t, c }: { t: L; c: C }) {
  return (
    <section className="relative overflow-hidden">
      <div className="mx-auto grid max-w-6xl items-center gap-12 px-4 py-20 md:grid-cols-2 md:py-28">
        <div>
          <span className="badge bg-brand-100 text-brand-700">
            <span className="h-1.5 w-1.5 rounded-full bg-brand-500" />
            {t.hero.badge}
          </span>
          <h1 className="mt-5 text-4xl font-bold leading-[1.05] tracking-tight text-ink sm:text-5xl md:text-6xl">
            {t.hero.titleLead}{" "}
            <span className="bg-gradient-to-r from-brand-600 to-accent-500 bg-clip-text text-transparent">
              {t.hero.titleHighlight}
            </span>
          </h1>
          <p className="mt-6 max-w-md text-lg text-ink/60">
            {t.hero.description}
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link href="/register" className="btn-primary px-6 py-3 text-base">
              {t.hero.ctaPrimary}
            </Link>
            <Link href="/login" className="btn-outline px-6 py-3 text-base">
              {t.hero.ctaSecondary}
            </Link>
          </div>
          <p className="mt-4 flex items-center gap-2 text-sm text-ink/50">
            <CheckIcon /> {t.hero.guarantee}
          </p>
        </div>
        <HeroCard t={t} c={c} />
      </div>
      <div className="pointer-events-none absolute -right-40 -top-40 h-96 w-96 rounded-full bg-brand-400/20 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-40 -left-40 h-96 w-96 rounded-full bg-accent-400/20 blur-3xl" />
    </section>
  );
}

function HeroCard({ t, c }: { t: L; c: C }) {
  return (
    <div className="relative mx-auto w-full max-w-sm animate-floaty">
      <div className="absolute inset-0 -rotate-6 rounded-[2rem] bg-gradient-to-br from-brand-500 to-accent-500 opacity-20 blur-xl" />
      <div className="relative overflow-hidden rounded-[2rem] bg-gradient-to-br from-ink to-ink-soft p-7 text-white shadow-2xl">
        <div className="flex items-center justify-between">
          <Logo variant="light" href={null} />
          <span className="text-xs text-white/50">{t.hero.cardTier}</span>
        </div>
        <div className="mt-10">
          <p className="text-sm text-white/50">{c.account.availableBalance}</p>
          <p className="mt-1 text-4xl font-bold tracking-tight">4 250,00 €</p>
        </div>
        <div className="mt-8 font-mono text-sm tracking-widest text-white/80">
          FR76 3000 4021 8850 0100
        </div>
        <div className="mt-2 flex items-center justify-between text-xs text-white/50">
          <span>{c.brand.toUpperCase()}</span>
          <span>{c.account.currentAccount}</span>
        </div>
      </div>
    </div>
  );
}

/* ---------------- Logo strip ---------------- */
function LogoStrip({ t }: { t: L }) {
  return (
    <div className="border-y border-black/5 bg-white/50">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-center gap-x-10 gap-y-2 px-4 py-6 text-sm font-medium text-ink/40">
        <span>{t.logoStrip.sepa}</span>
        <span>·</span>
        <span>{t.logoStrip.instantIban}</span>
        <span>·</span>
        <span>{t.logoStrip.realtimeNotifications}</span>
        <span>·</span>
        <span>{t.logoStrip.fullHistory}</span>
      </div>
    </div>
  );
}

/* ---------------- Features ---------------- */
const featureIcons: Record<string, React.ReactNode> = {
  transfers: (
    <path d="M4 12h16m0 0l-5-5m5 5l-5 5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
  ),
  card: (
    <>
      <rect x="3" y="5" width="18" height="14" rx="2" stroke="currentColor" strokeWidth="2" />
      <path d="M3 10h18" stroke="currentColor" strokeWidth="2" />
    </>
  ),
  notifications: (
    <path d="M6 8a6 6 0 1112 0c0 7 3 9 3 9H3s3-2 3-9zM9 21a3 3 0 006 0" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
  ),
  deposits: (
    <path d="M12 3v12m0 0l4-4m-4 4l-4-4M4 21h16" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
  ),
};

function Features({ t }: { t: L }) {
  const items = t.features.items;
  const order: (keyof typeof items)[] = ["transfers", "card", "notifications", "deposits"];
  return (
    <section id="fonctionnalites" className="mx-auto max-w-6xl px-4 py-20">
      <div className="max-w-2xl">
        <h2 className="text-3xl font-bold tracking-tight text-ink sm:text-4xl">
          {t.features.title}
        </h2>
        <p className="mt-4 text-lg text-ink/60">
          {t.features.subtitle}
        </p>
      </div>
      <div className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
        {order.map((key) => (
          <div key={key} className="card p-6">
            <span className="grid h-11 w-11 place-items-center rounded-xl bg-brand-50 text-brand-600">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none">{featureIcons[key]}</svg>
            </span>
            <h3 className="mt-4 font-semibold text-ink">{items[key].title}</h3>
            <p className="mt-2 text-sm text-ink/60">{items[key].desc}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

/* ---------------- Account showcase ---------------- */
function AccountShowcase({ t, c }: { t: L; c: C }) {
  return (
    <section className="bg-white py-20">
      <div className="mx-auto grid max-w-6xl items-center gap-12 px-4 md:grid-cols-2">
        <div>
          <span className="badge bg-accent-500/10 text-accent-600">{t.showcase.badge}</span>
          <h2 className="mt-4 text-3xl font-bold tracking-tight text-ink sm:text-4xl">
            {t.showcase.title}
          </h2>
          <p className="mt-4 text-lg text-ink/60">
            {t.showcase.description}
          </p>
          <ul className="mt-6 space-y-3">
            {t.showcase.points.map((p) => (
              <li key={p} className="flex items-center gap-3 text-ink/80">
                <span className="grid h-6 w-6 place-items-center rounded-full bg-accent-500/15 text-accent-600">
                  <CheckIcon />
                </span>
                {p}
              </li>
            ))}
          </ul>
        </div>
        <div className="card overflow-hidden p-0">
          <div className="border-b border-black/5 bg-canvas px-6 py-4">
            <p className="text-sm text-ink/50">{c.account.availableBalance}</p>
            <p className="text-3xl font-bold text-ink">4 250,00 €</p>
          </div>
          <div className="divide-y divide-black/5">
            {[
              { l: t.showcase.sampleDeposit, d: t.showcase.sampleToday, a: "+ 1 200,00 €", up: true },
              { l: t.showcase.sampleTransfer, d: t.showcase.sampleYesterday, a: "− 350,00 €", up: false },
              { l: t.showcase.sampleDeposit, d: "12 juil.", a: "+ 900,00 €", up: true },
            ].map((r, i) => (
              <div key={i} className="flex items-center justify-between px-6 py-4">
                <div>
                  <p className="font-medium text-ink">{r.l}</p>
                  <p className="text-xs text-ink/50">{r.d}</p>
                </div>
                <span className={`font-semibold ${r.up ? "text-accent-600" : "text-ink"}`}>{r.a}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

/* ---------------- Steps ---------------- */
function Steps({ t }: { t: L }) {
  return (
    <section id="etapes" className="mx-auto max-w-6xl px-4 py-20">
      <h2 className="text-center text-3xl font-bold tracking-tight text-ink sm:text-4xl">
        {t.steps.title}
      </h2>
      <div className="mt-12 grid gap-6 md:grid-cols-3">
        {t.steps.items.map((s, i) => (
          <div key={i} className="card p-7">
            <span className="grid h-12 w-12 place-items-center rounded-full bg-ink text-lg font-bold text-white">
              {i + 1}
            </span>
            <h3 className="mt-5 text-lg font-semibold text-ink">{s.title}</h3>
            <p className="mt-2 text-ink/60">{s.desc}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

/* ---------------- Security ---------------- */
function Security({ t }: { t: L }) {
  return (
    <section id="securite" className="bg-ink py-20 text-white">
      <div className="mx-auto grid max-w-6xl items-center gap-12 px-4 md:grid-cols-2">
        <div>
          <span className="badge bg-white/10 text-white/80">{t.security.badge}</span>
          <h2 className="mt-4 text-3xl font-bold tracking-tight sm:text-4xl">
            {t.security.title}
          </h2>
          <p className="mt-4 text-lg text-white/60">
            {t.security.description}
          </p>
          <div className="mt-8 grid grid-cols-2 gap-4">
            {t.security.cards.map((card) => (
              <div key={card.title} className="rounded-2xl border border-white/10 bg-white/5 p-4">
                <p className="font-semibold">{card.title}</p>
                <p className="mt-1 text-sm text-white/50">{card.desc}</p>
              </div>
            ))}
          </div>
        </div>
        <div className="grid place-items-center">
          <div className="grid h-56 w-56 place-items-center rounded-full border border-white/10 bg-white/5">
            <div className="grid h-40 w-40 place-items-center rounded-full border border-white/10 bg-white/5">
              <svg width="64" height="64" viewBox="0 0 24 24" fill="none">
                <path d="M12 3l7 3v5c0 4.5-3 8-7 10-4-2-7-5.5-7-10V6l7-3z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
                <path d="M9 12l2 2 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ---------------- Stats ---------------- */
function Stats({ t }: { t: L }) {
  return (
    <section className="mx-auto max-w-6xl px-4 py-16">
      <div className="grid gap-6 rounded-[var(--radius-xl2)] border border-black/5 bg-white p-8 text-center sm:grid-cols-3">
        {[
          ["10 000+", t.stats.accounts],
          ["4,9/5", t.stats.satisfaction],
          ["100%", t.stats.free],
        ].map(([n, l]) => (
          <div key={l}>
            <p className="text-4xl font-bold tracking-tight text-ink">{n}</p>
            <p className="mt-1 text-sm text-ink/50">{l}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

/* ---------------- Testimonials ---------------- */
function Testimonials({ t }: { t: L }) {
  return (
    <section className="bg-white py-20">
      <div className="mx-auto max-w-6xl px-4">
        <h2 className="text-center text-3xl font-bold tracking-tight text-ink sm:text-4xl">
          {t.testimonials.title}
        </h2>
        <div className="mt-12 grid gap-6 md:grid-cols-3">
          {t.testimonials.items.map((item) => (
            <figure key={item.author} className="card p-7">
              <div className="text-accent-500">★★★★★</div>
              <blockquote className="mt-3 text-ink/80">“{item.quote}”</blockquote>
              <figcaption className="mt-4 text-sm font-medium text-ink/50">— {item.author}</figcaption>
            </figure>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ---------------- Final CTA ---------------- */
function FinalCta({ t }: { t: L }) {
  return (
    <section className="mx-auto max-w-6xl px-4 py-20">
      <div className="relative overflow-hidden rounded-[2rem] bg-gradient-to-br from-brand-600 to-accent-500 px-8 py-16 text-center text-white">
        <h2 className="mx-auto max-w-2xl text-3xl font-bold tracking-tight sm:text-4xl">
          {t.finalCta.title}
        </h2>
        <p className="mx-auto mt-4 max-w-md text-white/80">
          {t.finalCta.description}
        </p>
        <div className="mt-8 flex justify-center gap-3">
          <Link href="/register" className="btn bg-white px-6 py-3 text-base text-brand-700 hover:bg-white/90">
            {t.finalCta.ctaPrimary}
          </Link>
          <Link href="/login" className="btn border border-white/40 px-6 py-3 text-base text-white hover:bg-white/10">
            {t.finalCta.ctaSecondary}
          </Link>
        </div>
      </div>
    </section>
  );
}

/* ---------------- Footer ---------------- */
function SiteFooter({ t, c }: { t: L; c: C }) {
  const cols = t.footer.columns;
  return (
    <footer className="border-t border-black/5 bg-canvas">
      <div className="mx-auto max-w-6xl px-4 py-12">
        <div className="flex flex-col justify-between gap-8 md:flex-row">
          <div className="max-w-xs">
            <Logo />
            <p className="mt-3 text-sm text-ink/50">
              {t.footer.tagline}
            </p>
          </div>
          <div className="grid grid-cols-2 gap-10 text-sm sm:grid-cols-3">
            <FooterCol title={cols.product.title} links={cols.product.links} />
            <FooterCol title={cols.account.title} links={cols.account.links} />
            <FooterCol title={cols.legal.title} links={cols.legal.links} />
          </div>
        </div>
        <p className="mt-10 text-center text-xs text-ink/40">
          © {new Date().getFullYear()} {c.brand}. {t.footer.rights}
        </p>
      </div>
    </footer>
  );
}

function FooterCol({ title, links }: { title: string; links: readonly string[] }) {
  return (
    <div>
      <p className="font-semibold text-ink">{title}</p>
      <ul className="mt-3 space-y-2 text-ink/50">
        {links.map((l) => (
          <li key={l}>{l}</li>
        ))}
      </ul>
    </div>
  );
}

/* ---------------- Icons ---------------- */
function CheckIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
      <path d="M5 13l4 4L19 7" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
