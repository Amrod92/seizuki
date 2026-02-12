"use client";

import Link from "next/link";
import { useState } from "react";
import { AuthPageGuard } from "@/components/auth-page-guard";
import { SiteShell } from "@/components/site-shell";
import { useAuth } from "@/components/auth-provider";
import {
  getChapterPages,
  getCreatorStats,
  getDraftChaptersForCreator,
  getPublishedChaptersForCreator,
  getSeriesByCreator,
  replacePublishedPageImage,
  unpublishChapter,
} from "@/lib/api";
import { compactNumber, timeAgo } from "@/lib/format";

export default function CreatorDashboardPage() {
  const { user } = useAuth();

  const [replaceChapterId, setReplaceChapterId] = useState("");
  const [replacePageNumber, setReplacePageNumber] = useState(1);
  const [replaceUrl, setReplaceUrl] = useState("https://picsum.photos/seed/replacement/1300/1900");
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const stats = user ? getCreatorStats(user._id) : null;
  const creatorSeries = user ? getSeriesByCreator(user._id) : [];
  const drafts = user ? getDraftChaptersForCreator(user._id) : [];
  const published = user ? getPublishedChaptersForCreator(user._id) : [];

  const selectedPages = replaceChapterId ? getChapterPages(replaceChapterId) : [];

  return (
    <SiteShell>
      <AuthPageGuard>
        <section className="space-y-4">
          <h1 className="type-h1 text-rice">Creator Dashboard</h1>

          <div className="grid gap-3 sm:grid-cols-4">
            <article className="ink-panel rounded-2xl p-4">
              <p className="type-micro text-muted-dark">Followers</p>
              <p className="type-h3 text-rice">{compactNumber(stats?.followers ?? 0)}</p>
            </article>
            <article className="ink-panel rounded-2xl p-4">
              <p className="type-micro text-muted-dark">Reads</p>
              <p className="type-h3 text-rice">{compactNumber(stats?.reads ?? 0)}</p>
            </article>
            <article className="ink-panel rounded-2xl p-4">
              <p className="type-micro text-muted-dark">Comments</p>
              <p className="type-h3 text-rice">{compactNumber(stats?.comments ?? 0)}</p>
            </article>
            <article className="ink-panel rounded-2xl p-4">
              <p className="type-micro text-muted-dark">Reactions</p>
              <p className="type-h3 text-rice">{compactNumber(stats?.reactions ?? 0)}</p>
            </article>
          </div>

          <article className="ink-panel rounded-2xl p-5">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h2 className="type-h3 text-rice">Your Series</h2>
              <Link href="/create/series" className="type-small rounded-xl bg-sakura px-3 py-2 text-white">
                Create series
              </Link>
            </div>
            <div className="mt-3 space-y-2">
              {creatorSeries.map((series) => (
                <div key={series._id} className="flex items-center justify-between gap-3 rounded-xl border border-border-subtle p-3">
                  <div>
                    <p className="type-body text-rice">{series.title}</p>
                    <p className="type-small text-muted-dark">{series.readingMode} / {series.status}</p>
                  </div>
                  <Link
                    href={`/create/series/${series._id}/chapter/new`}
                    className="type-small rounded-xl border border-sakura px-3 py-2 text-sakura"
                  >
                    New chapter
                  </Link>
                </div>
              ))}
            </div>
          </article>

          <article className="ink-panel rounded-2xl p-5">
            <h2 className="type-h3 text-rice">Draft Chapters</h2>
            <div className="mt-3 space-y-2">
              {drafts.length === 0 ? <p className="type-small text-muted-foreground">No drafts.</p> : null}
              {drafts.map((chapter) => (
                <div key={chapter._id} className="rounded-xl border border-border-subtle p-3">
                  <p className="type-body text-rice">Chapter {chapter.chapterNumber}: {chapter.title ?? "Untitled"}</p>
                  <p className="type-small text-muted-dark">{chapter.pageCount} pages</p>
                </div>
              ))}
            </div>
          </article>

          <article className="ink-panel rounded-2xl p-5 space-y-3">
            <h2 className="type-h3 text-rice">Published Chapters</h2>
            {published.map((chapter) => (
              <div key={chapter._id} className="rounded-xl border border-border-subtle p-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="type-body text-rice">Chapter {chapter.chapterNumber}: {chapter.title ?? "Untitled"}</p>
                  <button
                    type="button"
                    onClick={() => {
                      const result = unpublishChapter(user?._id, chapter._id);
                      if (!result.ok) {
                        setError(result.error ?? "Unpublish failed.");
                        return;
                      }
                      setMessage("Chapter moved back to draft.");
                    }}
                    className="type-small rounded-xl border border-border-subtle px-3 py-1.5 text-rice"
                  >
                    Unpublish
                  </button>
                </div>
                <p className="type-small mt-1 text-muted-dark">
                  Published {chapter.publishedAt ? timeAgo(chapter.publishedAt) : "-"} / {chapter.pageCount} pages
                </p>
                <Link href={`/chapter/${chapter._id}`} className="type-small mt-2 inline-flex text-sakura">
                  Preview reader
                </Link>
              </div>
            ))}
          </article>

          <article className="ink-panel rounded-2xl p-5 space-y-3">
            <h2 className="type-h3 text-rice">Replace Published Page Image</h2>
            <p className="type-small text-muted-foreground">
              Allowed after publish only for the same page number.
            </p>
            <select
              value={replaceChapterId}
              onChange={(event) => setReplaceChapterId(event.target.value)}
              className="type-small w-full rounded-xl border border-border-subtle bg-charcoal px-3 py-2 text-rice"
            >
              <option value="">Select chapter</option>
              {published.map((chapter) => (
                <option key={chapter._id} value={chapter._id}>
                  Chapter {chapter.chapterNumber} ({chapter.title ?? "Untitled"})
                </option>
              ))}
            </select>
            <select
              value={replacePageNumber}
              onChange={(event) => setReplacePageNumber(Number(event.target.value))}
              className="type-small w-full rounded-xl border border-border-subtle bg-charcoal px-3 py-2 text-rice"
            >
              {(selectedPages.length > 0 ? selectedPages : [{ pageNumber: 1, _id: "stub" }]).map((page) => (
                <option key={page._id} value={page.pageNumber}>
                  Page {page.pageNumber}
                </option>
              ))}
            </select>
            <input
              value={replaceUrl}
              onChange={(event) => setReplaceUrl(event.target.value)}
              className="type-small w-full rounded-xl border border-border-subtle bg-charcoal px-3 py-2 text-rice"
              placeholder="Replacement image URL"
            />
            <button
              type="button"
              onClick={() => {
                if (!replaceChapterId) {
                  setError("Select a chapter first.");
                  return;
                }
                const result = replacePublishedPageImage(user?._id, replaceChapterId, replacePageNumber, replaceUrl);
                if (!result.ok) {
                  setError(result.error ?? "Replace failed.");
                  return;
                }
                setMessage(`Replaced page ${replacePageNumber}.`);
              }}
              className="type-small rounded-xl bg-sakura px-4 py-2 font-semibold text-white"
            >
              Replace image
            </button>
          </article>

          {error ? <p className="type-small text-crimson">{error}</p> : null}
          {message ? <p className="type-small text-sakura">{message}</p> : null}
        </section>
      </AuthPageGuard>
    </SiteShell>
  );
}
