"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";

type Item = { href: string; label: string; icon: string };

const MAIN: Item[] = [
  { href: "/dashboard", label: "Accueil", icon: "M4 13h6V4H4v9zm0 7h6v-5H4v5zm10 0h6V11h-6v9zm0-16v5h6V4h-6z" },
  { href: "/dashboard/depot", label: "Dépôt", icon: "M12 4v12m0 0l4-4m-4 4l-4-4M4 20h16" },
  { href: "/dashboard/virement", label: "Virement", icon: "M4 12h16m0 0l-5-5m5 5l-5 5" },
  { href: "/dashboard/notifications", label: "Notifs", icon: "M6 8a6 6 0 1112 0c0 7 3 9 3 9H3s3-2 3-9zM9 21a3 3 0 006 0" },
];

const MORE: Item[] = [
  { href: "/dashboard/retrait", label: "Retrait", icon: "M12 20V8m0 0l4 4m-4-4l-4 4M4 4h16" },
  { href: "/dashboard/transactions", label: "Historique", icon: "M4 6h16M4 12h16M4 18h10" },
  { href: "/dashboard/profil", label: "Profil", icon: "M12 12a4 4 0 100-8 4 4 0 000 8zm-7 8a7 7 0 0114 0" },
];

export function MobileBottomNav({ unread }: { unread: number }) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  const isActive = (href: string) =>
    href === "/dashboard" ? pathname === "/dashboard" : pathname.startsWith(href);
  const moreActive = MORE.some((m) => isActive(m.href));

  return (
    <div className="lg:hidden">
      {/* Tiroir "Plus" */}
      {open && (
        <div className="fixed inset-0 z-40" onClick={() => setOpen(false)}>
          <div className="absolute inset-0 bg-black/30 backdrop-blur-[1px]" />
          <div
            className="absolute inset-x-3 bottom-[4.75rem] rounded-2xl border border-black/5 bg-white p-2 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            {MORE.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setOpen(false)}
                className={`flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-medium ${
                  isActive(item.href) ? "bg-brand-50 text-brand-700" : "text-ink/70 hover:bg-black/[.03]"
                }`}
              >
                <Icon d={item.icon} />
                {item.label}
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* Barre fixe en bas */}
      <nav className="fixed inset-x-0 bottom-0 z-50 flex border-t border-black/10 bg-white/95 pb-[env(safe-area-inset-bottom)] backdrop-blur">
        {MAIN.map((item) => {
          const active = isActive(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={() => setOpen(false)}
              className={`relative flex flex-1 flex-col items-center gap-0.5 py-2 text-[11px] font-medium transition-colors ${
                active ? "text-brand-600" : "text-ink/50"
              }`}
            >
              <span className="relative">
                <Icon d={item.icon} />
                {item.href === "/dashboard/notifications" && unread > 0 && (
                  <span className="absolute -right-1.5 -top-1 grid h-4 min-w-4 place-items-center rounded-full bg-brand-600 px-1 text-[9px] font-bold text-white">
                    {unread > 9 ? "9+" : unread}
                  </span>
                )}
              </span>
              {item.label}
            </Link>
          );
        })}

        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          aria-label="Plus d'options"
          className={`flex flex-1 flex-col items-center gap-0.5 py-2 text-[11px] font-medium transition-colors ${
            open || moreActive ? "text-brand-600" : "text-ink/50"
          }`}
        >
          <Icon d="M4 6h16M4 12h16M4 18h16" />
          Plus
        </button>
      </nav>
    </div>
  );
}

function Icon({ d }: { d: string }) {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
      <path d={d} stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
