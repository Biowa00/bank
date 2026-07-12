import Link from "next/link";
import { Logo } from "@/components/Logo";
import { Reveal } from "@/components/Reveal";

export default function LandingPage() {
  return (
    <div className="flex min-h-screen flex-col bg-canvas">
      <SiteNav />
      <main className="flex-1">
        <Hero />
        <LogoStrip />
        <Reveal><Features /></Reveal>
        <Reveal><AccountShowcase /></Reveal>
        <Reveal><Steps /></Reveal>
        <Reveal><Security /></Reveal>
        <Reveal><Stats /></Reveal>
        <Reveal><Testimonials /></Reveal>
        <Reveal><FinalCta /></Reveal>
      </main>
      <SiteFooter />
    </div>
  );
}

/* ---------------- Navigation ---------------- */
function SiteNav() {
  return (
    <header className="sticky top-0 z-30 border-b border-black/5 bg-canvas/80 backdrop-blur">
      <nav className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3.5">
        <Logo />
        <div className="hidden items-center gap-8 text-sm font-medium text-ink/70 md:flex">
          <a href="#fonctionnalites" className="hover:text-ink">Fonctionnalités</a>
          <a href="#securite" className="hover:text-ink">Sécurité</a>
          <a href="#etapes" className="hover:text-ink">Comment ça marche</a>
        </div>
        <div className="flex items-center gap-2">
          <Link href="/login" className="btn-ghost">Se connecter</Link>
          <Link href="/register" className="btn-primary">Créer un compte</Link>
        </div>
      </nav>
    </header>
  );
}

/* ---------------- Hero ---------------- */
function Hero() {
  return (
    <section className="relative overflow-hidden">
      <div className="mx-auto grid max-w-6xl items-center gap-12 px-4 py-20 md:grid-cols-2 md:py-28">
        <div>
          <span className="badge bg-brand-100 text-brand-700">
            <span className="h-1.5 w-1.5 rounded-full bg-brand-500" />
            Néobanque nouvelle génération
          </span>
          <h1 className="mt-5 text-4xl font-bold leading-[1.05] tracking-tight text-ink sm:text-5xl md:text-6xl">
            La banque qui met votre argent{" "}
            <span className="bg-gradient-to-r from-brand-600 to-accent-500 bg-clip-text text-transparent">
              en mouvement
            </span>
          </h1>
          <p className="mt-6 max-w-md text-lg text-ink/60">
            Ouvrez un compte en 2 minutes, obtenez votre IBAN, effectuez dépôts
            et virements, et suivez toute votre activité en temps réel.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link href="/register" className="btn-primary px-6 py-3 text-base">
              Créer un compte gratuit
            </Link>
            <Link href="/login" className="btn-outline px-6 py-3 text-base">
              Se connecter
            </Link>
          </div>
          <p className="mt-4 flex items-center gap-2 text-sm text-ink/50">
            <CheckIcon /> Ouverture gratuite · Sans engagement
          </p>
        </div>
        <HeroCard />
      </div>
      <div className="pointer-events-none absolute -right-40 -top-40 h-96 w-96 rounded-full bg-brand-400/20 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-40 -left-40 h-96 w-96 rounded-full bg-accent-400/20 blur-3xl" />
    </section>
  );
}

function HeroCard() {
  return (
    <div className="relative mx-auto w-full max-w-sm animate-floaty">
      <div className="absolute inset-0 -rotate-6 rounded-[2rem] bg-gradient-to-br from-brand-500 to-accent-500 opacity-20 blur-xl" />
      <div className="relative overflow-hidden rounded-[2rem] bg-gradient-to-br from-ink to-ink-soft p-7 text-white shadow-2xl">
        <div className="flex items-center justify-between">
          <Logo variant="light" href={null} />
          <span className="text-xs text-white/50">Premium</span>
        </div>
        <div className="mt-10">
          <p className="text-sm text-white/50">Solde disponible</p>
          <p className="mt-1 text-4xl font-bold tracking-tight">4 250,00 €</p>
        </div>
        <div className="mt-8 font-mono text-sm tracking-widest text-white/80">
          FR76 3000 4021 8850 0100
        </div>
        <div className="mt-2 flex items-center justify-between text-xs text-white/50">
          <span>NÉBULA</span>
          <span>Compte courant</span>
        </div>
      </div>
    </div>
  );
}

/* ---------------- Logo strip ---------------- */
function LogoStrip() {
  return (
    <div className="border-y border-black/5 bg-white/50">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-center gap-x-10 gap-y-2 px-4 py-6 text-sm font-medium text-ink/40">
        <span>Virements SEPA</span>
        <span>·</span>
        <span>IBAN instantané</span>
        <span>·</span>
        <span>Notifications en temps réel</span>
        <span>·</span>
        <span>Historique complet</span>
      </div>
    </div>
  );
}

