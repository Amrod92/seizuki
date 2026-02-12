Below is a **complete, implementation-ready requirements spec** to build Seizuki. It’s written to be unambiguous and testable.

---

# Seizuki – Implementation Requirements (Community-First, Self-Published Manga/Comics)

## 0) Tech Stack Constraints

* **Frontend:** Next.js `16.1.6` (Turbopack), React `19.2.3`, TypeScript `^5`, Tailwind `^4`, shadcn `^3.8.4`, Radix UI `^1.4.3`, @base-ui/react `^1.1.0`
* **Backend + DB:** **Convex** (database, server functions, real-time subscriptions, file storage, cron/scheduled jobs)
* **Auth:** OAuth only via **Google / Discord / Apple**. Only logged-in users can comment/react/follow/vote.
* **No email/password** in MVP.
* **Monolith repo** (Next.js app + Convex functions) but **API-first** structure.

---

## 1) Product Positioning

* Community-first platform for **self-published** titles: anyone can upload manga/comics/webtoons.
* **Online reading only** (no download button). Implement “DRM-like deterrents” (see Section 10).
* **Live overlay reactions/comments** are a core differentiator:

  * Enabled on **all chapters**
  * **ON by default for everyone**
  * Non-logged users can **view overlay**, but **cannot interact**

---

## 2) Roles & Permissions

### Roles

* **Reader** (default)
* **Creator** (any user can become a creator)
* **Admin/Moderator** (internal)

### Permissions

* Anyone can browse and read **published** content.
* Only logged-in users can:

  * comment
  * reply
  * react (emoji or like)
  * vote (up/down on comments – MVP requires downvotes)
  * follow creators
  * report content/comments
* Only creators can upload/manage their own series/chapters/pages.
* Only admins/moderators can remove content platform-wide.

---

## 3) Typography & Brand Requirements

### Fonts

* **Brand font (logo + major headings):** `Yomogi`
* **UI font (all functional text):** `Zen Maru Gothic`

### Typography scale (desktop)

* H1 (brand): 48px lh 1.1 (Yomogi)
* H2: 36px lh 1.2 (Yomogi or Zen Maru Gothic if needed)
* H3: 24px lh 1.3 fw 600 (Zen Maru Gothic)
* H4: 20px lh 1.3 fw 600 (Zen Maru Gothic)
* Body lg: 18px lh 1.6
* Body: 16px lh 1.6
* Small: 14px lh 1.4
* Micro: 12px lh 1.4

### Mobile adjustments

* H1 36px, H2 28px, H3 20px, Body 16px, Small 13px (do not go below 13px)

---

## 4) Color Palette (Tokens)

Dark-first theme. Define CSS variables or Tailwind tokens.

* `ink`: `#111111` (primary dark background)
* `charcoal`: `#1C1C1E` (cards/modals)
* `rice`: `#F5F4F0` (light background)
* `sakura`: `#E94E77` (primary accent)
* `crimson`: `#B11226` (danger/premium/new)
* `twilight`: `#6C5CE7` (optional highlight)
* `border`: `#2A2A2D`
* `mutedDark`: `#A1A1AA`
* `mutedLight`: `#6B7280`

---

## 5) Core Entities & Data Model (Convex)

Use Convex tables (collections) with indexes for common queries.

### users

* `_id`
* `provider`: "google" | "discord" | "apple"
* `providerId`
* `username` (unique)
* `avatarUrl`
* `bio` (optional)
* `isCreator` boolean
* `createdAt`
* `lastActiveAt`
* `reputationScore` (internal; numeric)
* `isBanned` boolean (internal)
* Index: `by_username`, `by_provider_providerId`

### series

* `_id`
* `creatorId` (users._id)
* `title`
* `description`
* `tags` string[]
* `language` string
* `isMature` boolean
* `contentWarnings` string[] (optional)
* `coverImageStorageId` (Convex file storage id)
* **readingMode** enum: `MANGA | COMIC | SCROLL`
* **readingDirection** enum: `RTL | LTR | null` (null for SCROLL)
* `status`: `ACTIVE | ARCHIVED`
* `createdAt`, `updatedAt`
* Index: `by_creatorId`, `by_updatedAt`

### chapters

* `_id`
* `seriesId`
* `creatorId`
* `chapterNumber` (number or string; must be sortable)
* `title` (optional)
* `notes` (optional)
* `status`: `DRAFT | PUBLISHED`
* `publishedAt` (null if draft)
* `createdAt`, `updatedAt`
* `pageCount` (denormalized)
* `commentCount` (denormalized)
* `reactionCount` (denormalized)
* `viewCount` (denormalized)
* Index: `by_seriesId_chapterNumber`, `by_status_publishedAt`, `by_updatedAt`

### pages

