"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { useAuth } from "@/components/auth-provider";
import { REACTION_EMOJIS } from "@/lib/constants";
import {
  addComment,
  addReaction,
  getChapter,
  getChapterPages,
  getOverlayStream,
  getPageThread,
  getSeries,
  isCommentCollapsed,
  reportTarget,
  voteComment,
} from "@/lib/api";
import { compactNumber, timeAgo } from "@/lib/format";
import { ThreadSort } from "@/lib/types";

interface FloatingComment {
  key: string;
  commentId: string;
  username: string;
  text: string;
  createdAt: number;
  top: number;
}

interface FloatingReaction {
  key: string;
  emoji: string;
  createdAt: number;
  left: number;
}

export function ChapterReader({ chapterId }: { chapterId: string }) {
  const { user, isAuthenticated } = useAuth();

  const chapter = getChapter(chapterId);
  const series = chapter ? getSeries(chapter.seriesId) : null;
  const pages = chapter ? getChapterPages(chapter._id) : [];

  const canRead = !!chapter && (chapter.status === "PUBLISHED" || chapter.creatorId === user?._id);

  const [currentPageIndex, setCurrentPageIndex] = useState(0);
  const [scrollActivePageNumber, setScrollActivePageNumber] = useState(1);
  const [overlayOn, setOverlayOn] = useState(true);
  const [threadOpen, setThreadOpen] = useState(true);
  const [threadSort, setThreadSort] = useState<ThreadSort>("TOP");
  const [commentBody, setCommentBody] = useState("");
  const [replyToId, setReplyToId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [revealedComments, setRevealedComments] = useState<Record<string, boolean>>({});

  const [floatingComments, setFloatingComments] = useState<FloatingComment[]>([]);
  const [floatingReactions, setFloatingReactions] = useState<FloatingReaction[]>([]);
  const [reactingNowCount, setReactingNowCount] = useState(0);

  const seenCommentIds = useRef(new Set<string>());
  const seenReactionIds = useRef(new Set<string>());
  const scrollContainerRef = useRef<HTMLDivElement | null>(null);

  const readingMode = series?.readingMode ?? "MANGA";
  const readingDirection = series?.readingDirection ?? "RTL";
  const pageNumber =
    readingMode === "SCROLL" ? scrollActivePageNumber : pages[currentPageIndex]?.pageNumber ?? 1;

  const activePage =
    readingMode === "SCROLL"
      ? pages.find((page) => page.pageNumber === pageNumber) ?? pages[0] ?? null
      : pages[currentPageIndex] ?? null;

  const thread = getPageThread(chapterId, pageNumber, threadSort);

  const refreshOverlay = () => {
    if (!overlayOn) {
      return;
    }

    const stream = getOverlayStream(chapterId, pageNumber);
    setReactingNowCount(stream.reactingNowCount);

    for (const comment of stream.comments.slice(0, 5)) {
      if (seenCommentIds.current.has(comment._id)) {
        continue;
      }
      seenCommentIds.current.add(comment._id);
      setFloatingComments((prev) => [
        {
          key: `${comment._id}-${Date.now()}`,
          commentId: comment._id,
          username: comment.authorId,
          text: comment.body,
          createdAt: Date.now(),
          top: 8 + Math.floor(Math.random() * 44),
        },
        ...prev,
      ].slice(0, 5));
    }

    for (const reaction of stream.reactions.slice(0, 8)) {
      if (seenReactionIds.current.has(reaction._id)) {
        continue;
      }
      seenReactionIds.current.add(reaction._id);
      setFloatingReactions((prev) => [
        {
          key: `${reaction._id}-${Date.now()}`,
          emoji: reaction.emoji,
          createdAt: Date.now(),
          left: 10 + Math.floor(Math.random() * 80),
        },
        ...prev,
      ].slice(0, 20));
    }
  };

  useEffect(() => {
    const interval = window.setInterval(() => {
      refreshOverlay();
      setFloatingComments((prev) => prev.filter((item) => Date.now() - item.createdAt < 5_000));
      setFloatingReactions((prev) => prev.filter((item) => Date.now() - item.createdAt < 2_500));
    }, 900);

    return () => window.clearInterval(interval);
  }, [refreshOverlay]);

  useEffect(() => {
    if (readingMode !== "SCROLL") {
      return;
    }

    const container = scrollContainerRef.current;
    if (!container) {
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) {
            return;
          }
          const page = Number((entry.target as HTMLElement).dataset.pageNumber);
          if (!Number.isNaN(page)) {
            setScrollActivePageNumber(page);
          }
        });
      },
      {
        root: null,
        threshold: 0.55,
      },
    );

    const targets = container.querySelectorAll("[data-page-number]");
    targets.forEach((target) => observer.observe(target));

    return () => observer.disconnect();
  }, [readingMode, pages.length]);

  useEffect(() => {
    if (readingMode === "SCROLL") {
      return;
    }

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "ArrowRight" && event.key !== "ArrowLeft") {
        return;
      }

      const isNext =
        readingDirection === "RTL" ? event.key === "ArrowLeft" : event.key === "ArrowRight";

      if (isNext) {
        setCurrentPageIndex((prev) => Math.min(prev + 1, pages.length - 1));
      } else {
        setCurrentPageIndex((prev) => Math.max(prev - 1, 0));
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [pages.length, readingDirection, readingMode]);

  if (!chapter || !series) {
    return <p className="type-body text-muted-foreground">Chapter not found.</p>;
  }

  if (!canRead) {
    return (
      <div className="ink-panel rounded-2xl p-6">
        <p className="type-body text-rice">This draft chapter is visible only to its creator.</p>
      </div>
    );
  }

  if (!activePage) {
    return <p className="type-body text-muted-foreground">No pages uploaded yet.</p>;
  }

  const watermarkLabel = user?.username ?? "SEIZUKI";
  const highActivityMode = reactingNowCount > 10;

  const submitComment = () => {
    setError(null);

    if (!isAuthenticated) {
      setError("Sign in with OAuth to comment.");
      return;
    }

    const result = addComment(user?._id, chapterId, pageNumber, commentBody, replyToId);
    if (!result.ok) {
      setError(result.error ?? "Failed to post comment.");
      return;
    }

    setCommentBody("");
    setReplyToId(null);
    refreshOverlay();
  };

  const sendReaction = (emoji: string) => {
    setError(null);

    if (!isAuthenticated) {
      setError("Sign in with OAuth to react.");
      return;
    }

    const result = addReaction(user?._id, chapterId, pageNumber, emoji);
    if (!result.ok) {
      setError(result.error ?? "Could not add reaction.");
      return;
    }

    refreshOverlay();
  };

  return (
    <section className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_340px]" onContextMenu={(event) => event.preventDefault()}>
      <div className="space-y-4">
        <div className="ink-panel rounded-2xl p-4">
          <div className="flex flex-wrap items-center gap-2">
            <Link href={`/series/${series._id}`} className="type-small text-sakura hover:text-sakura/85">
              {series.title}
            </Link>
            <span className="type-small text-muted-dark">Chapter {chapter.chapterNumber}</span>
            <span className="type-small text-muted-dark">{chapter.status}</span>
          </div>
          <h1 className="type-h3 mt-2 text-rice">{chapter.title ?? `Chapter ${chapter.chapterNumber}`}</h1>
          <p className="type-small mt-1 text-muted-foreground">
            Overlay ON by default for everyone. Logged-out readers can watch but not interact.
          </p>
          <div className="mt-4 flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => setOverlayOn((prev) => !prev)}
              className={`type-small rounded-xl px-3 py-2 ${
                overlayOn ? "bg-sakura text-white" : "bg-charcoal text-rice"
              }`}
            >
              Overlay {overlayOn ? "ON" : "OFF"}
            </button>
            <button
              type="button"
              onClick={() => setThreadOpen((prev) => !prev)}
              className="type-small rounded-xl border border-border-subtle px-3 py-2 text-rice"
            >
              Thread {threadOpen ? "Visible" : "Hidden"}
            </button>
            <span className="type-small rounded-xl bg-charcoal px-3 py-2 text-sakura">
              Reacting now: {compactNumber(reactingNowCount)}
            </span>
          </div>
        </div>

        {readingMode === "SCROLL" ? (
          <div ref={scrollContainerRef} className="space-y-3">
            {pages.map((page) => (
              <div
                key={page._id}
                data-page-number={page.pageNumber}
                className="ink-panel relative overflow-hidden rounded-xl p-2"
              >
                <img
                  src={page.imageUrl}
                  alt={`Page ${page.pageNumber}`}
                  className="mx-auto max-h-[85vh] w-full max-w-3xl rounded-lg object-contain"
                />
                <div className="pointer-events-none absolute inset-0 opacity-20">
                  <div className="grid h-full w-full grid-cols-3 text-center text-[11px] text-rice/60">
                    {Array.from({ length: 9 }, (_, index) => (
                      <span key={`wm-${page._id}-${index}`} className="self-center text-center">
                        {watermarkLabel}
                      </span>
                    ))}
                  </div>
                </div>
                <p className="type-micro absolute bottom-3 right-3 rounded-full bg-charcoal/80 px-2 py-1 text-rice">
                  Page {page.pageNumber}
                </p>
              </div>
            ))}
          </div>
        ) : (
          <div className="ink-panel relative overflow-hidden rounded-xl p-2">
            <img
              src={activePage.imageUrl}
              alt={`Page ${activePage.pageNumber}`}
              className="mx-auto max-h-[85vh] w-full max-w-3xl rounded-lg object-contain"
            />

            <div className="pointer-events-none absolute inset-0 opacity-20">
              <div className="grid h-full w-full grid-cols-3 text-center text-[11px] text-rice/60">
                {Array.from({ length: 9 }, (_, index) => (
                  <span key={`wm-${activePage._id}-${index}`} className="self-center text-center">
                    {watermarkLabel}
                  </span>
                ))}
              </div>
            </div>

            <div className="pointer-events-none absolute right-4 top-4 rounded-full bg-charcoal/85 px-3 py-1">
              <p className="type-small text-sakura">Reacting now {compactNumber(reactingNowCount)}</p>
            </div>

            <div className="mt-3 flex items-center justify-between px-1">
              <button
                type="button"
                onClick={() => setCurrentPageIndex((prev) => Math.max(0, prev - 1))}
                className="type-small rounded-xl border border-border-subtle bg-charcoal px-3 py-2 text-rice disabled:opacity-35"
                disabled={currentPageIndex === 0}
              >
                Prev
              </button>
              <p className="type-small text-muted-foreground">
                Page {currentPageIndex + 1} / {pages.length}
              </p>
              <button
                type="button"
                onClick={() => setCurrentPageIndex((prev) => Math.min(pages.length - 1, prev + 1))}
                className="type-small rounded-xl border border-border-subtle bg-charcoal px-3 py-2 text-rice disabled:opacity-35"
                disabled={currentPageIndex === pages.length - 1}
              >
                Next
              </button>
            </div>

            <div className="hidden">
              {pages.slice(currentPageIndex + 1, currentPageIndex + 3).map((page) => (
                <img key={`preload-${page._id}`} src={page.imageUrl} alt="preload" />
              ))}
            </div>
          </div>
        )}

        {overlayOn && (
          <div className="pointer-events-none fixed inset-0 z-40 hidden md:block">
            {floatingComments
              .slice(0, highActivityMode ? 3 : 5)
              .map((item) => (
                <button
                  type="button"
                  key={item.key}
                  onClick={() => setThreadOpen(true)}
                  className="overlay-comment pointer-events-auto absolute right-4 max-w-xs rounded-2xl border border-sakura/50 bg-charcoal/95 px-3 py-2 text-left text-rice"
                  style={{ top: `${item.top}%` }}
                >
                  <p className="type-micro text-sakura">@{item.username}</p>
                  <p className="type-small line-clamp-2">{item.text}</p>
                </button>
              ))}

            {floatingReactions.map((item) => (
              <span
                key={item.key}
                className="overlay-emoji pointer-events-none absolute bottom-6 text-2xl"
                style={{ left: `${item.left}%` }}
              >
                {item.emoji}
              </span>
            ))}
          </div>
        )}

        <div className="ink-panel rounded-2xl p-4">
          <p className="type-small text-muted-foreground">Quick react</p>
          <div className="mt-2 flex flex-wrap gap-2">
            {REACTION_EMOJIS.map((emoji) => (
              <button
                key={emoji}
                type="button"
                onClick={() => sendReaction(emoji)}
                className="rounded-xl border border-border-subtle bg-charcoal px-3 py-2 text-xl"
              >
                {emoji}
              </button>
            ))}
          </div>

          <div className="mt-4 space-y-2">
            {replyToId ? (
              <p className="type-small text-sakura">Replying to comment {replyToId}</p>
            ) : null}
            <textarea
              value={commentBody}
              onChange={(event) => setCommentBody(event.target.value)}
              maxLength={140}
              rows={3}
              placeholder={isAuthenticated ? "Drop a live comment..." : "Sign in to post comments"}
              className="type-body min-h-24 w-full rounded-xl border border-border-subtle bg-charcoal/70 p-3 text-rice outline-none"
            />
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="type-micro text-muted-foreground">{commentBody.length} / 140</p>
              {isAuthenticated ? (
                <button
                  type="button"
                  onClick={submitComment}
                  className="type-small rounded-xl bg-sakura px-4 py-2 font-semibold text-white"
                >
                  Post Comment
                </button>
              ) : (
                <Link href="/login" className="type-small rounded-xl bg-sakura px-4 py-2 font-semibold text-white">
                  Sign in to Comment
                </Link>
              )}
            </div>
            {error ? <p className="type-small text-crimson">{error}</p> : null}
          </div>
        </div>
      </div>

      {threadOpen ? (
        <aside className="ink-panel h-[85vh] rounded-2xl p-4 lg:sticky lg:top-24">
          <div className="flex items-center justify-between gap-2">
            <h2 className="type-h4 text-rice">Page {pageNumber} thread</h2>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setThreadSort("TOP")}
                className={`type-micro rounded-full px-2 py-1 ${
                  threadSort === "TOP" ? "bg-sakura text-white" : "bg-charcoal text-muted-dark"
                }`}
              >
                Top
              </button>
              <button
                type="button"
                onClick={() => setThreadSort("NEW")}
                className={`type-micro rounded-full px-2 py-1 ${
                  threadSort === "NEW" ? "bg-sakura text-white" : "bg-charcoal text-muted-dark"
                }`}
              >
                New
              </button>
            </div>
          </div>

          <div className="mt-3 h-[74vh] space-y-3 overflow-y-auto pr-1">
            {thread.comments.length === 0 ? (
              <p className="type-small text-muted-foreground">No comments yet on this page.</p>
            ) : null}

            {thread.comments.map((comment) => {
              const collapsed = isCommentCollapsed(comment) && !revealedComments[comment._id];
              const replies = thread.repliesByParentId[comment._id] ?? [];

              return (
                <article key={comment._id} className="rounded-xl border border-border-subtle bg-charcoal/70 p-3">
                  <div className="flex items-center justify-between gap-2">
                    <p className="type-micro text-sakura">@{comment.authorId}</p>
                    <p className="type-micro text-muted-dark">{timeAgo(comment.createdAt)}</p>
                  </div>

                  {collapsed ? (
                    <div className="mt-2 space-y-2">
                      <p className="type-small text-muted-foreground">This comment is hidden due to low score.</p>
                      <button
                        type="button"
                        onClick={() =>
                          setRevealedComments((prev) => ({
                            ...prev,
                            [comment._id]: true,
                          }))
                        }
                        className="type-small rounded-lg border border-border-subtle px-2 py-1 text-rice"
                      >
                        Reveal
                      </button>
                    </div>
                  ) : (
                    <p className="type-small mt-2 text-rice">{comment.body}</p>
                  )}

                  <div className="mt-2 flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => voteComment(user?._id, comment._id, 1)}
                      className="type-micro rounded-lg border border-border-subtle px-2 py-1 text-rice"
                    >
                      ▲ {comment.upvoteCount}
                    </button>
                    <button
                      type="button"
                      onClick={() => voteComment(user?._id, comment._id, -1)}
                      className="type-micro rounded-lg border border-border-subtle px-2 py-1 text-rice"
                    >
                      ▼ {comment.downvoteCount}
                    </button>
                    <span className="type-micro text-muted-dark">score {comment.score}</span>
                    <button
                      type="button"
                      onClick={() => setReplyToId(comment._id)}
                      className="type-micro rounded-lg border border-border-subtle px-2 py-1 text-rice"
                    >
                      Reply
                    </button>
                    <button
                      type="button"
                      onClick={() => reportTarget(user?._id, "COMMENT", comment._id, "Abuse")}
                      className="type-micro rounded-lg border border-border-subtle px-2 py-1 text-muted-dark"
                    >
                      Report
                    </button>
                  </div>

                  {replies.length > 0 ? (
                    <div className="mt-3 space-y-2 border-l border-border-subtle pl-3">
                      {replies.map((reply) => (
                        <div key={reply._id} className="rounded-lg bg-ink/40 p-2">
                          <p className="type-micro text-sakura">@{reply.authorId}</p>
                          <p className="type-small mt-1 text-rice">{reply.body}</p>
                        </div>
                      ))}
                    </div>
                  ) : null}
                </article>
              );
            })}
          </div>
        </aside>
      ) : null}
    </section>
  );
}
