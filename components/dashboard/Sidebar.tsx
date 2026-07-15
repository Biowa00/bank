"use client";

import {
  LocaleLink as Link,
  useLogicalPathname,
} from "@/components/i18n/navigation";
import { Logo } from "@/components/Logo";

const links = [
  { href: "/dashboard", label: "Vue d'ensemble", icon: "M4 13h6V4H4v9zm0 7h6v-5H4v5zm10 0h6V11h-6v9zm0-16v5h6V4h-6z" },
  { href: "/dashboard/depot", label: "Dépôt", icon: "M12 4v12m0 0l4-4m-4 4l-4-4M4 20h16" },
  { href: "/dashboard/virement", label: "Virement", icon: "M4 12h16m0 0l-5-5m5 5l-5 5" },
  { href: "/dashboard/retrait", label: "Retrait", icon: "M12 20V8m0 0l4 4m-4-4l-4 4M4 4h16" },
  { href: "/dashboard/transactions", label: "Historique", icon: "M4 6h16M4 12h16M4 18h10" },
  { href: "/dashboard/notifications", label: "Notifications", icon: "M6 8a6 6 0 1112 0c0 7 3 9 3 9H3s3-2 3-9zM9 21a3 3 0 006 0" },
  { href: "/dashboard/profil", label: "Profil", icon: "M12 12a4 4 0 100-8 4 4 0 000 8zm-7 8a7 7 0 0114 0" },
];

export function Sidebar({ unread }: { unread: number }) {
  const pathname = useLogicalPathname();
  return (
    <nav className="flex flex-col gap-1">
      <div className="mb-6 px-3">
        <Logo />
      </div>
      {links.map((l) => {
        const active =
          l.href === "/dashboard"
            ? pathname === "/dashboard"
            : pathname.startsWith(l.href);
        return (
          <Link
            key={l.href}
            href={l.href}
            className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors ${
              active ? "bg-brand-50 text-brand-700" : "text-ink/60 hover:bg-black/[.03] hover:text-ink"
            }`}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
              <path d={l.icon} stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            {l.label}
            {l.href === "/dashboard/notifications" && unread > 0 && (
              <span className="ml-auto grid h-5 min-w-5 place-items-center rounded-full bg-brand-600 px-1.5 text-xs font-semibold text-white">
                {unread}
              </span>
            )}
          </Link>
        );
      })}
    </nav>
  );
}