* `_id`
* `chapterId`
* `seriesId`
* `pageNumber` (1..N contiguous for published)
* `storageIdOriginal`
* `storageIdLarge` (optional)
* `storageIdMedium` (optional)
* `storageIdThumb` (optional)
* `width`, `height`, `bytes`
* `createdAt`
* Index: `by_chapterId_pageNumber`

### comments

* `_id`
* `chapterId`
* `seriesId`
* `pageNumber` (required; overlay is page-bound; for “chapter-level” use pageNumber=0 optional but MVP can require actual pageNumber)
* `authorId` (users._id)
* `parentCommentId` (nullable)
* `body` (string; max 140 for overlay comment; thread can reuse same body in MVP for simplicity)
* `createdAt`
* `editedAt` (optional)
* `isDeleted` boolean
* `isPinned` boolean (creator-only)
* `score` number (denormalized = upvotes - downvotes)
* `upvoteCount` number
* `downvoteCount` number
* Index: `by_chapterId_pageNumber_createdAt`, `by_parentCommentId`, `by_chapterId_score`

### commentVotes

* `_id`
* `commentId`
* `voterId`
* `value` `+1 | -1`
* `createdAt`
* Unique constraint simulation via index: `by_commentId_voterId` (enforce one vote per user per comment)

### reactions

(Quick emoji bursts / lightweight reactions tied to page)

* `_id`
* `chapterId`
* `seriesId`
* `pageNumber`
* `userId`
* `emoji` string (e.g., "🔥", "😭", "🤯", "👏")
* `createdAt`
* Index: `by_chapterId_pageNumber_createdAt`, `by_userId_createdAt`

### follows

* `_id`
* `followerId`
* `creatorId` (users._id)
* `createdAt`
* Index unique: `by_followerId_creatorId`

### notifications

* `_id`
* `userId`
* `type`: `NEW_CHAPTER | REPLY | COMMENT_REACTION | FOLLOWED_CREATOR_NEW_CHAPTER | SYSTEM`
* `payload` object (typed)
* `isRead` boolean
* `createdAt`
* Index: `by_userId_createdAt`

### reports

* `_id`
* `reporterId`
* `targetType`: `SERIES | CHAPTER | COMMENT | USER`
* `targetId`
* `reason` string (enum or free text)
* `details` string optional
* `createdAt`
* `status`: `OPEN | REVIEWING | CLOSED`
* Index: `by_status_createdAt`

### rankingRollups (optional but recommended)

Precomputed metrics for performance

* `_id`
* `period`: `WEEK | MONTH | YEAR | ALL_TIME`
* `type`: `TRENDING | RISING | MOST_DISCUSSED | TOP_RATED`
* `items`: array of `{ chapterId, score, rank }`
* `computedAt`

### pageHeat (optional but recommended)

* `_id`
* `chapterId`
* `pageNumber`
* `heatScore` number
* `computedAt`

---

## 6) Chapter Lifecycle & Locking Rules (Critical)

### Draft

* Visible only to creator.
* Allowed:

  * upload pages
  * reorder pages
  * delete pages
  * replace pages
  * edit chapter metadata
* Not allowed:

  * comments
  * votes
  * reactions
  * overlay feed
  * notifications
  * trending eligibility

### Published

* Publicly visible.
* Enabled:

  * comments + replies
  * votes (up/down)
  * reactions (emoji)
  * live overlay
  * notifications to followers
  * ranking/trending
* **Page order locked. Page numbers frozen.**
* Allowed edits:

  * replace an image **in the same pageNumber** (fix typo)
  * edit notes/title (optional)
* Not allowed:

  * reorder pages
  * insert page in middle
  * delete pages
* Comments/reactions only exist for **published**.

### Unpublish behavior (MVP choice)

* Creator may unpublish a chapter (status back to DRAFT) ONLY if:

  * **no comments and no reactions exist** (recommended simplest rule)
* If there are comments/reactions, unpublish is blocked and user is instructed to publish a corrected chapter version instead.

---

## 7) Upload Requirements (Images Per Page)

### Upload scope

* Creators upload **one chapter at a time**.

### Supported formats

* JPG / PNG / WebP

### Server-side processing

* Validate file type and size.
* Generate variants:

  * thumb (grid)
  * medium (mobile)
  * large (desktop)
* Store metadata: width/height/bytes.
* Store files in Convex File Storage.

### Ordering

* On upload, initial order by filename sorting.
* Creator can reorder while DRAFT.
* On publish, ordering is locked.

### Limits (MVP)

* Max pages per chapter: e.g., 80 (configurable constant)
* Max file size per page: e.g., 20MB
* Require at least 1 page to publish.

---

## 8) Reading Modes (Series-level Setting)

Creator selects per series:

* **MANGA:** page-by-page, default RTL
* **COMIC:** page-by-page, default LTR
* **SCROLL:** vertical scroll (webtoon style)

