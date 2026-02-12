import {
  COMMENT_COOLDOWN_MS,
  COMMENT_MAX_LENGTH,
  LOW_SCORE_COLLAPSE_THRESHOLD,
  MAX_PAGES_PER_CHAPTER,
  REACTION_COOLDOWN_MS,
  VOTES_PER_DAY,
  VOTES_PER_MINUTE,
} from "@/lib/constants";
import {
  chaptersSeed,
  commentVotesSeed,
  commentsSeed,
  followsSeed,
  notificationsSeed,
  pagesSeed,
  rankingRollupsSeed,
  reactionsSeed,
  reportsSeed,
  seriesSeed,
  usersSeed,
} from "@/lib/mock-data";
import {
  Chapter,
  ChapterDraftInput,
  Comment,
  CommentVote,
  CreatorProfile,
  Follow,
  HomeFeedItem,
  HomeFeedType,
  MutationResult,
  Notification,
  OAuthProvider,
  OverlayStream,
  Page,
  PageThread,
  RankingPeriod,
  RankingType,
  Reaction,
  Report,
  ReportTargetType,
  Series,
  SeriesFormInput,
  SessionUser,
  ThreadSort,
  User,
} from "@/lib/types";

interface Database {
  users: User[];
  series: Series[];
  chapters: Chapter[];
  pages: Page[];
  comments: Comment[];
  commentVotes: CommentVote[];
  reactions: Reaction[];
  follows: Follow[];
  notifications: Notification[];
  reports: Report[];
}

const deepClone = <T>(value: T): T => JSON.parse(JSON.stringify(value)) as T;

const db: Database = {
  users: deepClone(usersSeed),
  series: deepClone(seriesSeed),
  chapters: deepClone(chaptersSeed),
  pages: deepClone(pagesSeed),
  comments: deepClone(commentsSeed),
  commentVotes: deepClone(commentVotesSeed),
  reactions: deepClone(reactionsSeed),
  follows: deepClone(followsSeed),
  notifications: deepClone(notificationsSeed),
  reports: deepClone(reportsSeed),
};

const rankingRollups = deepClone(rankingRollupsSeed);

const rateState = {
  lastCommentAt: new Map<string, number>(),
  lastReactionAt: new Map<string, number>(),
  voteHistory: new Map<string, number[]>(),
};

const counters: Record<string, number> = {
  series: 100,
  chapter: 100,
  page: 100,
  comment: 100,
  vote: 100,
  reaction: 100,
  follow: 100,
  notification: 100,
  report: 100,
  user: 100,
};

const nextId = (prefix: keyof typeof counters): string => {
  counters[prefix] += 1;
  return `${prefix}_${counters[prefix]}`;
};

const now = () => Date.now();

const findUser = (userId: string | null | undefined): User | null => {
  if (!userId) {
    return null;
  }
  return db.users.find((user) => user._id === userId) ?? null;
};

const toSessionUser = (user: User): SessionUser => ({
  _id: user._id,
  username: user.username,
  avatarUrl: user.avatarUrl,
  provider: user.provider,
  isCreator: user.isCreator,
});

const isChapterPublished = (chapterId: string): boolean => {
  const chapter = db.chapters.find((entry) => entry._id === chapterId);
  return chapter?.status === "PUBLISHED";
};

const assertAuthed = (userId: string | null | undefined): MutationResult<null> => {
  const user = findUser(userId);
  if (!user) {
    return { ok: false, error: "Sign in required." };
  }
  if (user.isBanned) {
    return { ok: false, error: "This account is restricted." };
  }
  return { ok: true, data: null };
};

const ensureCreatorOwnsSeries = (creatorId: string, seriesId: string): boolean => {
  return db.series.some((entry) => entry._id === seriesId && entry.creatorId === creatorId);
};

const computeFeedScore = (chapter: Chapter, series: Series, creatorFollowerCount: number): number => {
  const recencyHours = chapter.publishedAt ? Math.max(1, (now() - chapter.publishedAt) / 3_600_000) : 72;
  const recencyBoost = 24 / recencyHours;
  return chapter.viewCount * 0.003 + chapter.commentCount * 2 + chapter.reactionCount * 0.4 + series.averageRating * 8 + creatorFollowerCount * 0.03 + recencyBoost;
};

