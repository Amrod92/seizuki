"use client";

import { AuthPageGuard } from "@/components/auth-page-guard";
import { SiteShell } from "@/components/site-shell";
import { useAuth } from "@/components/auth-provider";
import { getNotifications, markAllNotificationsRead } from "@/lib/api";
import { timeAgo } from "@/lib/format";
import { useState } from "react";

export default function NotificationsPage() {
  const { user } = useAuth();
  const [, setRefresh] = useState(0);

  const notifications = user ? getNotifications(user._id) : [];

  return (
    <SiteShell>
      <AuthPageGuard>
        <section className="mx-auto w-full max-w-3xl space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h1 className="type-h1 text-rice">Notifications</h1>
            <button
              type="button"
              onClick={() => {
                markAllNotificationsRead(user?._id ?? "");
                setRefresh((prev) => prev + 1);
              }}
              className="type-small rounded-xl border border-border-subtle px-3 py-2 text-rice"
            >
              Mark all as read
            </button>
          </div>

          <div className="space-y-3">
            {notifications.length === 0 ? (
              <p className="type-small text-muted-foreground">No notifications yet.</p>
            ) : null}

            {notifications.map((item) => (
              <article key={item._id} className="ink-panel rounded-2xl p-4">
                <div className="flex items-center justify-between gap-3">
                  <p className="type-small text-sakura">{item.type}</p>
                  <span className="type-micro text-muted-dark">{timeAgo(item.createdAt)}</span>
                </div>
                <p className="type-body mt-2 text-rice">{String(item.payload.message ?? "Activity update")}</p>
                <p className="type-micro mt-1 text-muted-foreground">{item.isRead ? "Read" : "Unread"}</p>
              </article>
            ))}
          </div>
        </section>
      </AuthPageGuard>
    </SiteShell>
  );
}
