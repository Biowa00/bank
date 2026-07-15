"use client";

import { useState, useTransition } from "react";
import { setRestriction } from "@/app/[lang]/admin/actions";
import { ToggleSwitch } from "./ToggleSwitch";

type Kind = "ban" | "deposit" | "withdrawal" | "transfer";

type Row = {
  kind: Kind;
  title: string;
  desc: string;
  /** true = état "restrictif" (rouge). deposit est inversé (true = autorisé, vert). */
  danger: boolean;
};

const ROWS: Row[] = [
  { kind: "ban", title: "Bannir l'utilisateur", desc: "Bloque totalement l'accès au compte.", danger: true },
  { kind: "deposit", title: "Autoriser les dépôts", desc: "Nécessaire pour que l'utilisateur puisse déposer.", danger: false },
  { kind: "withdrawal", title: "Bloquer les retraits", desc: "Empêche toute demande de retrait.", danger: true },
  { kind: "transfer", title: "Bloquer les virements", desc: "Empêche l'émission de virements.", danger: true },
];

export function RestrictionToggles({
  userId,
  banned,
  depositAuthorized,
  withdrawalBlocked,
  transferBlocked,
}: {
  userId: string;
  banned: boolean;
  depositAuthorized: boolean;
  withdrawalBlocked: boolean;
  transferBlocked: boolean;
}) {
  const [state, setState] = useState<Record<Kind, boolean>>({
    ban: banned,
    deposit: depositAuthorized,
    withdrawal: withdrawalBlocked,
    transfer: transferBlocked,
  });
  const [pending, start] = useTransition();
  const [busy, setBusy] = useState<Kind | null>(null);
  const [feedback, setFeedback] = useState<{ msg: string; ok: boolean } | null>(null);

  function toggle(kind: Kind, next: boolean) {
    setState((s) => ({ ...s, [kind]: next })); // optimiste
    setBusy(kind);
    start(async () => {
      const fd = new FormData();
      fd.set("user_id", userId);
      fd.set("kind", kind);
      fd.set("value", String(next));
      const res = await setRestriction({}, fd);
      if (res.error) {
        setState((s) => ({ ...s, [kind]: !next })); // rollback
        setFeedback({ msg: res.error, ok: false });
      } else {
        setFeedback({ msg: res.success ?? "Mis à jour.", ok: true });
      }
      setBusy(null);
    });
  }

  return (
    <div className="space-y-3">
      {feedback && (
        <p
          className={`rounded-lg px-3 py-2 text-sm ${
            feedback.ok
              ? "bg-accent-500/10 text-accent-600"
              : "bg-red-50 text-red-700"
          }`}
        >
          {feedback.msg}
        </p>
      )}

      {ROWS.map((r) => {
        const checked = state[r.kind];
        // Couleur : "autoriser les dépôts" est positif (vert quand ON),
        // les autres sont des restrictions (rouge quand ON).
        const tone = r.danger ? "danger" : "accent";
        return (
          <div
            key={r.kind}
            className="flex items-center justify-between gap-4 rounded-2xl border border-black/[.06] px-4 py-3"
          >
            <div className="min-w-0">
              <p className="font-medium text-ink">{r.title}</p>
              <p className="text-xs text-ink/50">{r.desc}</p>
            </div>
            <ToggleSwitch
              label={r.title}
              checked={checked}
              tone={tone}
              disabled={pending && busy === r.kind}
              onChange={(next) => toggle(r.kind, next)}
            />
          </div>
        );
      })}
    </div>
  );
}
