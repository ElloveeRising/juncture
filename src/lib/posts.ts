import 'server-only'
import { and, desc, eq, isNull, notInArray, inArray, asc } from 'drizzle-orm'
import { getDb } from '@/db'
import { posts, users, blocks, mutes, postMedia } from '@/db/schema'

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

export type FeedPost = {
  id: number
  body: string | null
  createdAt: Date
  editedAt: Date | null
  author: FeedAuthor
  media: PostMediaItem[]
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

export function getFeedPosts(viewerId: number): FeedPost[] {
  const db = getDb()
  const hidden = hiddenAuthorIds(viewerId)

  const where = hidden.length
    ? and(isNull(posts.deletedAt), notInArray(posts.authorId, hidden))
    : isNull(posts.deletedAt)

  const rows = db
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

  // Fetch all media for the visible posts in one query, then group by post.
  const postIds = rows.map((r) => r.id)
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
  }))
}

export function getPostById(id: number): typeof posts.$inferSelect | undefined {
  return getDb().select().from(posts).where(eq(posts.id, id)).get()
}
