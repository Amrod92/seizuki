export const MAX_PAGES_PER_CHAPTER = 80;
export const MAX_FILE_SIZE_BYTES = 20 * 1024 * 1024;

export const COMMENT_MAX_LENGTH = 140;

export const COMMENT_COOLDOWN_MS = 8_000;
export const REACTION_COOLDOWN_MS = 1_000;
export const VOTES_PER_MINUTE = 20;
export const VOTES_PER_DAY = 300;

export const LOW_SCORE_COLLAPSE_THRESHOLD = -5;

export const HOME_TABS = ["TRENDING", "NEW", "RISING", "MOST_DISCUSSED"] as const;
export const RANKING_PERIODS = ["WEEK", "MONTH", "YEAR", "ALL_TIME"] as const;

export const REACTION_EMOJIS = ["🔥", "😭", "🤯", "👏", "💯", "❤️"];

export const PUBLIC_ROUTES = [
  "/",
  "/explore",
  "/series",
  "/chapter",
  "/creator",
  "/rankings",
  "/login",
];
