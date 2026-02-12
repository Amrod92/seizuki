"use client";

import { useMemo, useState } from "react";
import { MangaCard } from "@/components/manga-card";
import { SiteShell } from "@/components/site-shell";
import { searchDiscovery } from "@/lib/api";

const tags = ["Action", "Romance", "Fantasy", "Sci-Fi", "Drama", "Slice of Life"];

export default function ExplorePage() {
  const [query, setQuery] = useState("");
  const [selectedTags, setSelectedTags] = useState<string[]>([]);

  const results = useMemo(() => searchDiscovery(query, selectedTags), [query, selectedTags]);

  return (
    <SiteShell>
      <section className="space-y-4">
        <h1 className="type-h1 text-rice">Explore</h1>
        <p className="type-small text-muted-foreground">Search by title, creator, or tags.</p>

        <div className="ink-panel rounded-2xl p-4">
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search series or creator"
            className="type-body w-full rounded-xl border border-border-subtle bg-charcoal/80 px-4 py-3 text-rice outline-none"
          />
          <div className="mt-3 flex flex-wrap gap-2">
            {tags.map((tag) => {
              const active = selectedTags.includes(tag);
              return (
                <button
                  key={tag}
                  type="button"
                  onClick={() =>
                    setSelectedTags((prev) =>
                      active ? prev.filter((entry) => entry !== tag) : [...prev, tag],
                    )
                  }
                  className={`type-small rounded-full border px-3 py-1 ${
                    active
                      ? "border-sakura bg-sakura/15 text-sakura"
                      : "border-border-subtle bg-charcoal text-rice"
                  }`}
                >
                  {tag}
                </button>
              );
            })}
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {results.map((item) => (
            <MangaCard key={item.chapterId} item={item} />
          ))}
        </div>
      </section>
    </SiteShell>
  );
}
