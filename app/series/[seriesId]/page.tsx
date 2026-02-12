"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { SiteShell } from "@/components/site-shell";
import { useAuth } from "@/components/auth-provider";
import { getChaptersBySeries, getSeries } from "@/lib/api";
import { compactNumber, timeAgo } from "@/lib/format";

export default function SeriesPage() {
  const params = useParams<{ seriesId: string }>();
  const { user } = useAuth();

  const seriesId = params.seriesId;
  const series = getSeries(seriesId);

  if (!series) {
    return (
      <SiteShell>
        <p className="type-body text-muted-foreground">Series not found.</p>
      </SiteShell>
    );
  }

  const chapters = getChaptersBySeries(seriesId, user?._id);

  return (
    <SiteShell>
      <section className="grid gap-4 lg:grid-cols-[320px_minmax(0,1fr)]">
        <article className="ink-panel rounded-2xl p-4">
          <img
            src={`https://picsum.photos/seed/${series.coverImageStorageId}/800/1200`}
            alt={series.title}
            className="aspect-[2/3] w-full rounded-xl object-cover"
          />
          <h1 className="type-h2 mt-4 text-rice">{series.title}</h1>
          <p className="type-small mt-2 text-muted-foreground">by @{series.creator?.username}</p>
          <p className="type-body mt-3 text-rice/90">{series.description}</p>
          <div className="mt-3 flex flex-wrap gap-2">
            {series.tags.map((tag) => (
              <span key={tag} className="type-micro rounded-full bg-charcoal px-2 py-1 text-rice">
                {tag}
              </span>
            ))}
          </div>
          <div className="mt-4 grid grid-cols-2 gap-2">
            <div className="rounded-xl bg-charcoal p-2">
              <p className="type-micro text-muted-dark">Mode</p>
              <p className="type-small text-rice">{series.readingMode}</p>
            </div>
            <div className="rounded-xl bg-charcoal p-2">
              <p className="type-micro text-muted-dark">Rating</p>
              <p className="type-small text-rice">{series.averageRating.toFixed(1)} ({compactNumber(series.ratingCount)})</p>
            </div>
          </div>
        </article>

        <section className="space-y-3">
          <h2 className="type-h3 text-rice">Chapters</h2>
          {chapters.map((chapter) => (
            <article key={chapter._id} className="ink-panel rounded-2xl p-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h3 className="type-h4 text-rice">Chapter {chapter.chapterNumber}: {chapter.title ?? "Untitled"}</h3>
                <span
                  className={`type-micro rounded-full px-2 py-1 ${
                    chapter.status === "PUBLISHED" ? "bg-sakura text-white" : "bg-charcoal text-muted-dark"
                  }`}
                >
                  {chapter.status}
                </span>
              </div>
              <p className="type-small mt-1 text-muted-foreground">
                {chapter.status === "PUBLISHED" && chapter.publishedAt
                  ? `Published ${timeAgo(chapter.publishedAt)}`
                  : "Draft chapter"}
              </p>
              <div className="type-small mt-3 flex flex-wrap gap-3 text-muted-dark">
                <span>{chapter.pageCount} pages</span>
                <span>{compactNumber(chapter.viewCount)} views</span>
                <span>{compactNumber(chapter.commentCount)} comments</span>
              </div>
              {chapter.status === "PUBLISHED" ? (
                <Link
                  href={`/chapter/${chapter._id}`}
                  className="type-small mt-3 inline-flex rounded-xl bg-sakura px-3 py-2 font-semibold text-white"
                >
                  Read now
                </Link>
              ) : (
                <span className="type-small mt-3 inline-flex rounded-xl border border-border-subtle px-3 py-2 text-muted-dark">
                  Not public yet
                </span>
              )}
            </article>
          ))}
        </section>
      </section>
    </SiteShell>
  );
}