Reader behavior:

* For page-by-page: click/tap sides, keyboard arrows on desktop, preload next 1–2 pages.
* For scroll: lazy-load images, determine “active page” by viewport intersection (center-of-viewport heuristic).

Overlay mapping:

* Overlay events are stored with `chapterId + pageNumber`.
* In SCROLL mode, UI shows overlay for whichever page is active in viewport.

---

## 9) Live Overlay Requirements (Always ON)

### Default behavior

* Overlay is **ON by default for everyone**.
* Non-logged users can see overlay stream and counts.
* Only logged-in users can:

  * post overlay comments
  * react (emoji burst)
  * vote on comments
  * reply in thread

### Overlay UX: Energetic Live Fandom

* Max visible floating text comments: 4–5
* Comments animate: slide-in from right + small bounce + fade out after 5 seconds
* Emoji reactions float upward and fade quickly
* Show “reacting now” counter (presence) top-right
* High activity mode:

  * show fewer text comments + more emoji bursts
  * show numeric counter prominently

### Interactions

* Tap a floating comment → opens **thread panel** (desktop right sidebar; mobile bottom sheet)
* Thread panel shows full discussion for that page.

### Rate limits (must)

* Comments: 1 per user per 8 seconds (configurable)
* Reactions: throttle (e.g., 1 per second, burst cap)
* Votes: limit per minute and per day to reduce brigading

### Safety

* Report comment button on thread
* Block/mute user optional (can be MVP+1)
* Shadow-ban support (admin)

---

## 10) “DRM-like” Deterrence (Online-Only Reading)

Goal: deter easy duplication; acknowledge screenshots can’t be fully prevented.
Implement:

* No “download” button anywhere
* Display images through controlled URLs
* Overlay dynamic watermark:

  * for logged-in users: show faint repeating watermark with `username` and/or userId
  * for logged-out users: generic watermark “SEIZUKI”
* Basic anti-save (front-end):

  * disable context menu on reader (non-security but deterrent)
* Anti-scrape:

  * rate limit image serving requests per IP/session
  * detect sequential page-fetch patterns (optional)
* Optional future: tile/canvas rendering (not required MVP)

---

## 11) Homepage & Discovery (Community-First)

Homepage prioritizes “alive activity”, not marketing hero.

### Above the fold: Discover Feed

Tabs:

* Trending
* New
* Rising
* Most Discussed

Each feed item displays:

* cover
* title
* creator name
* rating summary
* comment count
* view count
* “updated X ago”
* badges (NEW/TRENDING)

### Sections

1. Discover Feed (tabbed)
2. Rising Creators (follow CTAs)
3. Genre chips (horizontal scroll)
4. Weekly Community Picks (later if needed)
5. Recently Updated
6. Creator CTA block (Become a Creator)

---

## 12) Ratings & Rankings

### Rating system

* Manga/chapter rating exists (0..5) but icon can be “ink drops” / “sakura petals” (visual choice).
* One rating per user per target (series or chapter—choose one; recommended: **series rating** plus optional per chapter later).

### Rankings pages

* Top of week / month / year / all-time
* Trending, Rising, Most Discussed

### Ranking computation (MVP)

* Use a scheduled job (Convex cron) to compute rollups daily/hourly.
* Scoring should not be only average rating. Weight by:

  * unique readers (approx via views or distinct users)
  * comment activity
  * reaction volume
  * recency boost
  * follower growth (for rising creators)

(Exact formula can be simple v1; must be consistent and resistant to 5-star-with-3-votes abuse.)

---

## 13) Following System

* Users can follow creators.
* Follow button on:

  * creator profile
  * series cards (optional)
* Following feed tab (optional MVP): show new chapters by followed creators.
* Notifications:

  * When a followed creator publishes a new chapter.

---

## 14) Comments System (Thread + Overlay)

### Where comments exist

* Only on published chapters.
* Each comment is tied to a `pageNumber` (page overlay + thread per page).

### Thread features

* Replies (nested one level or threaded via parentCommentId)
* Sort:

  * Most liked/score
  * Newest
* Creator pin comment (isPinned)

### Votes

* **Upvotes and Downvotes** on comments (user choice A required).
* One vote per user per comment; change vote allowed.
* Score = up - down.
* UX guardrails (required):

  * Collapse comments below a negative threshold (e.g., score ≤ -5)
  * Show “This comment is hidden due to low score” with reveal option
  * Prevent vote spamming via rate limits

---

## 15) UI Component Style Guide (MVP)

### Manga card

* Rounded-2xl, fixed cover ratio 2:3, hover lift
* Shows title, creator, rating, comments, views
* Badge for NEW/TRENDING

### Buttons

* Primary: sakura background, white text, rounded-xl
* Secondary: outline sakura, text sakura
* Ghost: transparent + hover charcoal

