"use client";

import { useState, useEffect } from "react";

export default function FollowButton({ targetActorId, initialFollowing }: { targetActorId: string; initialFollowing: boolean }) {
  const [following, setFollowing] = useState(initialFollowing);
  const [loading, setLoading] = useState(false);
  // localStorage is only read after mount: reading it during render makes the
  // client's first render diverge from the server HTML (hydration mismatch).
  const [token, setToken] = useState<string | null>(null);
  const [currentUsername, setCurrentUsername] = useState<string | null>(null);

  useEffect(() => {
    const t = localStorage.getItem("fs_token");
    // eslint-disable-next-line react-hooks/set-state-in-effect -- localStorage is browser-only; defer the read until after hydration
    setToken(t);
    setCurrentUsername(localStorage.getItem("fs_username"));
    if (!t) return;
    // Ask the API for the real follow state (the server page cannot know it).
    let cancelled = false;
    fetch(`/api/follow?targetId=${encodeURIComponent(targetActorId)}`, {
      headers: { Authorization: `Bearer ${t}` },
    })
      .then((r) => r.json())
      .then((data: unknown) => {
        if (!cancelled) setFollowing(Boolean((data as { following?: boolean }).following));
      })
      .catch(() => {});
    return () => { cancelled = true; };
  }, [targetActorId]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- sync the server-provided state when the parent updates the prop
    setFollowing(initialFollowing);
  }, [initialFollowing]);

  const isOwnProfile = currentUsername !== null && targetActorId.split("/users/")[1] === currentUsername;

  const handleClick = async () => {
    if (!token || loading) return;
    setLoading(true);
    try {
      const endpoint = following ? "/api/unfollow" : "/api/follow";
      const res = await fetch(endpoint, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({ targetId: targetActorId }),
      });
      if (res.ok) {
        // The API answers with the authoritative state (a remote follow stays
        // "pending" → following:false even though the request succeeded).
        const data = (await res.json().catch(() => null)) as { following?: boolean } | null;
        setFollowing(typeof data?.following === "boolean" ? data.following : !following);
      }
    } catch { /* ignore */ }
    finally { setLoading(false); }
  };

  if (!token || isOwnProfile) return null;

  return (
    <button
      onClick={handleClick}
      disabled={loading}
      className={`px-6 py-2.5 rounded-xl font-medium transition-colors disabled:opacity-50 ${
        following
          ? "bg-secondary text-muted hover:bg-red-500/10 hover:text-red-500 border border-border hover:border-red-500/30"
          : "bg-primary text-white hover:bg-primary-hover"
      }`}
    >
      {loading ? "..." : following ? "Following" : "Follow"}
    </button>
  );
}
