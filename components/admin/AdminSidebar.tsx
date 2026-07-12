"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const links = [
  { href: "/admin", label: "Tableau de bord", icon: "M4 13h6V4H4v9zm0 7h6v-5H4v5zm10 0h6V11h-6v9zm0-16v5h6V4h-6z" },
  { href: "/admin/users", label: "Utilisateurs", icon: "M12 12a4 4 0 100-8 4 4 0 000 8zm-7 8a7 7 0 0114 0" },
  { href: "/admin/virements", label: "Virements à valider", icon: "M4 12h16m0 0l-5-5m5 5l-5 5" },
  { href: "/admin/codes", label: "Codes de retrait", icon: "M12 2l7 4v6c0 5-3 8-7 10-4-2-7-5-7-10V6l7-4z" },
  { href: "/admin/audit", label: "Journal d'audit", icon: "M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" },
];

export function AdminSidebar() {
  const pathname = usePathname();
  return (
    <nav className="flex flex-col gap-1">
      {links.map((l) => {
        const active =
          l.href === "/admin" ? pathname === "/admin" : pathname.startsWith(l.href);
        return (
          <Link
            key={l.href}
            href={l.href}
            className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors ${
              active ? "bg-white/10 text-white" : "text-white/50 hover:bg-white/5 hover:text-white"
            }`}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
              <path d={l.icon} stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            {l.label}
          </Link>
        );
      })}
    </nav>
  );
}
