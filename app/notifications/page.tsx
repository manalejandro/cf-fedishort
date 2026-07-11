"use client";

import { useState, useEffect } from "react";

interface EnrichedNotification {
  id: string;
  type: string;
  accountId: string;
  targetAccountId: string;
  objectId: string | null;
  read: boolean;
  createdAt: string;
  actor: {
    id: string;
    username: string;
    domain: string;
    displayName: string | null;
    avatarUrl: string | null;
  } | null;
}

export default function NotificationsPage() {
  const [notifs, setNotifs] = useState<EnrichedNotification[]>([]);
  const [loading, setLoading] = useState(true);

  const token = typeof window !== "undefined" ? localStorage.getItem("fs_token") : null;

  useEffect(() => {
    if (!token) { setLoading(false); return; }
    fetch("/api/notifications", {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((r) => r.json())
      .then((data: unknown) => setNotifs(data as EnrichedNotification[]))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [token]);

  const markRead = async (id: string) => {
    if (!token) return;
    await fetch(`/api/notifications/${id}/read`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
    });
    setNotifs((prev) => prev.map((n) => n.id === id ? { ...n, read: true } : n));
  };

  const typeLabel = (type: string) => {
    switch (type) {
      case "follow": return "followed you";
      case "follow_accept": return "accepted your follow request";
      case "follow_reject": return "rejected your follow request";
      default: return type;
    }
  };

  return (
    <div className="min-h-screen bg-background text-foreground">
      <nav className="border-b border-border">
        <div className="max-w-2xl mx-auto px-4 h-16 flex items-center justify-between">
          <a href="/" className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center text-white font-bold text-sm">F</div>
            <span className="font-semibold">FediShort</span>
          </a>
          <a href="/search" className="text-sm text-muted hover:text-foreground transition-colors">Find people</a>
        </div>
      </nav>

      <main className="max-w-2xl mx-auto px-4 py-12">
        <h1 className="text-2xl font-bold mb-6">Notifications</h1>

        {!token && (
          <div className="text-center py-12 text-muted">Sign in to see your notifications.</div>
        )}
        {loading && token && (
          <div className="text-center py-12 text-muted">Loading...</div>
        )}
        {!loading && token && notifs.length === 0 && (
          <div className="text-center py-12 text-muted">No notifications yet.</div>
        )}

        <div className="space-y-2">
          {notifs.map((n) => (
            <div
              key={n.id}
              onClick={() => !n.read && markRead(n.id)}
              className={`bg-card border border-border rounded-xl p-4 flex items-center gap-3 cursor-pointer transition-colors ${n.read ? "" : "border-primary/30 bg-primary/5"}`}
            >
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary to-primary/50 flex items-center justify-center text-sm font-bold text-white shrink-0">
                {(n.actor?.displayName || n.actor?.username || "?")[0].toUpperCase()}
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm">
                  <span className="font-medium">{n.actor?.displayName || n.actor?.username || "Someone"}</span>
                  {" "}{typeLabel(n.type)}
                </p>
                <p className="text-xs text-muted">{new Date(n.createdAt).toLocaleDateString()}</p>
              </div>
              {!n.read && <div className="w-2 h-2 rounded-full bg-primary shrink-0" />}
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}
