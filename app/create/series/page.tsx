"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";
import { AuthPageGuard } from "@/components/auth-page-guard";
import { SiteShell } from "@/components/site-shell";
import { useAuth } from "@/components/auth-provider";
import { createSeries } from "@/lib/api";
import { ReadingMode, ReadingDirection } from "@/lib/types";

export default function CreateSeriesPage() {
  const { user } = useAuth();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [tags, setTags] = useState("Action, Fantasy");
  const [language, setLanguage] = useState("English");
  const [isMature, setIsMature] = useState(false);
  const [readingMode, setReadingMode] = useState<ReadingMode>("MANGA");
  const [readingDirection, setReadingDirection] = useState<ReadingDirection>("RTL");
  const [error, setError] = useState<string | null>(null);
  const [createdSeriesId, setCreatedSeriesId] = useState<string | null>(null);

  const onSubmit = (event: FormEvent) => {
    event.preventDefault();
    setError(null);

    const result = createSeries(user?._id, {
      title,
      description,
      tags: tags
        .split(",")
        .map((tag) => tag.trim())
        .filter(Boolean),
      language,
      isMature,
      readingMode,
      readingDirection: readingMode === "SCROLL" ? null : readingDirection,
    });

    if (!result.ok) {
      setError(result.error ?? "Could not create series.");
      return;
    }

    setCreatedSeriesId(result.data?._id ?? null);
  };

  return (
    <SiteShell>
      <AuthPageGuard>
        <section className="mx-auto w-full max-w-2xl space-y-4">
          <h1 className="type-h1 text-rice">Create Series</h1>

          <form onSubmit={onSubmit} className="ink-panel space-y-3 rounded-2xl p-5">
            <label className="block">
              <span className="type-small text-muted-foreground">Title</span>
              <input
                required
                value={title}
                onChange={(event) => setTitle(event.target.value)}
                className="type-body mt-1 w-full rounded-xl border border-border-subtle bg-charcoal px-3 py-2 text-rice"
              />
            </label>
            <label className="block">
              <span className="type-small text-muted-foreground">Description</span>
              <textarea
                required
                rows={4}
                value={description}
                onChange={(event) => setDescription(event.target.value)}
                className="type-body mt-1 w-full rounded-xl border border-border-subtle bg-charcoal px-3 py-2 text-rice"
              />
            </label>
            <label className="block">
              <span className="type-small text-muted-foreground">Tags (comma-separated)</span>
              <input
                value={tags}
                onChange={(event) => setTags(event.target.value)}
                className="type-body mt-1 w-full rounded-xl border border-border-subtle bg-charcoal px-3 py-2 text-rice"
              />
            </label>

            <div className="grid gap-3 sm:grid-cols-2">
              <label className="block">
                <span className="type-small text-muted-foreground">Language</span>
                <input
                  value={language}
                  onChange={(event) => setLanguage(event.target.value)}
                  className="type-body mt-1 w-full rounded-xl border border-border-subtle bg-charcoal px-3 py-2 text-rice"
                />
              </label>

              <label className="block">
                <span className="type-small text-muted-foreground">Reading mode</span>
                <select
                  value={readingMode}
                  onChange={(event) => setReadingMode(event.target.value as ReadingMode)}
                  className="type-body mt-1 w-full rounded-xl border border-border-subtle bg-charcoal px-3 py-2 text-rice"
                >
                  <option value="MANGA">MANGA</option>
                  <option value="COMIC">COMIC</option>
                  <option value="SCROLL">SCROLL</option>
                </select>
              </label>
            </div>

            {readingMode !== "SCROLL" ? (
              <label className="block">
                <span className="type-small text-muted-foreground">Reading direction</span>
                <select
                  value={readingDirection ?? "RTL"}
                  onChange={(event) => setReadingDirection(event.target.value as ReadingDirection)}
                  className="type-body mt-1 w-full rounded-xl border border-border-subtle bg-charcoal px-3 py-2 text-rice"
                >
                  <option value="RTL">RTL</option>
                  <option value="LTR">LTR</option>
                </select>
              </label>
            ) : null}

            <label className="type-small flex items-center gap-2 text-rice">
              <input type="checkbox" checked={isMature} onChange={(event) => setIsMature(event.target.checked)} />
              Mature content
            </label>

            <button type="submit" className="type-small rounded-xl bg-sakura px-4 py-2 font-semibold text-white">
              Create Series
            </button>

            {error ? <p className="type-small text-crimson">{error}</p> : null}
            {createdSeriesId ? (
              <p className="type-small text-sakura">
                Series created. Continue to{" "}
                <Link href={`/create/series/${createdSeriesId}/chapter/new`} className="underline">
                  create chapter draft
                </Link>
                .
              </p>
            ) : null}
          </form>
        </section>
      </AuthPageGuard>
    </SiteShell>
  );
}