const buildFeedItem = (chapter: Chapter): HomeFeedItem | null => {
  const series = db.series.find((entry) => entry._id === chapter.seriesId);
  if (!series) {
    return null;
  }
  const creator = db.users.find((entry) => entry._id === chapter.creatorId);
  if (!creator) {
    return null;
  }
  const creatorFollowerCount = db.follows.filter((follow) => follow.creatorId === creator._id).length;
  const isNew = chapter.publishedAt ? now() - chapter.publishedAt < 48 * 3_600_000 : false;
  const trendingThreshold = computeFeedScore(chapter, series, creatorFollowerCount) > 70;

  return {
    seriesId: series._id,
    chapterId: chapter._id,
    creatorId: creator._id,
    coverUrl: `https://picsum.photos/seed/${series.coverImageStorageId}/640/960`,
    title: series.title,
    creatorName: creator.username,
    rating: series.averageRating,
    commentCount: chapter.commentCount,
    viewCount: chapter.viewCount,
    updatedAt: chapter.updatedAt,
    badges: [isNew ? "NEW" : null, trendingThreshold ? "TRENDING" : null].filter(Boolean) as Array<
      "NEW" | "TRENDING"
    >,
  };
};

const activePublishedChapters = (): Chapter[] =>
  db.chapters.filter((chapter) => chapter.status === "PUBLISHED").sort((a, b) => (b.publishedAt ?? 0) - (a.publishedAt ?? 0));

const sortByFeedType = (feedType: HomeFeedType, chapters: Chapter[]): Chapter[] => {
  switch (feedType) {
    case "NEW":
      return [...chapters].sort((a, b) => (b.publishedAt ?? 0) - (a.publishedAt ?? 0));
    case "MOST_DISCUSSED":
      return [...chapters].sort((a, b) => b.commentCount - a.commentCount);
    case "RISING":
      return [...chapters].sort((a, b) => {
        const aFollowers = db.follows.filter((follow) => follow.creatorId === a.creatorId).length;
        const bFollowers = db.follows.filter((follow) => follow.creatorId === b.creatorId).length;
        const aScore = a.commentCount + a.reactionCount * 0.5 + aFollowers * 1.4;
        const bScore = b.commentCount + b.reactionCount * 0.5 + bFollowers * 1.4;
        return bScore - aScore;
      });
    case "TRENDING":
    default:
      return [...chapters].sort((a, b) => {
        const aSeries = db.series.find((series) => series._id === a.seriesId);
        const bSeries = db.series.find((series) => series._id === b.seriesId);
        if (!aSeries || !bSeries) {
          return 0;
        }
        const aFollowers = db.follows.filter((follow) => follow.creatorId === a.creatorId).length;
        const bFollowers = db.follows.filter((follow) => follow.creatorId === b.creatorId).length;
        return computeFeedScore(b, bSeries, bFollowers) - computeFeedScore(a, aSeries, aFollowers);
      });
  }
};

const touchUser = (userId: string) => {
  const user = db.users.find((entry) => entry._id === userId);
  if (user) {
    user.lastActiveAt = now();
  }
};

const isCreatorOrOwner = (userId: string, chapter: Chapter): boolean => chapter.creatorId === userId;

const pushNotification = (userId: string, type: Notification["type"], payload: Notification["payload"]) => {
  db.notifications.push({
    _id: nextId("notification"),
    userId,
    type,
    payload,
    isRead: false,
    createdAt: now(),
  });
};

const getSeriesById = (seriesId: string): Series | null => db.series.find((series) => series._id === seriesId) ?? null;

const getChapterById = (chapterId: string): Chapter | null => db.chapters.find((chapter) => chapter._id === chapterId) ?? null;

const enforceVoteRateLimit = (userId: string): string | null => {
  const stamps = rateState.voteHistory.get(userId) ?? [];
  const oneMinuteAgo = now() - 60_000;
  const oneDayAgo = now() - 86_400_000;
  const minuteCount = stamps.filter((stamp) => stamp > oneMinuteAgo).length;
  const dayCount = stamps.filter((stamp) => stamp > oneDayAgo).length;

  if (minuteCount >= VOTES_PER_MINUTE) {
    return "Vote rate limit reached for this minute.";
  }

  if (dayCount >= VOTES_PER_DAY) {
    return "Daily vote limit reached.";
  }

  rateState.voteHistory.set(userId, stamps.filter((stamp) => stamp > oneDayAgo).concat(now()));
  return null;
};

export const listSeries = (): Series[] => [...db.series].sort((a, b) => b.updatedAt - a.updatedAt);

export const getSeriesByCreator = (creatorId: string): Series[] =>
  db.series.filter((series) => series.creatorId === creatorId).sort((a, b) => b.updatedAt - a.updatedAt);

