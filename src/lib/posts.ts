import 'server-only'
import { and, desc, eq, isNull, notInArray, inArray, asc } from 'drizzle-orm'
import { getDb } from '@/db'
import { posts, users, blocks, mutes, postMedia, linkPreviews } from '@/db/schema'
import { getReactionSummaries, type ReactionSummary } from '@/lib/reactions'
import { getCommentsForPosts, type CommentView } from '@/lib/comments'

export type FeedAuthor = {
  id: number
  handle: string
  displayName: string
  avatarPath: string | null
  role: 'admin' | 'creator' | 'supporter'
  isAnonymous: boolean
}

export type PostMediaItem = {
  id: number
  kind: 'image' | 'audio'
  path: string
  thumbPath: string | null
  mime: string
  width: number | null
  height: number | null
}

export type LinkPreviewItem = {
  url: string
  title: string | null
  description: string | null
  imagePath: string | null
}

export type FeedPost = {
  id: number
  body: string | null
  createdAt: Date
  editedAt: Date | null
  author: FeedAuthor
  media: PostMediaItem[]
  linkPreview: LinkPreviewItem | null
  reactions: ReactionSummary
  comments: CommentView[]
}

const FEED_LIMIT = 50

// IDs the viewer has blocked or muted — their posts are hidden from the feed.
// (A block is mutual-severing; for feed visibility both block and mute hide
// the other person's posts from the viewer.)
function hiddenAuthorIds(viewerId: number): number[] {
  const db = getDb()
  const blocked = db
    .select({ id: blocks.blockedId })
    .from(blocks)
    .where(eq(blocks.blockerId, viewerId))
    .all()
  const blockedBy = db
    .select({ id: blocks.blockerId })
    .from(blocks)
    .where(eq(blocks.blockedId, viewerId))
    .all()
  const muted = db
    .select({ id: mutes.mutedId })
    .from(mutes)
    .where(eq(mutes.muterId, viewerId))
    .all()
  const set = new Set<number>()
  for (const r of [...blocked, ...blockedBy, ...muted]) set.add(r.id)
  return [...set]
}

type PostRow = {
  id: number
  body: string | null
  createdAt: Date
  editedAt: Date | null
  authorId: number
  handle: string
  displayName: string
  avatarPath: string | null
  role: 'admin' | 'creator' | 'supporter'
  isAnonymous: boolean
}

function selectPostRows(where: ReturnType<typeof and> | ReturnType<typeof eq>): PostRow[] {
  return getDb()
    .select({
      id: posts.id,
      body: posts.body,
      createdAt: posts.createdAt,
      editedAt: posts.editedAt,
      authorId: users.id,
      handle: users.handle,
      displayName: users.displayName,
      avatarPath: users.avatarPath,
      role: users.role,
      isAnonymous: users.isAnonymous,
    })
    .from(posts)
    .innerJoin(users, eq(posts.authorId, users.id))
    .where(where)
    .orderBy(desc(posts.createdAt))
    .limit(FEED_LIMIT)
    .all()
}

export function getFeedPosts(viewerId: number): FeedPost[] {
  const hidden = hiddenAuthorIds(viewerId)
  const where = hidden.length
    ? and(isNull(posts.deletedAt), notInArray(posts.authorId, hidden))
    : isNull(posts.deletedAt)
  return enrichPostRows(selectPostRows(where), viewerId, new Set(hidden))
}

/** Posts by a single author, visible to the viewer (used on profile pages). */
export function getPostsByAuthor(authorId: number, viewerId: number): FeedPost[] {
  const hidden = hiddenAuthorIds(viewerId)
  if (hidden.includes(authorId)) return [] // blocked/muted — show nothing
  const where = and(isNull(posts.deletedAt), eq(posts.authorId, authorId))
  return enrichPostRows(selectPostRows(where), viewerId, new Set(hidden))
}

function enrichPostRows(
  rows: PostRow[],
  viewerId: number,
  hiddenSet: Set<number>,
): FeedPost[] {
  const db = getDb()
  // Fetch all media for the visible posts in one query, then group by post.
  const postIds = rows.map((r) => r.id)
  const postReactions = getReactionSummaries('post', postIds, viewerId)
  const commentsByPost = getCommentsForPosts(postIds, viewerId, hiddenSet)
  const mediaByPost = new Map<number, PostMediaItem[]>()
  if (postIds.length) {
    const mediaRows = db
      .select()
      .from(postMedia)
      .where(inArray(postMedia.postId, postIds))
      .orderBy(asc(postMedia.position))
      .all()
    for (const m of mediaRows) {
      const list = mediaByPost.get(m.postId) ?? []
      list.push({
        id: m.id,
        kind: m.kind,
        path: m.path,
        thumbPath: m.thumbPath,
        mime: m.mime,
        width: m.width,
        height: m.height,
      })
      mediaByPost.set(m.postId, list)
    }
  }

  // One link preview per post (we only ever create one).
  const previewByPost = new Map<number, LinkPreviewItem>()
  if (postIds.length) {
    const previewRows = db
      .select()
      .from(linkPreviews)
      .where(inArray(linkPreviews.postId, postIds))
      .all()
    for (const p of previewRows) {
      if (!previewByPost.has(p.postId)) {
        previewByPost.set(p.postId, {
          url: p.url,
          title: p.title,
          description: p.description,
          imagePath: p.imagePath,
        })
      }
    }
  }

  return rows.map((r) => ({
    id: r.id,
    body: r.body,
    createdAt: r.createdAt,
    editedAt: r.editedAt,
    author: {
      id: r.authorId,
      handle: r.handle,
      displayName: r.displayName,
      avatarPath: r.avatarPath,
      role: r.role,
      isAnonymous: r.isAnonymous,
    },
    media: mediaByPost.get(r.id) ?? [],
    linkPreview: previewByPost.get(r.id) ?? null,
    reactions: postReactions.get(r.id) ?? { likeCount: 0, likedByMe: false },
    comments: commentsByPost.get(r.id) ?? [],
  }))
}

export function getPostById(id: number): typeof posts.$inferSelect | undefined {
  return getDb().select().from(posts).where(eq(posts.id, id)).get()
}

export type PublicProfile = {
  id: number
  handle: string
  displayName: string
  avatarPath: string | null
  bio: string | null
  role: 'admin' | 'creator' | 'supporter'
  isAnonymous: boolean
  allowSupporterDms: boolean
  createdAt: Date
  profileSongPath: string | null
  profileSongTitle: string | null
  profileAccent: string | null
  profileBg: string | null
}

/**
 * Look up a user's PUBLIC profile by handle. Deliberately omits email and
 * username — the real identity is never exposed through this surface.
 */
export function getProfileByHandle(handle: string): PublicProfile | undefined {
  const u = getDb().select().from(users).where(eq(users.handle, handle)).get()
  if (!u || u.status === 'suspended') return undefined
  return {
    id: u.id,
    handle: u.handle,
    displayName: u.displayName,
    avatarPath: u.avatarPath,
    bio: u.bio,
    role: u.role,
    isAnonymous: u.isAnonymous,
    allowSupporterDms: u.allowSupporterDms,
    createdAt: u.createdAt,
    profileSongPath: u.profileSongPath,
    profileSongTitle: u.profileSongTitle,
    profileAccent: u.profileAccent,
    profileBg: u.profileBg,
  }
}
