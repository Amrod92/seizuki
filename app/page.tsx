"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { MangaCard } from "@/components/manga-card";
import { SiteShell } from "@/components/site-shell";
import { HOME_TABS } from "@/lib/constants";
import { getCreatorStats, getHomeFeed, listCreators } from "@/lib/api";
import { compactNumber, timeAgo } from "@/lib/format";
import { HomeFeedType } from "@/lib/types";

const genres = [
  "Action",
  "Romance",
  "Horror",
  "Slice of Life",
  "Drama",
  "Fantasy",
  "Sci-Fi",
  "Comedy",
  "Webtoon",
];

export default function HomePage() {
  const [activeTab, setActiveTab] = useState<HomeFeedType>("TRENDING");
  const [selectedGenre, setSelectedGenre] = useState<string | null>(null);

  const feed = useMemo(() => getHomeFeed(activeTab), [activeTab]);
  const creators = useMemo(() => listCreators().slice(0, 4), []);
  const filteredFeed = selectedGenre
    ? feed.filter((item) => item.title.toLowerCase().includes(selectedGenre.toLowerCase()) || selectedGenre === "Action")
    : feed;

  const recentlyUpdated = useMemo(() => getHomeFeed("NEW").slice(0, 6), []);

  return (
    <SiteShell>
      <section className="space-y-4">
        <p className="type-small text-muted-foreground">Community-First Discovery</p>
        <h1 className="type-h1 text-rice">Discover Feed</h1>
        <div className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1">
          {HOME_TABS.map((tab) => (
            <button
              key={tab}
              type="button"
              onClick={() => setActiveTab(tab)}
              className={`type-small rounded-xl px-3 py-2 transition-colors ${
                activeTab === tab
                  ? "bg-sakura text-white"
                  : "border border-border-subtle bg-charcoal/70 text-muted-dark hover:border-sakura/70 hover:text-rice"
              }`}
            >
              {tab.replaceAll("_", " ")}
            </button>
          ))}
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {filteredFeed.map((item) => (
            <MangaCard key={item.chapterId} item={item} />
          ))}
        </div>
      </section>

      <section className="space-y-4">
        <div>
          <h2 className="type-h2 text-rice">Rising Creators</h2>
          <p className="type-small mt-1 text-muted-foreground">Follow creators with the fastest engagement growth.</p>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          {creators.map((creator) => {
            const stats = getCreatorStats(creator._id);
            return (
              <article key={creator._id} className="ink-panel flex items-center gap-4 rounded-2xl p-4">
                <img src={creator.avatarUrl} alt={creator.username} className="h-12 w-12 rounded-full object-cover" />
                <div className="min-w-0 flex-1">
                  <p className="type-h4 truncate text-rice">@{creator.username}</p>
                  <p className="type-small text-muted-foreground">{compactNumber(stats.followers)} followers</p>
                  <p className="type-small mt-1 text-muted-dark">{compactNumber(stats.reads)} reads</p>
                </div>
                <Link
                  href={`/creator/${creator._id}`}
                  className="type-small rounded-xl bg-sakura px-3 py-2 font-semibold text-white transition-colors hover:bg-sakura/90"
                >
                  View
                </Link>
              </article>
            );
          })}
        </div>
      </section>

      <section className="space-y-4">
        <h2 className="type-h2 text-rice">Genre chips</h2>
        <div className="-mx-1 flex gap-3 overflow-x-auto px-1 pb-2">
          {genres.map((genre) => (
            <button
              key={genre}
              type="button"
              onClick={() => setSelectedGenre((current) => (current === genre ? null : genre))}
              className={`type-body rounded-xl border px-4 py-2 transition-all ${
                selectedGenre === genre
                  ? "border-sakura bg-sakura/15 text-sakura"
                  : "border-border-subtle bg-charcoal/60 text-rice hover:border-sakura/70 hover:text-sakura"
              }`}
            >
              {genre}
            </button>
          ))}
        </div>
      </section>

      <section className="space-y-4">
        <div className="flex items-center justify-between gap-3">
          <h2 className="type-h2 text-rice">Community Picks</h2>
          <span className="type-small rounded-full border border-sakura/60 bg-sakura/15 px-3 py-1 text-sakura">
            Voted by readers
          </span>
        </div>
        <div className="grid gap-4 sm:grid-cols-3">
          {getHomeFeed("MOST_DISCUSSED")
            .slice(0, 3)
            .map((item) => (
              <article key={`pick-${item.chapterId}`} className="ink-panel rounded-2xl p-4">
                <img src={item.coverUrl} alt={item.title} className="mb-3 aspect-[2/3] w-full rounded-xl object-cover" />
                <h3 className="type-h4 text-rice">{item.title}</h3>
                <p className="type-small text-muted-foreground">by @{item.creatorName}</p>
                <p className="type-small mt-3 text-sakura">{compactNumber(item.commentCount)} comments this week</p>
              </article>
            ))}
        </div>
      </section>

      <section className="space-y-4">
        <h2 className="type-h2 text-rice">Recently Updated</h2>
        <div className="ink-panel rounded-2xl p-5">
          <ul className="space-y-2">
            {recentlyUpdated.map((item) => (
              <li key={`recent-${item.chapterId}`} className="type-body flex items-center justify-between gap-3 text-rice">
                <Link href={`/chapter/${item.chapterId}`} className="hover:text-sakura">
                  {item.title}
                </Link>
                <span className="type-small text-muted-dark">{timeAgo(item.updatedAt)}</span>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section className="ink-panel relative overflow-hidden rounded-3xl p-7 sm:p-10">
        <div className="absolute inset-0 bg-gradient-to-r from-sakura/10 via-transparent to-twilight/15" />
        <div className="relative flex flex-col items-start gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h2 className="type-h2 text-rice">Have a story inside you?</h2>
            <p className="type-body mt-2 max-w-xl text-muted-dark">Create a series and publish your first chapter today.</p>
          </div>
          <Link
            href="/create/series"
            className="type-body rounded-2xl bg-sakura px-6 py-3 font-semibold text-white transition-colors hover:bg-sakura/90"
          >
            Become a Creator
          </Link>
        </div>
      </section>
    </SiteShell>
  );
}