export const listCreators = (): User[] =>
  db.users.filter((user) => user.isCreator && !user.isBanned).sort((a, b) => b.reputationScore - a.reputationScore);

export const getHomeFeed = (feedType: HomeFeedType): HomeFeedItem[] => {
  const chapters = sortByFeedType(feedType, activePublishedChapters());
  return chapters.map(buildFeedItem).filter(Boolean) as HomeFeedItem[];
};

export const searchDiscovery = (query: string, selectedTags: string[]): HomeFeedItem[] => {
  const normalizedQuery = query.trim().toLowerCase();
  return activePublishedChapters()
    .filter((chapter) => {
      const series = db.series.find((entry) => entry._id === chapter.seriesId);
      const creator = db.users.find((entry) => entry._id === chapter.creatorId);
      if (!series || !creator) {
        return false;
      }

      const queryMatch =
        normalizedQuery.length === 0 ||
        series.title.toLowerCase().includes(normalizedQuery) ||
        creator.username.toLowerCase().includes(normalizedQuery) ||
        series.tags.some((tag) => tag.toLowerCase().includes(normalizedQuery));

      const tagMatch = selectedTags.length === 0 || selectedTags.every((tag) => series.tags.includes(tag));
      return queryMatch && tagMatch;
    })
    .map(buildFeedItem)
    .filter(Boolean) as HomeFeedItem[];
};

export const getSeries = (seriesId: string): (Series & { creator: User | null }) | null => {
  const series = getSeriesById(seriesId);
  if (!series) {
    return null;
  }
  return {
    ...series,
    creator: db.users.find((user) => user._id === series.creatorId) ?? null,
  };
};

export const getChaptersBySeries = (seriesId: string, viewerId?: string | null): Chapter[] => {
  const isOwner = !!viewerId && ensureCreatorOwnsSeries(viewerId, seriesId);
  return db.chapters
    .filter((chapter) => chapter.seriesId === seriesId)
    .filter((chapter) => chapter.status === "PUBLISHED" || isOwner)
    .sort((a, b) => b.chapterNumber - a.chapterNumber);
};

export const getChapterPages = (chapterId: string): Page[] => {
  const chapter = getChapterById(chapterId);
  if (!chapter) {
    return [];
  }
  return db.pages
    .filter((page) => page.chapterId === chapterId)
    .sort((a, b) => a.pageNumber - b.pageNumber)
    .filter((page) => page.pageNumber > 0);
};

export const getChapter = (chapterId: string): Chapter | null => getChapterById(chapterId);

export const getOverlayStream = (chapterId: string, pageNumber: number): OverlayStream => {
  const comments = db.comments
    .filter((comment) => comment.chapterId === chapterId && comment.pageNumber === pageNumber && !comment.isDeleted)
    .sort((a, b) => b.createdAt - a.createdAt)
    .slice(0, 12);

  const reactions = db.reactions
    .filter((reaction) => reaction.chapterId === chapterId && reaction.pageNumber === pageNumber)
    .sort((a, b) => b.createdAt - a.createdAt)
    .slice(0, 24);

  const reactingNowCount = new Set(
    reactions.filter((reaction) => now() - reaction.createdAt < 30_000).map((reaction) => reaction.userId),
  ).size;

  return {
    comments,
    reactions,
    reactingNowCount,
  };
};

export const getPageThread = (chapterId: string, pageNumber: number, sort: ThreadSort): PageThread => {
  const pageComments = db.comments.filter(
    (comment) =>
      comment.chapterId === chapterId &&
      comment.pageNumber === pageNumber &&
      !comment.isDeleted &&
      comment.parentCommentId === null,
  );

  const ordered = [...pageComments].sort((a, b) => {
    if (sort === "NEW") {
      return b.createdAt - a.createdAt;
    }
    if (a.isPinned !== b.isPinned) {
      return a.isPinned ? -1 : 1;
    }
    if (b.score !== a.score) {
      return b.score - a.score;
    }
    return b.createdAt - a.createdAt;
  });

  const repliesByParentId: Record<string, Comment[]> = {};
  for (const reply of db.comments.filter(
    (comment) => comment.chapterId === chapterId && comment.pageNumber === pageNumber && !!comment.parentCommentId,
  )) {
    const parentId = reply.parentCommentId as string;
    if (!repliesByParentId[parentId]) {
      repliesByParentId[parentId] = [];
    }
    repliesByParentId[parentId].push(reply);
  }

  Object.values(repliesByParentId).forEach((replies) => replies.sort((a, b) => a.createdAt - b.createdAt));

  return {
    comments: ordered,
    repliesByParentId,
  };
};

