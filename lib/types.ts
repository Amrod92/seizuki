export type OAuthProvider = "google" | "discord" | "apple";

export type ReadingMode = "MANGA" | "COMIC" | "SCROLL";
export type ReadingDirection = "RTL" | "LTR" | null;

export type SeriesStatus = "ACTIVE" | "ARCHIVED";
export type ChapterStatus = "DRAFT" | "PUBLISHED";

export type NotificationType =
  | "NEW_CHAPTER"
  | "REPLY"
  | "COMMENT_REACTION"
  | "FOLLOWED_CREATOR_NEW_CHAPTER"
  | "SYSTEM";

export type ReportTargetType = "SERIES" | "CHAPTER" | "COMMENT" | "USER";
export type ReportStatus = "OPEN" | "REVIEWING" | "CLOSED";

export type RankingPeriod = "WEEK" | "MONTH" | "YEAR" | "ALL_TIME";
export type RankingType = "TRENDING" | "RISING" | "MOST_DISCUSSED" | "TOP_RATED";
export type HomeFeedType = "TRENDING" | "NEW" | "RISING" | "MOST_DISCUSSED";

export type ThreadSort = "TOP" | "NEW";

export interface User {
  _id: string;
  provider: OAuthProvider;
  providerId: string;
  username: string;
  avatarUrl: string;
  bio?: string;
  isCreator: boolean;
  createdAt: number;
  lastActiveAt: number;
  reputationScore: number;
  isBanned: boolean;
}

export interface Series {
  _id: string;
  creatorId: string;
  title: string;
  description: string;
  tags: string[];
  language: string;
  isMature: boolean;
  contentWarnings?: string[];
  coverImageStorageId: string;
  readingMode: ReadingMode;
  readingDirection: ReadingDirection;
  status: SeriesStatus;
  createdAt: number;
  updatedAt: number;
  averageRating: number;
  ratingCount: number;
}

export interface Chapter {
  _id: string;
  seriesId: string;
  creatorId: string;
  chapterNumber: number;
  title?: string;
  notes?: string;
  status: ChapterStatus;
  publishedAt: number | null;
  createdAt: number;
  updatedAt: number;
  pageCount: number;
  commentCount: number;
  reactionCount: number;
  viewCount: number;
}

export interface Page {
  _id: string;
  chapterId: string;
  seriesId: string;
  pageNumber: number;
  storageIdOriginal: string;
  storageIdLarge?: string;
  storageIdMedium?: string;
  storageIdThumb?: string;
  width: number;
  height: number;
  bytes: number;
  imageUrl: string;
  createdAt: number;
}

export interface Comment {
  _id: string;
  chapterId: string;
  seriesId: string;
  pageNumber: number;
  authorId: string;
  parentCommentId: string | null;
  body: string;
  createdAt: number;
  editedAt?: number;
  isDeleted: boolean;
  isPinned: boolean;
  score: number;
  upvoteCount: number;
  downvoteCount: number;
}

export interface CommentVote {
  _id: string;
  commentId: string;
  voterId: string;
  value: 1 | -1;
  createdAt: number;
}

export interface Reaction {
  _id: string;
  chapterId: string;
  seriesId: string;
  pageNumber: number;
  userId: string;
  emoji: string;
  createdAt: number;
}

export interface Follow {
  _id: string;
  followerId: string;
  creatorId: string;
  createdAt: number;
}

export interface Notification {
  _id: string;
  userId: string;
  type: NotificationType;
  payload: Record<string, string | number | boolean>;
  isRead: boolean;
  createdAt: number;
}

export interface Report {
  _id: string;
  reporterId: string;
  targetType: ReportTargetType;
  targetId: string;
  reason: string;
  details?: string;
  createdAt: number;
  status: ReportStatus;
}

export interface RankingItem {
  chapterId: string;
  score: number;
  rank: number;
}

export interface RankingRollup {
  _id: string;
  period: RankingPeriod;
  type: RankingType;
  items: RankingItem[];
  computedAt: number;
}

export interface PageHeat {
  _id: string;
  chapterId: string;
  pageNumber: number;
  heatScore: number;
  computedAt: number;
}

export interface HomeFeedItem {
  seriesId: string;
  chapterId: string;
  creatorId: string;
  coverUrl: string;
  title: string;
  creatorName: string;
  rating: number;
  commentCount: number;
  viewCount: number;
  updatedAt: number;
  badges: Array<"NEW" | "TRENDING">;
}

export interface CreatorProfile {
  user: User;
  followerCount: number;
  series: Series[];
  stats: {
    reads: number;
    comments: number;
    reactions: number;
  };
}

export interface OverlayStream {
  comments: Comment[];
  reactions: Reaction[];
  reactingNowCount: number;
}

export interface PageThread {
  comments: Comment[];
  repliesByParentId: Record<string, Comment[]>;
}

export interface SessionUser {
  _id: string;
  username: string;
  avatarUrl: string;
  provider: OAuthProvider;
  isCreator: boolean;
}

export interface SeriesFormInput {
  title: string;
  description: string;
  tags: string[];
  language: string;
  isMature: boolean;
  contentWarnings?: string[];
  readingMode: ReadingMode;
  readingDirection: ReadingDirection;
}

export interface ChapterDraftInput {
  chapterNumber: number;
  title?: string;
  notes?: string;
}

export interface MutationResult<T> {
  ok: boolean;
  data?: T;
  error?: string;
}