/* ---------------- Features ---------------- */
const features = [
  {
    title: "Virements instantanés",
    desc: "Envoyez de l'argent vers n'importe quel IBAN, en interne ou à l'extérieur, avec un historique complet.",
    icon: (
      <path d="M4 12h16m0 0l-5-5m5 5l-5 5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    ),
  },
  {
    title: "Carte & IBAN",
    desc: "Un IBAN vous est attribué automatiquement à l'ouverture de votre compte, prêt à recevoir et envoyer.",
    icon: (
      <>
        <rect x="3" y="5" width="18" height="14" rx="2" stroke="currentColor" strokeWidth="2" />
        <path d="M3 10h18" stroke="currentColor" strokeWidth="2" />
      </>
    ),
  },
  {
    title: "Notifications",
    desc: "Chaque dépôt, virement ou changement sur votre compte génère une notification instantanée.",
    icon: (
      <path d="M6 8a6 6 0 1112 0c0 7 3 9 3 9H3s3-2 3-9zM9 21a3 3 0 006 0" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    ),
  },
  {
    title: "Dépôts en un clic",
    desc: "Alimentez votre compte en quelques secondes et suivez votre solde évoluer en temps réel.",
    icon: (
      <path d="M12 3v12m0 0l4-4m-4 4l-4-4M4 21h16" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    ),
  },
];

function Features() {
  return (
    <section id="fonctionnalites" className="mx-auto max-w-6xl px-4 py-20">
      <div className="max-w-2xl">
        <h2 className="text-3xl font-bold tracking-tight text-ink sm:text-4xl">
          Tout ce qu&apos;une banque moderne doit faire
        </h2>
        <p className="mt-4 text-lg text-ink/60">
          Une expérience fluide et complète, pensée pour votre quotidien.
        </p>
      </div>
      <div className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
        {features.map((f) => (
          <div key={f.title} className="card p-6">
            <span className="grid h-11 w-11 place-items-center rounded-xl bg-brand-50 text-brand-600">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none">{f.icon}</svg>
            </span>
            <h3 className="mt-4 font-semibold text-ink">{f.title}</h3>
            <p className="mt-2 text-sm text-ink/60">{f.desc}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

/* ---------------- Account showcase ---------------- */
function AccountShowcase() {
  return (
    <section className="bg-white py-20">
      <div className="mx-auto grid max-w-6xl items-center gap-12 px-4 md:grid-cols-2">
        <div>
          <span className="badge bg-accent-500/10 text-accent-600">Tableau de bord</span>
          <h2 className="mt-4 text-3xl font-bold tracking-tight text-ink sm:text-4xl">
            Pilotez votre compte en un coup d&apos;œil
          </h2>
          <p className="mt-4 text-lg text-ink/60">
            Solde en temps réel, historique filtrable, dépôts, virements et
            retraits — tout est réuni dans un espace clair et responsive.
          </p>
          <ul className="mt-6 space-y-3">
            {["Solde mis à jour instantanément", "Historique filtrable par type et statut", "Retraits sécurisés par code de validation"].map((t) => (
              <li key={t} className="flex items-center gap-3 text-ink/80">
                <span className="grid h-6 w-6 place-items-center rounded-full bg-accent-500/15 text-accent-600">
                  <CheckIcon />
                </span>
                {t}
              </li>
            ))}
          </ul>
        </div>
        <div className="card overflow-hidden p-0">
          <div className="border-b border-black/5 bg-canvas px-6 py-4">
            <p className="text-sm text-ink/50">Solde disponible</p>
            <p className="text-3xl font-bold text-ink">4 250,00 €</p>
          </div>
          <div className="divide-y divide-black/5">
            {[
              { l: "Dépôt", d: "Aujourd'hui", a: "+ 1 200,00 €", up: true },
              { l: "Virement — FR76…4021", d: "Hier", a: "− 350,00 €", up: false },
              { l: "Dépôt", d: "12 juil.", a: "+ 900,00 €", up: true },
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
const steps = [
  { n: "1", t: "Créez votre compte", d: "Inscription en 2 minutes avec un e-mail. Votre IBAN est généré automatiquement." },
  { n: "2", t: "Alimentez votre solde", d: "Ajoutez des fonds en un clic depuis votre tableau de bord." },
  { n: "3", t: "Envoyez & suivez", d: "Effectuez virements et retraits, recevez des notifications, consultez l'historique." },
];

function Steps() {
  return (
    <section id="etapes" className="mx-auto max-w-6xl px-4 py-20">
      <h2 className="text-center text-3xl font-bold tracking-tight text-ink sm:text-4xl">
        Trois étapes, et c&apos;est parti
      </h2>
      <div className="mt-12 grid gap-6 md:grid-cols-3">
        {steps.map((s) => (
          <div key={s.n} className="card p-7">
            <span className="grid h-12 w-12 place-items-center rounded-full bg-ink text-lg font-bold text-white">
              {s.n}
            </span>
            <h3 className="mt-5 text-lg font-semibold text-ink">{s.t}</h3>
            <p className="mt-2 text-ink/60">{s.d}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

/* ---------------- Security ---------------- */
function Security() {
  return (
    <section id="securite" className="bg-ink py-20 text-white">
      <div className="mx-auto grid max-w-6xl items-center gap-12 px-4 md:grid-cols-2">
        <div>
          <span className="badge bg-white/10 text-white/80">Sécurité</span>
          <h2 className="mt-4 text-3xl font-bold tracking-tight sm:text-4xl">
            Vos données, entre de bonnes mains
          </h2>
          <p className="mt-4 text-lg text-white/60">
            Authentification chiffrée, sessions sécurisées et contrôle d&apos;accès
            par rôle protègent votre compte à chaque instant.
          </p>
          <div className="mt-8 grid grid-cols-2 gap-4">
            {[
              ["Chiffrement des sessions", "Jetons signés & cookies httpOnly"],
              ["Contrôle par rôle", "Espaces client et admin séparés"],
              ["Journal d'audit", "Chaque action sensible est tracée"],
              ["Données protégées", "Confidentialité par défaut"],
            ].map(([t, d]) => (
              <div key={t} className="rounded-2xl border border-white/10 bg-white/5 p-4">
                <p className="font-semibold">{t}</p>
                <p className="mt-1 text-sm text-white/50">{d}</p>
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
function Stats() {
  return (
    <section className="mx-auto max-w-6xl px-4 py-16">
      <div className="grid gap-6 rounded-[var(--radius-xl2)] border border-black/5 bg-white p-8 text-center sm:grid-cols-3">
        {[
          ["10 000+", "comptes ouverts"],
          ["4,9/5", "note de satisfaction"],
          ["100%", "gratuit et sécurisé"],
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
const quotes = [
  { q: "Enfin une banque en ligne simple et rapide, sans paperasse inutile.", a: "Sarah M." },
  { q: "L'interface est claire et fluide, exactement ce qu'il me faut au quotidien.", a: "Karim B." },
  { q: "Les virements et l'historique sont un vrai plaisir à utiliser.", a: "Léa D." },
];

function Testimonials() {
  return (
    <section className="bg-white py-20">
      <div className="mx-auto max-w-6xl px-4">
        <h2 className="text-center text-3xl font-bold tracking-tight text-ink sm:text-4xl">
          Ils nous font confiance
        </h2>
        <div className="mt-12 grid gap-6 md:grid-cols-3">
          {quotes.map((t) => (
            <figure key={t.a} className="card p-7">
              <div className="text-accent-500">★★★★★</div>
              <blockquote className="mt-3 text-ink/80">“{t.q}”</blockquote>
              <figcaption className="mt-4 text-sm font-medium text-ink/50">— {t.a}</figcaption>
            </figure>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ---------------- Final CTA ---------------- */
function FinalCta() {
  return (
    <section className="mx-auto max-w-6xl px-4 py-20">
      <div className="relative overflow-hidden rounded-[2rem] bg-gradient-to-br from-brand-600 to-accent-500 px-8 py-16 text-center text-white">
        <h2 className="mx-auto max-w-2xl text-3xl font-bold tracking-tight sm:text-4xl">
          Prêt à ouvrir votre compte ?
        </h2>
        <p className="mx-auto mt-4 max-w-md text-white/80">
          Créez votre compte en 2 minutes. Gratuit et sans engagement.
        </p>
        <div className="mt-8 flex justify-center gap-3">
          <Link href="/register" className="btn bg-white px-6 py-3 text-base text-brand-700 hover:bg-white/90">
            Créer un compte
          </Link>
          <Link href="/login" className="btn border border-white/40 px-6 py-3 text-base text-white hover:bg-white/10">
            Se connecter
          </Link>
        </div>
      </div>
    </section>
  );
}

/* ---------------- Footer ---------------- */
function SiteFooter() {
  return (
    <footer className="border-t border-black/5 bg-canvas">
      <div className="mx-auto max-w-6xl px-4 py-12">
        <div className="flex flex-col justify-between gap-8 md:flex-row">
          <div className="max-w-xs">
            <Logo />
            <p className="mt-3 text-sm text-ink/50">
              Néobanque nouvelle génération. Simple, rapide, sécurisée.
            </p>
          </div>
          <div className="grid grid-cols-2 gap-10 text-sm sm:grid-cols-3">
            <FooterCol title="Produit" links={["Fonctionnalités", "Sécurité", "Tableau de bord"]} />
            <FooterCol title="Compte" links={["Créer un compte", "Se connecter"]} />
            <FooterCol title="Légal" links={["Mentions légales", "Confidentialité"]} />
          </div>
        </div>
        <p className="mt-10 text-center text-xs text-ink/40">
          © {new Date().getFullYear()} Nébula. Tous droits réservés.
        </p>
      </div>
    </footer>
  );
}

function FooterCol({ title, links }: { title: string; links: string[] }) {
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