export const getCreatorProfile = (creatorId: string): CreatorProfile | null => {
  const user = db.users.find((entry) => entry._id === creatorId && entry.isCreator);
  if (!user) {
    return null;
  }

  const series = db.series
    .filter((entry) => entry.creatorId === creatorId)
    .sort((a, b) => b.updatedAt - a.updatedAt);

  const chapterIds = db.chapters.filter((chapter) => chapter.creatorId === creatorId).map((chapter) => chapter._id);

  const reads = db.chapters
    .filter((chapter) => chapter.creatorId === creatorId)
    .reduce((sum, chapter) => sum + chapter.viewCount, 0);
  const comments = db.comments.filter((comment) => chapterIds.includes(comment.chapterId) && !comment.isDeleted).length;
  const reactions = db.reactions.filter((reaction) => chapterIds.includes(reaction.chapterId)).length;

  return {
    user,
    followerCount: db.follows.filter((follow) => follow.creatorId === creatorId).length,
    series,
    stats: {
      reads,
      comments,
      reactions,
    },
  };
};

export const isFollowingCreator = (followerId: string | null | undefined, creatorId: string): boolean => {
  if (!followerId) {
    return false;
  }
  return db.follows.some((follow) => follow.followerId === followerId && follow.creatorId === creatorId);
};

export const getRankings = (period: RankingPeriod, type: RankingType): Array<{ chapter: Chapter; series: Series | null; score: number; rank: number }> => {
  const rollup = rankingRollups.find((entry) => entry.period === period && entry.type === type);

  if (!rollup) {
    return activePublishedChapters().slice(0, 10).map((chapter, index) => ({
      chapter,
      series: getSeriesById(chapter.seriesId),
      score: chapter.commentCount + chapter.reactionCount * 0.4 + chapter.viewCount * 0.002,
      rank: index + 1,
    }));
  }

  return rollup.items
    .map((item) => {
      const chapter = getChapterById(item.chapterId);
      if (!chapter) {
        return null;
      }
      return {
        chapter,
        series: getSeriesById(chapter.seriesId),
        score: item.score,
        rank: item.rank,
      };
    })
    .filter(Boolean) as Array<{ chapter: Chapter; series: Series | null; score: number; rank: number }>;
};

export const getNotifications = (userId: string): Notification[] =>
  db.notifications.filter((notification) => notification.userId === userId).sort((a, b) => b.createdAt - a.createdAt);

export const markAllNotificationsRead = (userId: string): MutationResult<number> => {
  const guard = assertAuthed(userId);
  if (!guard.ok) {
    return { ok: false, error: guard.error };
  }

  let updated = 0;
  for (const notification of db.notifications) {
    if (notification.userId === userId && !notification.isRead) {
      notification.isRead = true;
      updated += 1;
    }
  }

  return { ok: true, data: updated };
};

export const loginWithProvider = (provider: OAuthProvider): SessionUser => {
  const existing = db.users.find((user) => user.provider === provider && !user.isBanned);

  if (existing) {
    touchUser(existing._id);
    return toSessionUser(existing);
  }

  const user: User = {
    _id: nextId("user"),
    provider,
    providerId: `${provider}_${nextId("user")}`,
    username: `${provider}_reader_${Math.floor(Math.random() * 1000)}`,
    avatarUrl: `https://picsum.photos/seed/${provider}-new/80/80`,
    isCreator: false,
    createdAt: now(),
    lastActiveAt: now(),
    reputationScore: 0,
    isBanned: false,
  };

  db.users.push(user);
  return toSessionUser(user);
};

export const getSessionUser = (userId: string | null | undefined): SessionUser | null => {
  const user = findUser(userId);
  return user ? toSessionUser(user) : null;
};

export const updateProfile = (
  userId: string | null | undefined,
  patch: { username?: string; bio?: string; avatarUrl?: string },
): MutationResult<User> => {
  const guard = assertAuthed(userId);
  if (!guard.ok) {
    return { ok: false, error: guard.error };
  }

  const user = findUser(userId);
  if (!user) {
    return { ok: false, error: "User not found." };
  }

  if (patch.username !== undefined && patch.username.trim().length > 0) {
    const username = patch.username.trim();
    const alreadyUsed = db.users.some((candidate) => candidate._id !== userId && candidate.username === username);
    if (alreadyUsed) {
      return { ok: false, error: "Username is already taken." };
    }
    user.username = username;
  }

  if (patch.bio !== undefined) {
    user.bio = patch.bio.trim();
  }

  if (patch.avatarUrl !== undefined && patch.avatarUrl.trim().length > 0) {
    user.avatarUrl = patch.avatarUrl.trim();
  }

  touchUser(user._id);
  return { ok: true, data: user };
};

