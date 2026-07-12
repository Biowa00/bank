import { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/dashboard/PageHeader";
import { markAllNotificationsRead } from "@/app/dashboard/actions";
import { formatDate } from "@/lib/format";
import type { Notification } from "@/lib/types";

export default async function NotificationsPage() {
  const { userId } = await requireUser();
  const supabase = await createClient();
  const { data: notifs } = await supabase
    .from("notifications")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(100)
    .returns<Notification[]>();

  const hasUnread = (notifs ?? []).some((n) => !n.read);

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <PageHeader title="Notifications" subtitle="Tous les événements de votre compte." />
        {hasUnread && (
          <form action={markAllNotificationsRead}>
            <button type="submit" className="btn-outline text-sm">Tout marquer comme lu</button>
          </form>
        )}
      </div>

      <div className="card divide-y divide-black/5 p-2">
        {notifs && notifs.length > 0 ? (
          notifs.map((n) => (
            <div key={n.id} className="flex gap-3 px-4 py-4">
              <span className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${n.read ? "bg-transparent" : "bg-brand-600"}`} />
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between gap-3">
                  <p className={`truncate ${n.read ? "font-medium text-ink/70" : "font-semibold text-ink"}`}>
                    {n.title}
                  </p>
                  <span className="shrink-0 text-xs text-ink/40">{formatDate(n.created_at)}</span>
                </div>
                {n.body && <p className="mt-0.5 text-sm text-ink/60">{n.body}</p>}
              </div>
            </div>
          ))
        ) : (
          <p className="py-10 text-center text-sm text-ink/50">Aucune notification.</p>
        )}
      </div>
    </div>
  );
}
