"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useParams } from "next/navigation";
import { SiteShell } from "@/components/site-shell";
import { getRankings } from "@/lib/api";
import { compactNumber } from "@/lib/format";
import { RankingPeriod, RankingType } from "@/lib/types";

const periodMap: Record<string, RankingPeriod> = {
  week: "WEEK",
  month: "MONTH",
  year: "YEAR",
  all: "ALL_TIME",
};

const typeTabs: RankingType[] = ["TRENDING", "RISING", "MOST_DISCUSSED", "TOP_RATED"];
const periodTabs = [
  { slug: "week", label: "Week" },
  { slug: "month", label: "Month" },
  { slug: "year", label: "Year" },
  { slug: "all", label: "All-time" },
];

export default function RankingsPeriodPage() {
  const params = useParams<{ period: string }>();
  const period = periodMap[params.period.toLowerCase()] ?? "WEEK";
  const [type, setType] = useState<RankingType>("TRENDING");

  const rows = useMemo(() => getRankings(period, type), [period, type]);

  return (
    <SiteShell>
      <section className="space-y-4">
        <h1 className="type-h1 text-rice">Rankings</h1>
        <div className="flex flex-wrap gap-2">
          {periodTabs.map((item) => (
            <Link
              key={item.slug}
              href={`/rankings/${item.slug}`}
              className={`type-small rounded-xl px-3 py-2 ${
                params.period.toLowerCase() === item.slug
                  ? "bg-sakura text-white"
                  : "border border-border-subtle bg-charcoal text-rice"
              }`}
            >
              {item.label}
            </Link>
          ))}
        </div>
        <div className="flex flex-wrap gap-2">
          {typeTabs.map((tab) => (
            <button
              key={tab}
              type="button"
              onClick={() => setType(tab)}
              className={`type-small rounded-xl px-3 py-2 ${
                type === tab ? "bg-sakura text-white" : "border border-border-subtle bg-charcoal text-rice"
              }`}
            >
              {tab.replaceAll("_", " ")}
            </button>
          ))}
        </div>

        <div className="space-y-3">
          {rows.map((row) => (
            <article key={`${row.chapter._id}-${row.rank}`} className="ink-panel rounded-2xl p-4">
              <div className="flex items-center justify-between gap-3">
                <div className="flex min-w-0 items-center gap-3">
                  <p className="type-h3 text-sakura">#{row.rank}</p>
                  <div>
                    <h2 className="type-h4 text-rice">{row.series?.title ?? "Unknown series"}</h2>
                    <p className="type-small text-muted-foreground">Chapter {row.chapter.chapterNumber} - {row.chapter.title}</p>
                  </div>
                </div>
                <p className="type-small text-muted-dark">score {compactNumber(row.score)}</p>
              </div>
              <div className="mt-3 flex flex-wrap gap-2">
                <Link href={`/chapter/${row.chapter._id}`} className="type-small rounded-xl bg-sakura px-3 py-2 text-white">
                  Open chapter
                </Link>
                {row.series ? (
                  <Link href={`/series/${row.series._id}`} className="type-small rounded-xl border border-border-subtle px-3 py-2 text-rice">
                    View series
                  </Link>
                ) : null}
              </div>
            </article>
          ))}
        </div>
      </section>
    </SiteShell>
  );
}