export const createSeries = (userId: string | null | undefined, input: SeriesFormInput): MutationResult<Series> => {
  const guard = assertAuthed(userId);
  if (!guard.ok) {
    return { ok: false, error: guard.error };
  }

  const user = findUser(userId);
  if (!user) {
    return { ok: false, error: "User not found." };
  }

  const created: Series = {
    _id: nextId("series"),
    creatorId: user._id,
    title: input.title.trim(),
    description: input.description.trim(),
    tags: input.tags,
    language: input.language,
    isMature: input.isMature,
    contentWarnings: input.contentWarnings?.filter(Boolean),
    coverImageStorageId: `cover_${nextId("series")}`,
    readingMode: input.readingMode,
    readingDirection: input.readingDirection,
    status: "ACTIVE",
    createdAt: now(),
    updatedAt: now(),
    averageRating: 0,
    ratingCount: 0,
  };

  user.isCreator = true;
  db.series.push(created);

  return { ok: true, data: created };
};

export const updateSeries = (
  userId: string | null | undefined,
  seriesId: string,
  patch: Partial<SeriesFormInput>,
): MutationResult<Series> => {
  const guard = assertAuthed(userId);
  if (!guard.ok) {
    return { ok: false, error: guard.error };
  }

  const series = getSeriesById(seriesId);
  if (!series) {
    return { ok: false, error: "Series not found." };
  }

  if (series.creatorId !== userId) {
    return { ok: false, error: "You cannot edit this series." };
  }

  if (patch.title !== undefined) {
    series.title = patch.title.trim();
  }
  if (patch.description !== undefined) {
    series.description = patch.description.trim();
  }
  if (patch.tags !== undefined) {
    series.tags = patch.tags;
  }
  if (patch.language !== undefined) {
    series.language = patch.language;
  }
  if (patch.isMature !== undefined) {
    series.isMature = patch.isMature;
  }
  if (patch.contentWarnings !== undefined) {
    series.contentWarnings = patch.contentWarnings;
  }
  if (patch.readingMode !== undefined) {
    series.readingMode = patch.readingMode;
  }
  if (patch.readingDirection !== undefined) {
    series.readingDirection = patch.readingDirection;
  }

  series.updatedAt = now();
  return { ok: true, data: series };
};

export const createChapterDraft = (
  userId: string | null | undefined,
  seriesId: string,
  input: ChapterDraftInput,
): MutationResult<Chapter> => {
  const guard = assertAuthed(userId);
  if (!guard.ok) {
    return { ok: false, error: guard.error };
  }

  if (!ensureCreatorOwnsSeries(userId as string, seriesId)) {
    return { ok: false, error: "You cannot create drafts for this series." };
  }

  const draft: Chapter = {
    _id: nextId("chapter"),
    seriesId,
    creatorId: userId as string,
    chapterNumber: input.chapterNumber,
    title: input.title,
    notes: input.notes,
    status: "DRAFT",
    publishedAt: null,
    createdAt: now(),
    updatedAt: now(),
    pageCount: 0,
    commentCount: 0,
    reactionCount: 0,
    viewCount: 0,
  };

  db.chapters.push(draft);
  return { ok: true, data: draft };
};

