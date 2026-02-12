"use client";

import { FormEvent, useState } from "react";
import { useParams } from "next/navigation";
import { AuthPageGuard } from "@/components/auth-page-guard";
import { SiteShell } from "@/components/site-shell";
import { useAuth } from "@/components/auth-provider";
import {
  addPageToDraft,
  createChapterDraft,
  getChapter,
  getChapterPages,
  publishChapter,
  reorderDraftPages,
} from "@/lib/api";

export default function NewChapterDraftPage() {
  const params = useParams<{ seriesId: string }>();
  const { user } = useAuth();

  const [chapterId, setChapterId] = useState<string | null>(null);
  const [chapterNumber, setChapterNumber] = useState(1);
  const [title, setTitle] = useState("");
  const [notes, setNotes] = useState("");
  const [imageUrl, setImageUrl] = useState("https://picsum.photos/seed/new-upload/1300/1900");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const chapter = chapterId ? getChapter(chapterId) : null;
  const pages = chapterId ? getChapterPages(chapterId) : [];

  const onCreateDraft = (event: FormEvent) => {
    event.preventDefault();
    setError(null);
    setSuccess(null);

    const result = createChapterDraft(user?._id, params.seriesId, {
      chapterNumber,
      title,
      notes,
    });

    if (!result.ok) {
      setError(result.error ?? "Could not create draft.");
      return;
    }

    setChapterId(result.data?._id ?? null);
    setSuccess("Draft created. Upload and reorder pages before publish.");
  };

  const onUploadPage = () => {
    setError(null);
    setSuccess(null);

    if (!chapterId) {
      setError("Create a draft first.");
      return;
    }

    const result = addPageToDraft(user?._id, chapterId, imageUrl);
    if (!result.ok) {
      setError(result.error ?? "Upload failed.");
      return;
    }

    setImageUrl(`https://picsum.photos/seed/new-upload-${Math.random()}/1300/1900`);
    setSuccess(`Page ${result.data?.pageNumber} added.`);
  };

  const movePage = (pageId: string, direction: -1 | 1) => {
    if (!chapterId) {
      return;
    }

    const current = getChapterPages(chapterId).map((page) => page._id);
    const index = current.findIndex((id) => id === pageId);
    if (index < 0) {
      return;
    }

    const nextIndex = index + direction;
    if (nextIndex < 0 || nextIndex >= current.length) {
      return;
    }

    const copy = [...current];
    const temp = copy[index];
    copy[index] = copy[nextIndex];
    copy[nextIndex] = temp;
    const result = reorderDraftPages(user?._id, chapterId, copy);
    if (!result.ok) {
      setError(result.error ?? "Reorder failed.");
      return;
    }
    setSuccess("Page order updated.");
  };

  const onPublish = () => {
    if (!chapterId) {
      return;
    }

    const result = publishChapter(user?._id, chapterId);
    if (!result.ok) {
      setError(result.error ?? "Publish failed.");
      return;
    }

    setSuccess("Chapter published. Page order is now locked.");
  };

  return (
    <SiteShell>
      <AuthPageGuard>
        <section className="mx-auto w-full max-w-3xl space-y-4">
          <h1 className="type-h1 text-rice">New Chapter Draft</h1>

          {!chapterId ? (
            <form onSubmit={onCreateDraft} className="ink-panel space-y-3 rounded-2xl p-5">
              <label className="block">
                <span className="type-small text-muted-foreground">Chapter number</span>
                <input
                  type="number"
                  min={1}
                  value={chapterNumber}
                  onChange={(event) => setChapterNumber(Number(event.target.value))}
                  className="type-body mt-1 w-full rounded-xl border border-border-subtle bg-charcoal px-3 py-2 text-rice"
                />
              </label>
              <label className="block">
                <span className="type-small text-muted-foreground">Title</span>
                <input
                  value={title}
                  onChange={(event) => setTitle(event.target.value)}
                  className="type-body mt-1 w-full rounded-xl border border-border-subtle bg-charcoal px-3 py-2 text-rice"
                />
              </label>
              <label className="block">
                <span className="type-small text-muted-foreground">Notes</span>
                <textarea
                  value={notes}
                  onChange={(event) => setNotes(event.target.value)}
                  rows={3}
                  className="type-body mt-1 w-full rounded-xl border border-border-subtle bg-charcoal px-3 py-2 text-rice"
                />
              </label>
              <button type="submit" className="type-small rounded-xl bg-sakura px-4 py-2 font-semibold text-white">
                Create Draft
              </button>
            </form>
          ) : (
            <div className="space-y-4">
              <article className="ink-panel rounded-2xl p-5">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <h2 className="type-h3 text-rice">Draft: Chapter {chapter?.chapterNumber}</h2>
                  <span className="type-small rounded-full bg-charcoal px-2 py-1 text-muted-dark">
                    {chapter?.status}
                  </span>
                </div>
                <p className="type-small mt-1 text-muted-foreground">
                  Upload pages and reorder while in draft. After publish, reorder is blocked by backend.
                </p>

                <div className="mt-3 flex flex-wrap gap-2">
                  <input
                    value={imageUrl}
                    onChange={(event) => setImageUrl(event.target.value)}
                    className="type-small min-w-[280px] flex-1 rounded-xl border border-border-subtle bg-charcoal px-3 py-2 text-rice"
                    placeholder="Image URL"
                  />
                  <button
                    type="button"
                    onClick={onUploadPage}
                    className="type-small rounded-xl bg-sakura px-4 py-2 font-semibold text-white"
                  >
                    Add page
                  </button>
                  <button
                    type="button"
                    onClick={onPublish}
                    className="type-small rounded-xl border border-sakura px-4 py-2 text-sakura"
                  >
                    Publish chapter
                  </button>
                </div>
              </article>

              <article className="ink-panel rounded-2xl p-5">
                <h3 className="type-h4 text-rice">Pages</h3>
                <div className="mt-3 space-y-3">
                  {pages.map((page, index) => (
                    <div key={page._id} className="flex items-center gap-3 rounded-xl border border-border-subtle p-2">
                      <img src={page.imageUrl} alt={`Page ${page.pageNumber}`} className="h-16 w-12 rounded object-cover" />
                      <div className="min-w-0 flex-1">
                        <p className="type-small text-rice">Page {page.pageNumber}</p>
                        <p className="type-micro text-muted-dark">{page._id}</p>
                      </div>
                      <button
                        type="button"
                        onClick={() => movePage(page._id, -1)}
                        className="type-micro rounded-lg border border-border-subtle px-2 py-1 text-rice"
                        disabled={index === 0 || chapter?.status !== "DRAFT"}
                      >
                        Up
                      </button>
                      <button
                        type="button"
                        onClick={() => movePage(page._id, 1)}
                        className="type-micro rounded-lg border border-border-subtle px-2 py-1 text-rice"
                        disabled={index === pages.length - 1 || chapter?.status !== "DRAFT"}
                      >
                        Down
                      </button>
                    </div>
                  ))}
                </div>
              </article>
            </div>
          )}

          {error ? <p className="type-small text-crimson">{error}</p> : null}
          {success ? <p className="type-small text-sakura">{success}</p> : null}
        </section>
      </AuthPageGuard>
    </SiteShell>
  );
}
