"use client";

import { useEffect, useRef } from "react";
import { signOutInactive } from "@/app/[lang]/(auth)/actions";

/**
 * Déconnecte automatiquement l'utilisateur après une période d'INACTIVITÉ
 * (aucun mouvement souris/clavier, clic, défilement, ni retour d'onglet) —
 * y compris onglet laissé en arrière-plan. Aucun avertissement préalable.
 * Monté dans les layouts client ET admin.
 */
export function IdleLogout({ timeoutMs = 5 * 60 * 1000 }: { timeoutMs?: number }) {
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const fired = useRef(false);

  useEffect(() => {
    const logout = () => {
      if (fired.current) return;
      fired.current = true;
      // Server action : invalide la session (cookies) puis redirige vers /login.
      void signOutInactive().catch(() => {});
    };

    const reset = () => {
      if (fired.current) return;
      if (timer.current) clearTimeout(timer.current);
      timer.current = setTimeout(logout, timeoutMs);
    };

    const events = ["mousemove", "mousedown", "keydown", "click", "scroll", "wheel", "touchstart"];
    events.forEach((e) => window.addEventListener(e, reset, { passive: true }));
    // Le retour sur l'onglet compte comme une activité ; un onglet caché laisse
    // le minuteur courir (setTimeout continue en arrière-plan).
    document.addEventListener("visibilitychange", reset);

    reset();
    return () => {
      if (timer.current) clearTimeout(timer.current);
      events.forEach((e) => window.removeEventListener(e, reset));
      document.removeEventListener("visibilitychange", reset);
    };
  }, [timeoutMs]);

  return null;
}