export const addPageToDraft = (
  userId: string | null | undefined,
  chapterId: string,
  imageUrl: string,
): MutationResult<Page> => {
  const guard = assertAuthed(userId);
  if (!guard.ok) {
    return { ok: false, error: guard.error };
  }

  const chapter = getChapterById(chapterId);
  if (!chapter) {
    return { ok: false, error: "Chapter not found." };
  }

  if (!isCreatorOrOwner(userId as string, chapter)) {
    return { ok: false, error: "You cannot edit this chapter." };
  }

  if (chapter.status !== "DRAFT") {
    return { ok: false, error: "Published chapters cannot add pages." };
  }

  const chapterPages = getChapterPages(chapterId);
  if (chapterPages.length >= MAX_PAGES_PER_CHAPTER) {
    return { ok: false, error: `Page limit reached (${MAX_PAGES_PER_CHAPTER}).` };
  }

  const pageNumber = chapterPages.length + 1;
  const page: Page = {
    _id: nextId("page"),
    chapterId,
    seriesId: chapter.seriesId,
    pageNumber,
    storageIdOriginal: `orig_${chapterId}_${pageNumber}`,
    storageIdLarge: `lg_${chapterId}_${pageNumber}`,
    storageIdMedium: `md_${chapterId}_${pageNumber}`,
    storageIdThumb: `th_${chapterId}_${pageNumber}`,
    width: 1300,
    height: 1900,
    bytes: 1_100_000,
    imageUrl,
    createdAt: now(),
  };

  db.pages.push(page);
  chapter.pageCount += 1;
  chapter.updatedAt = now();

  return { ok: true, data: page };
};

export const reorderDraftPages = (
  userId: string | null | undefined,
  chapterId: string,
  newOrder: string[],
): MutationResult<Page[]> => {
  const guard = assertAuthed(userId);
  if (!guard.ok) {
    return { ok: false, error: guard.error };
  }

  const chapter = getChapterById(chapterId);
  if (!chapter) {
    return { ok: false, error: "Chapter not found." };
  }

  if (!isCreatorOrOwner(userId as string, chapter)) {
    return { ok: false, error: "You cannot reorder this chapter." };
  }

  if (chapter.status !== "DRAFT") {
    return { ok: false, error: "Page order is locked after publish." };
  }

  const chapterPages = getChapterPages(chapterId);
  if (chapterPages.length !== newOrder.length) {
    return { ok: false, error: "New order must include all pages." };
  }

  const pageById = new Map(chapterPages.map((page) => [page._id, page]));
  if (newOrder.some((pageId) => !pageById.has(pageId))) {
    return { ok: false, error: "Invalid page order payload." };
  }

  newOrder.forEach((pageId, index) => {
    const page = pageById.get(pageId);
    if (page) {
      page.pageNumber = index + 1;
    }
  });

  chapter.updatedAt = now();

  return {
    ok: true,
    data: getChapterPages(chapterId),
  };
};

export const publishChapter = (userId: string | null | undefined, chapterId: string): MutationResult<Chapter> => {
  const guard = assertAuthed(userId);
  if (!guard.ok) {
    return { ok: false, error: guard.error };
  }

  const chapter = getChapterById(chapterId);
  if (!chapter) {
    return { ok: false, error: "Chapter not found." };
  }

  if (!isCreatorOrOwner(userId as string, chapter)) {
    return { ok: false, error: "You cannot publish this chapter." };
  }

  if (chapter.status === "PUBLISHED") {
    return { ok: false, error: "Chapter is already published." };
  }

  const pages = getChapterPages(chapterId);
  if (pages.length < 1) {
    return { ok: false, error: "At least one page is required to publish." };
  }

  chapter.status = "PUBLISHED";
  chapter.publishedAt = now();
  chapter.updatedAt = now();
  chapter.pageCount = pages.length;

  const followers = db.follows.filter((follow) => follow.creatorId === chapter.creatorId);
  for (const follow of followers) {
    pushNotification(follow.followerId, "FOLLOWED_CREATOR_NEW_CHAPTER", {
      chapterId: chapter._id,
      seriesId: chapter.seriesId,
      creatorId: chapter.creatorId,
    });
  }

  return { ok: true, data: chapter };
};

export const unpublishChapter = (userId: string | null | undefined, chapterId: string): MutationResult<Chapter> => {
  const guard = assertAuthed(userId);
  if (!guard.ok) {
    return { ok: false, error: guard.error };
  }

  const chapter = getChapterById(chapterId);
  if (!chapter) {
    return { ok: false, error: "Chapter not found." };
  }

  if (!isCreatorOrOwner(userId as string, chapter)) {
    return { ok: false, error: "You cannot unpublish this chapter." };
  }

  if (chapter.status !== "PUBLISHED") {
    return { ok: false, error: "Chapter is already a draft." };
  }

  const hasComments = db.comments.some((comment) => comment.chapterId === chapterId && !comment.isDeleted);
  const hasReactions = db.reactions.some((reaction) => reaction.chapterId === chapterId);

  if (hasComments || hasReactions) {
    return {
      ok: false,
      error: "Unpublish is blocked when comments/reactions exist. Publish a corrected chapter instead.",
    };
  }

  chapter.status = "DRAFT";
  chapter.publishedAt = null;
  chapter.updatedAt = now();

  return { ok: true, data: chapter };
};

