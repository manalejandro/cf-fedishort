"use client";

import { useState, useEffect } from "react";

interface Link {
  id: string;
  slug: string;
  url: string;
  title: string | null;
  description: string | null;
  clicks: number;
  published: string;
}

export default function LinksPage() {
  const [links, setLinks] = useState<Link[]>([]);
  const [loading, setLoading] = useState(true);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  useEffect(() => {
    const token = localStorage.getItem("fs_token");
    if (!token) { window.location.href = "/"; return; }
    fetch("/api/links", {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((r) => r.json())
      .then((data) => { if (Array.isArray(data)) setLinks(data); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const handleCopy = (slug: string, id: string) => {
    navigator.clipboard.writeText(`${window.location.origin}/l/${slug}`);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  return (
    <div className="min-h-screen bg-background text-foreground">
      <nav className="border-b border-border">
        <div className="max-w-4xl mx-auto px-4 h-16 flex items-center justify-between">
          <a href="/" className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center text-white font-bold text-sm">F</div>
            <span className="font-semibold">FediShort</span>
          </a>
          <a href="/" className="px-4 py-2 rounded-lg bg-primary text-white text-sm font-medium hover:bg-primary-hover transition-colors">New Link</a>
        </div>
      </nav>

      <main className="max-w-4xl mx-auto px-4 py-12">
        <h1 className="text-3xl font-bold mb-8">My Links</h1>
        {loading ? (
          <div className="text-center text-muted py-12">Loading...</div>
        ) : links.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-muted mb-4">No links yet.</p>
            <a href="/" className="px-6 py-2.5 rounded-xl bg-primary text-white font-medium hover:bg-primary-hover transition-colors">Create your first link</a>
          </div>
        ) : (
          <div className="space-y-3">
            {links.map((link) => (
              <div key={link.id} className="bg-card border border-border rounded-xl p-5 hover:bg-card-hover transition-colors">
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0 flex-1">
                    <p className="font-medium truncate">{link.title || link.url}</p>
                    <p className="text-primary font-mono text-sm mt-1">{window.location.origin}/l/{link.slug}</p>
                    <p className="text-xs text-muted mt-1 truncate">{link.url}</p>
                    <p className="text-xs text-muted mt-1">{new Date(link.published).toLocaleDateString()} · {link.clicks} clicks</p>
                  </div>
                  <button
                    onClick={() => handleCopy(link.slug, link.id)}
                    className="px-4 py-2 rounded-lg bg-secondary text-sm text-muted hover:text-foreground transition-colors shrink-0"
                  >
                    {copiedId === link.id ? "Copied!" : "Copy"}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
