"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { SiteShell } from "@/components/site-shell";
import { useAuth } from "@/components/auth-provider";
import {
  followCreator,
  getCreatorProfile,
  isFollowingCreator,
  unfollowCreator,
} from "@/lib/api";
import { compactNumber } from "@/lib/format";

export default function CreatorPage() {
  const params = useParams<{ creatorId: string }>();
  const { user, isAuthenticated } = useAuth();

  const profile = getCreatorProfile(params.creatorId);

  if (!profile) {
    return (
      <SiteShell>
        <p className="type-body text-muted-foreground">Creator not found.</p>
      </SiteShell>
    );
  }

  const following = isFollowingCreator(user?._id, profile.user._id);

  return (
    <SiteShell>
      <section className="space-y-4">
        <article className="ink-panel rounded-2xl p-5">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="flex items-start gap-3">
              <img
                src={profile.user.avatarUrl}
                alt={profile.user.username}
                className="h-16 w-16 rounded-full object-cover"
              />
              <div>
                <h1 className="type-h2 text-rice">@{profile.user.username}</h1>
                <p className="type-small mt-1 text-muted-foreground">{profile.user.bio ?? "Independent creator"}</p>
                <div className="type-small mt-3 flex flex-wrap gap-3 text-muted-dark">
                  <span>{compactNumber(profile.followerCount)} followers</span>
                  <span>{compactNumber(profile.stats.reads)} reads</span>
                  <span>{compactNumber(profile.stats.comments)} comments</span>
                  <span>{compactNumber(profile.stats.reactions)} reactions</span>
                </div>
              </div>
            </div>

            {isAuthenticated ? (
              <button
                type="button"
                onClick={() =>
                  following
                    ? unfollowCreator(user?._id, profile.user._id)
                    : followCreator(user?._id, profile.user._id)
                }
                className={`type-small rounded-xl px-4 py-2 font-semibold ${
                  following
                    ? "border border-sakura text-sakura"
                    : "bg-sakura text-white"
                }`}
              >
                {following ? "Following" : "Follow"}
              </button>
            ) : (
              <Link href="/login" className="type-small rounded-xl bg-sakura px-4 py-2 font-semibold text-white">
                Sign in to Follow
              </Link>
            )}
          </div>
        </article>

        <section className="space-y-3">
          <h2 className="type-h3 text-rice">Series</h2>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {profile.series.map((series) => (
              <article key={series._id} className="ink-panel rounded-2xl p-3">
                <img
                  src={`https://picsum.photos/seed/${series.coverImageStorageId}/640/960`}
                  alt={series.title}
                  className="aspect-[2/3] w-full rounded-xl object-cover"
                />
                <h3 className="type-h4 mt-2 text-rice">{series.title}</h3>
                <p className="type-small text-muted-foreground">{series.readingMode}</p>
                <Link href={`/series/${series._id}`} className="type-small mt-3 inline-flex text-sakura hover:text-sakura/80">
                  Open series
                </Link>
              </article>
            ))}
          </div>
        </section>
      </section>
    </SiteShell>
  );
}
