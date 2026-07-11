"use client";

import { useState, useEffect } from "react";

export default function FollowButton({ targetActorId, initialFollowing }: { targetActorId: string; initialFollowing: boolean }) {
  const [following, setFollowing] = useState(initialFollowing);
  const [loading, setLoading] = useState(false);

  const token = typeof window !== "undefined" ? localStorage.getItem("fs_token") : null;
  const currentUsername = typeof window !== "undefined" ? localStorage.getItem("fs_username") : null;
  const isOwnProfile = targetActorId.split("/users/")[1] === currentUsername;

  useEffect(() => {
    setFollowing(initialFollowing);
  }, [initialFollowing]);

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
      if (res.ok) setFollowing(!following);
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