export const replacePublishedPageImage = (
  userId: string | null | undefined,
  chapterId: string,
  pageNumber: number,
  imageUrl: string,
): MutationResult<Page> => {
  const guard = assertAuthed(userId);
  if (!guard.ok) {
    return { ok: false, error: guard.error };
  }

  const chapter = getChapterById(chapterId);
  if (!chapter) {
    return { ok: false, error: "Chapter not found." };
  }

  if (!isCreatorOrOwner(userId as string, chapter)) {
    return { ok: false, error: "You cannot update this chapter." };
  }

  if (chapter.status !== "PUBLISHED") {
    return { ok: false, error: "Only published chapters support in-place page replacement." };
  }

  const page = db.pages.find((entry) => entry.chapterId === chapterId && entry.pageNumber === pageNumber);
  if (!page) {
    return { ok: false, error: "Page not found." };
  }

  page.imageUrl = imageUrl;
  chapter.updatedAt = now();

  return { ok: true, data: page };
};

export const addComment = (
  userId: string | null | undefined,
  chapterId: string,
  pageNumber: number,
  body: string,
  parentCommentId: string | null = null,
): MutationResult<Comment> => {
  const guard = assertAuthed(userId);
  if (!guard.ok) {
    return { ok: false, error: guard.error };
  }

  const chapter = getChapterById(chapterId);
  if (!chapter || chapter.status !== "PUBLISHED") {
    return { ok: false, error: "Comments are allowed only on published chapters." };
  }

  const cooldown = rateState.lastCommentAt.get(userId as string);
  if (cooldown && now() - cooldown < COMMENT_COOLDOWN_MS) {
    return {
      ok: false,
      error: `Comment rate limit: one every ${Math.floor(COMMENT_COOLDOWN_MS / 1000)} seconds.`,
    };
  }

  const trimmedBody = body.trim();
  if (!trimmedBody) {
    return { ok: false, error: "Comment cannot be empty." };
  }

  if (trimmedBody.length > COMMENT_MAX_LENGTH) {
    return { ok: false, error: `Comment max length is ${COMMENT_MAX_LENGTH} characters.` };
  }

  const comment: Comment = {
    _id: nextId("comment"),
    chapterId,
    seriesId: chapter.seriesId,
    pageNumber,
    authorId: userId as string,
    parentCommentId,
    body: trimmedBody,
    createdAt: now(),
    isDeleted: false,
    isPinned: false,
    score: 0,
    upvoteCount: 0,
    downvoteCount: 0,
  };

  db.comments.push(comment);
  chapter.commentCount += 1;
  rateState.lastCommentAt.set(userId as string, now());

  if (parentCommentId) {
    const parent = db.comments.find((entry) => entry._id === parentCommentId);
    if (parent && parent.authorId !== userId) {
      pushNotification(parent.authorId, "REPLY", {
        chapterId,
        pageNumber,
        commentId: comment._id,
      });
    }
  }

  return { ok: true, data: comment };
};

export const voteComment = (
  userId: string | null | undefined,
  commentId: string,
  value: 1 | -1,
): MutationResult<Comment> => {
  const guard = assertAuthed(userId);
  if (!guard.ok) {
    return { ok: false, error: guard.error };
  }

  const rateLimitError = enforceVoteRateLimit(userId as string);
  if (rateLimitError) {
    return { ok: false, error: rateLimitError };
  }

  const comment = db.comments.find((entry) => entry._id === commentId && !entry.isDeleted);
  if (!comment) {
    return { ok: false, error: "Comment not found." };
  }

  if (!isChapterPublished(comment.chapterId)) {
    return { ok: false, error: "Votes are allowed only on published chapters." };
  }

  const existing = db.commentVotes.find((vote) => vote.commentId === commentId && vote.voterId === userId);

  if (existing) {
    if (existing.value === value) {
      return { ok: true, data: comment };
    }

    if (existing.value === 1) {
      comment.upvoteCount -= 1;
    } else {
      comment.downvoteCount -= 1;
    }

    existing.value = value;
    existing.createdAt = now();
  } else {
    db.commentVotes.push({
      _id: nextId("vote"),
      commentId,
      voterId: userId as string,
      value,
      createdAt: now(),
    });
  }

  if (value === 1) {
    comment.upvoteCount += 1;
  } else {
    comment.downvoteCount += 1;
  }

  comment.score = comment.upvoteCount - comment.downvoteCount;
  return { ok: true, data: comment };
};

