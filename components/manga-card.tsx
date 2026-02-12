import Link from "next/link";
import { HomeFeedItem } from "@/lib/types";
import { compactNumber, timeAgo } from "@/lib/format";

export function MangaCard({ item }: { item: HomeFeedItem }) {
  return (
    <article className="ink-panel group rounded-2xl p-3 transition-transform hover:-translate-y-1">
      <Link href={`/chapter/${item.chapterId}`} className="block">
        <div className="relative aspect-[2/3] overflow-hidden rounded-xl">
          <img src={item.coverUrl} alt={`${item.title} cover`} className="h-full w-full object-cover" />
          <div className="absolute left-2 top-2 flex gap-1">
            {item.badges.map((badge) => (
              <span
                key={badge}
                className={`type-micro rounded-full px-2 py-0.5 font-bold ${
                  badge === "NEW" ? "bg-crimson text-white" : "bg-sakura text-white"
                }`}
              >
                {badge}
              </span>
            ))}
          </div>
        </div>
      </Link>

      <div className="mt-3 space-y-2">
        <Link href={`/series/${item.seriesId}`} className="type-h4 line-clamp-1 text-rice transition-colors hover:text-sakura">
          {item.title}
        </Link>
        <Link href={`/creator/${item.creatorId}`} className="type-small text-sakura hover:text-sakura/85">
          @{item.creatorName}
        </Link>
        <div className="type-small flex items-center justify-between text-rice">
          <span>{item.rating.toFixed(1)} ink</span>
          <span className="text-muted-dark">{compactNumber(item.commentCount)} comments</span>
        </div>
        <div className="type-small flex items-center justify-between text-muted-dark">
          <span>{compactNumber(item.viewCount)} views</span>
          <span>Updated {timeAgo(item.updatedAt)}</span>
        </div>
      </div>
    </article>
  );
}
