import { getCloudflareContext } from "@/lib/cf";
import { getActorByUsername, getShortLinksByActor, getFollowers, getFollowing, getFollow } from "@/lib/db";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import FollowButton from "@/components/FollowButton";

export const dynamic = "force-dynamic";

export async function generateMetadata(
  { params }: { params: Promise<{ username: string }> }
): Promise<Metadata> {
  try {
    const { env } = getCloudflareContext();
    const { username } = await params;
    const domain = new URL(env.INSTANCE_URL || "https://fedishort.com").hostname;
    const actor = await getActorByUsername(env.DB, username, domain);
    if (!actor) return { title: "Not Found" };
    return {
      title: `${actor.displayName || actor.username} — FediShort`,
      description: actor.summary || `Short links by ${actor.username}`,
    };
  } catch {
    return { title: "FediShort" };
  }
}

export default async function UserPage(
  { params }: { params: Promise<{ username: string }> }
) {
  const { env } = getCloudflareContext();
  const { username } = await params;
  const domain = new URL(env.INSTANCE_URL || "https://fedishort.com").hostname;
  const actor = await getActorByUsername(env.DB, username, domain);
  if (!actor || !actor.isLocal) notFound();

  const links = await getShortLinksByActor(env.DB, actor.id);
  const followers = await getFollowers(env.DB, actor.id);
  const following = await getFollowing(env.DB, actor.id);

  return (
    <div className="min-h-screen bg-background text-foreground">
      <nav className="border-b border-border">
        <div className="max-w-4xl mx-auto px-4 h-16 flex items-center justify-between">
          <a href="/" className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center text-white font-bold text-sm">F</div>
            <span className="font-semibold">FediShort</span>
          </a>
          <div className="flex items-center gap-3">
            <a href="/search" className="text-sm text-muted hover:text-foreground transition-colors">Find people</a>
            <a href="/notifications" className="text-sm text-muted hover:text-foreground transition-colors">Notifications</a>
          </div>
        </div>
      </nav>

      <main className="max-w-4xl mx-auto px-4 py-12">
        <div className="bg-card border border-border rounded-2xl p-8 mb-8">
          <div className="flex items-center gap-6">
            <div className="w-20 h-20 rounded-full bg-gradient-to-br from-primary to-primary/50 flex items-center justify-center text-3xl font-bold text-white">
              {(actor.displayName || actor.username)[0].toUpperCase()}
            </div>
            <div className="flex-1">
              <div className="flex items-start justify-between">
                <div>
                  <h1 className="text-2xl font-bold">{actor.displayName || actor.username}</h1>
                  <p className="text-muted">@{actor.username}@{domain}</p>
                  {actor.summary && <p className="text-muted mt-2 max-w-lg">{actor.summary}</p>}
                </div>
                <FollowButton targetActorId={actor.id} initialFollowing={false} />
              </div>
              <div className="flex items-center gap-6 mt-4 text-sm text-muted">
                <span><strong className="text-foreground">{links.length}</strong> links</span>
                <span><strong className="text-foreground">{followers.length}</strong> followers</span>
                <span><strong className="text-foreground">{following.length}</strong> following</span>
              </div>
            </div>
          </div>
        </div>

        {links.length === 0 ? (
          <div className="text-center py-12 text-muted">No links yet.</div>
        ) : (
          <div className="space-y-3">
            {links.map((link) => (
              <div key={link.id} className="bg-card border border-border rounded-xl p-5 hover:bg-card-hover transition-colors">
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0 flex-1">
                    <p className="font-medium truncate">{link.title || link.url}</p>
                    <p className="text-primary font-mono text-sm mt-1">{`https://${domain}/l/${link.slug}`}</p>
                    <p className="text-xs text-muted mt-1 truncate">{link.url}</p>
                    <p className="text-xs text-muted mt-1">{new Date(link.published).toLocaleDateString()} · {link.clicks} clicks</p>
                  </div>
                  <a href={`/l/${link.slug}`} className="px-4 py-2 rounded-lg bg-secondary text-sm text-muted hover:text-foreground transition-colors shrink-0">Visit</a>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