### Badges

* Small rounded-full, 12px, bold
* NEW/PREMIUM/ALERT use crimson

### Overlay comment bubble

* Charcoal background with slight glow border sakura
* Avatar + username + text + small score indicator optional
* Tap opens thread panel

### Panels

* Desktop: right sidebar for thread
* Mobile: bottom sheet

### Navigation (mobile-ready)

Design as if future bottom tabs exist:
Home / Explore / Create / Notifications / Profile

---

## 16) Pages / Routes (Web App)

### Public

* `/` Home (discover feeds)
* `/explore` filters, genres, search
* `/series/[seriesId]` series page (chapters list)
* `/chapter/[chapterId]` reader with overlay
* `/creator/[creatorId]` creator profile
* `/rankings` + `/rankings/[period]` top lists
* `/login` (OAuth)

### Auth required

* `/create/series`
* `/create/series/[seriesId]/chapter/new`
* `/creator/dashboard` (upload/manage)
* `/notifications`
* `/settings/profile`

---

## 17) Creator Dashboard Requirements

* Create/edit series
* Create draft chapter
* Upload pages (batch)
* Reorder pages (draft only)
* Preview reader
* Publish chapter
* Replace page image after publish (same pageNumber)
* See basic stats:

  * followers
  * reads
  * comments
  * reactions

---

## 18) Search & Discovery (MVP)

* Search by series title, creator username, tags.
* Genre chips filter.
* “Recently Updated” list.

---

## 19) Moderation & Reporting (MVP Minimum)

* Report comment/series/chapter/user.
* Creator can delete comments on their own chapters (soft delete).
* Admin tooling:

  * mark comment deleted
  * ban user
  * remove series/chapter
* Basic profanity filter (optional but recommended)
* Rate limiting across comment/reaction/voting endpoints.

---

## 20) Analytics / Metrics (Denormalized counts)

Track and update:

* views per chapter (increment on open; avoid repeated increments per session quickly)
* commentCount per chapter
* reactionCount per chapter
* followerCount per creator
* score stats per comment

---

## 21) Convex Function Requirements (API Contract)

Implement Convex:

* Queries for reading/discovery
* Mutations for creation/interactions
* Scheduled jobs for rollups

### Key queries (examples)

* `getHomeFeed(type: TRENDING|NEW|RISING|MOST_DISCUSSED)`
* `getSeries(seriesId)`
* `getChaptersBySeries(seriesId)`
* `getChapterPages(chapterId)`
* `getOverlayStream(chapterId, pageNumber, mode)` (live + top/historical)
* `getPageThread(chapterId, pageNumber, sort)`
* `getCreatorProfile(creatorId)`
* `getRankings(period, type)`
* `getNotifications()`

### Key mutations (examples)

* `createSeries(...)`
* `updateSeries(...)`
* `createChapterDraft(seriesId, chapterNumber, title, notes)`
* `uploadPageInit()` → returns upload URL (Convex file storage)
* `addPageToDraft(chapterId, storageIds, metadata...)`
* `reorderDraftPages(chapterId, newOrder[])` (reject if published)
* `publishChapter(chapterId)` (validate pages exist; lock)
* `replacePublishedPageImage(chapterId, pageNumber, newStorageId...)`
* `addComment(chapterId, pageNumber, body)` (reject unless published & authed)
* `voteComment(commentId, value +/-1)` (authed, rate-limited)
* `addReaction(chapterId, pageNumber, emoji)` (authed, throttled)
* `followCreator(creatorId)` / `unfollowCreator(creatorId)`
* `reportTarget(targetType, targetId, reason, details)`

### Scheduled jobs

* Daily/hourly ranking rollup compute
* Heat score compute per chapter/page
* Optional: cleanup old transient overlay cache

---

## 22) Acceptance Criteria (Must Pass)

1. Creator can create a series, select reading mode, upload a draft chapter with pages, reorder pages in draft, preview, and publish.
2. After publish, reorder is blocked (UI + backend).
3. Comments/reactions/votes only work on published chapters.
4. Reader shows live overlay by default for everyone.
5. Logged-out users can read and see overlay, but can’t comment/react/vote/follow (prompt OAuth modal).
6. Overlay is page-aware in both page-by-page and scroll modes.
7. Downvotes exist; low-score comments collapse by default.
8. Rankings page shows top lists for week/month/year/all-time.
9. Follow creators works; publishing triggers notifications to followers.
10. Basic reporting exists for comments and content.

---

## 23) Explicit MVP Non-Goals (Do NOT implement now)

* Bulk upload multiple chapters in one action
* Direct messages between users
* Payments/creator payouts (can be v2)
* Full anti-screenshot DRM (impossible on web); only deterrence
* Advanced reputation UI/badges (store internal score only)

---