export const addReaction = (
  userId: string | null | undefined,
  chapterId: string,
  pageNumber: number,
  emoji: string,
): MutationResult<Reaction> => {
  const guard = assertAuthed(userId);
  if (!guard.ok) {
    return { ok: false, error: guard.error };
  }

  const chapter = getChapterById(chapterId);
  if (!chapter || chapter.status !== "PUBLISHED") {
    return { ok: false, error: "Reactions are allowed only on published chapters." };
  }

  const last = rateState.lastReactionAt.get(userId as string);
  if (last && now() - last < REACTION_COOLDOWN_MS) {
    return {
      ok: false,
      error: `Reaction throttle: one every ${Math.floor(REACTION_COOLDOWN_MS / 1000)} second.`,
    };
  }

  const reaction: Reaction = {
    _id: nextId("reaction"),
    chapterId,
    seriesId: chapter.seriesId,
    pageNumber,
    userId: userId as string,
    emoji,
    createdAt: now(),
  };

  db.reactions.push(reaction);
  chapter.reactionCount += 1;
  rateState.lastReactionAt.set(userId as string, now());

  return { ok: true, data: reaction };
};

export const followCreator = (userId: string | null | undefined, creatorId: string): MutationResult<Follow> => {
  const guard = assertAuthed(userId);
  if (!guard.ok) {
    return { ok: false, error: guard.error };
  }

  if (userId === creatorId) {
    return { ok: false, error: "You cannot follow yourself." };
  }

  const creator = db.users.find((user) => user._id === creatorId && user.isCreator);
  if (!creator) {
    return { ok: false, error: "Creator not found." };
  }

  const existing = db.follows.find((follow) => follow.followerId === userId && follow.creatorId === creatorId);
  if (existing) {
    return { ok: true, data: existing };
  }

  const follow: Follow = {
    _id: nextId("follow"),
    followerId: userId as string,
    creatorId,
    createdAt: now(),
  };

  db.follows.push(follow);
  return { ok: true, data: follow };
};

export const unfollowCreator = (userId: string | null | undefined, creatorId: string): MutationResult<null> => {
  const guard = assertAuthed(userId);
  if (!guard.ok) {
    return { ok: false, error: guard.error };
  }

  const index = db.follows.findIndex((follow) => follow.followerId === userId && follow.creatorId === creatorId);
  if (index >= 0) {
    db.follows.splice(index, 1);
  }

  return { ok: true, data: null };
};

export const reportTarget = (
  userId: string | null | undefined,
  targetType: ReportTargetType,
  targetId: string,
  reason: string,
  details?: string,
): MutationResult<Report> => {
  const guard = assertAuthed(userId);
  if (!guard.ok) {
    return { ok: false, error: guard.error };
  }

  const report: Report = {
    _id: nextId("report"),
    reporterId: userId as string,
    targetType,
    targetId,
    reason,
    details,
    createdAt: now(),
    status: "OPEN",
  };

  db.reports.push(report);
  return { ok: true, data: report };
};

export const getDraftChaptersForCreator = (creatorId: string): Chapter[] =>
  db.chapters
    .filter((chapter) => chapter.creatorId === creatorId && chapter.status === "DRAFT")
    .sort((a, b) => b.updatedAt - a.updatedAt);

export const getPublishedChaptersForCreator = (creatorId: string): Chapter[] =>
  db.chapters
    .filter((chapter) => chapter.creatorId === creatorId && chapter.status === "PUBLISHED")
    .sort((a, b) => (b.publishedAt ?? 0) - (a.publishedAt ?? 0));

export const getCreatorStats = (creatorId: string): { followers: number; reads: number; comments: number; reactions: number } => {
  const creatorChapters = db.chapters.filter((chapter) => chapter.creatorId === creatorId);
  const chapterIds = creatorChapters.map((chapter) => chapter._id);

  return {
    followers: db.follows.filter((follow) => follow.creatorId === creatorId).length,
    reads: creatorChapters.reduce((sum, chapter) => sum + chapter.viewCount, 0),
    comments: db.comments.filter((comment) => chapterIds.includes(comment.chapterId) && !comment.isDeleted).length,
    reactions: db.reactions.filter((reaction) => chapterIds.includes(reaction.chapterId)).length,
  };
};

export const isCommentCollapsed = (comment: Comment): boolean => comment.score <= LOW_SCORE_COLLAPSE_THRESHOLD;
