"use client";

import { useState, useEffect } from "react";

interface AccountResult {
  id: string;
  username: string;
  domain: string;
  displayName: string | null;
  avatarUrl: string | null;
  summary: string | null;
  followersCount: number;
  followingCount: number;
  linksCount: number;
  isLocal: boolean;
}

export default function SearchPage() {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<AccountResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const [followState, setFollowState] = useState<Record<string, "idle" | "loading" | "following">>({});

  const token = typeof window !== "undefined" ? localStorage.getItem("fs_token") : null;
  const isAuth = !!token;
  const currentUsername = typeof window !== "undefined" ? localStorage.getItem("fs_username") : "";

  const doSearch = async () => {
    if (!query.trim()) return;
    setLoading(true);
    setSearched(true);
    try {
      const res = await fetch(`/api/v1/accounts/search?q=${encodeURIComponent(query.trim())}`);
      if (!res.ok) return;
      const data: AccountResult[] = await res.json();
      setResults(data);
    } catch { /* ignore */ }
    finally { setLoading(false); }
  };

  const handleFollow = async (targetId: string) => {
    if (!token) return;
    setFollowState((prev) => ({ ...prev, [targetId]: "loading" }));
    try {
      const res = await fetch("/api/follow", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({ targetId }),
      });
      if (res.ok) {
        setFollowState((prev) => ({ ...prev, [targetId]: "following" }));
      }
    } catch { /* ignore */ }
    finally {
      setFollowState((prev) => prev[targetId] === "loading" ? { ...prev, [targetId]: "idle" } : prev);
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
          {isAuth && (
            <a href="/notifications" className="text-sm text-muted hover:text-foreground transition-colors">Notifications</a>
          )}
        </div>
      </nav>

      <main className="max-w-2xl mx-auto px-4 py-12">
        <h1 className="text-2xl font-bold mb-6">Find people</h1>

        <div className="flex gap-3 mb-8">
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && doSearch()}
            placeholder="Search by username..."
            className="flex-1 px-4 py-2.5 rounded-xl bg-secondary border border-border focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-colors"
          />
          <button
            onClick={doSearch}
            disabled={loading || !query.trim()}
            className="px-6 py-2.5 rounded-xl bg-primary text-white font-medium hover:bg-primary-hover transition-colors disabled:opacity-50"
          >
            {loading ? "Searching..." : "Search"}
          </button>
        </div>

        {searched && results.length === 0 && !loading && (
          <div className="text-center py-12 text-muted">No accounts found.</div>
        )}

        <div className="space-y-2">
          {results.map((account) => {
            const isOwn = account.isLocal && account.username === currentUsername;
            return (
              <div key={account.id} className="bg-card border border-border rounded-xl p-4 flex items-center justify-between">
                {account.isLocal ? (
                  <a href={`/users/${account.username}`} className="flex items-center gap-3 min-w-0 flex-1">
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary to-primary/50 flex items-center justify-center text-sm font-bold text-white shrink-0">
                      {(account.displayName || account.username)[0].toUpperCase()}
                    </div>
                    <div className="min-w-0">
                      <p className="font-medium truncate">{account.displayName || account.username}</p>
                      <p className="text-sm text-muted truncate">@{account.username}</p>
                      <p className="text-xs text-muted">{account.followersCount} followers · {account.linksCount} links</p>
                    </div>
                  </a>
                ) : (
                  <div className="flex items-center gap-3 min-w-0 flex-1">
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary to-primary/50 flex items-center justify-center text-sm font-bold text-white shrink-0">
                      {(account.displayName || account.username)[0].toUpperCase()}
                    </div>
                    <div className="min-w-0">
                      <p className="font-medium truncate">{account.displayName || account.username}</p>
                      <p className="text-sm text-muted truncate">@{account.username}@{account.domain}</p>
                      <p className="text-xs text-muted">{account.followersCount} followers</p>
                    </div>
                  </div>
                )}
                {isAuth && !isOwn && (
                  followState[account.id] === "following" ? (
                    <span className="px-4 py-2 rounded-lg bg-secondary text-sm text-muted shrink-0">Following</span>
                  ) : (
                    <button
                      onClick={() => handleFollow(account.id)}
                      disabled={followState[account.id] === "loading"}
                      className="px-4 py-2 rounded-lg bg-primary text-white text-sm font-medium hover:bg-primary-hover transition-colors disabled:opacity-50 shrink-0"
                    >
                      {followState[account.id] === "loading" ? "..." : "Follow"}
                    </button>
                  )
                )}
              </div>
            );
          })}
        </div>
      </main>
    </div>
  );
}
