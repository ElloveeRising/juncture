import 'server-only'
import { asc, eq, inArray } from 'drizzle-orm'
import { getDb } from '@/db'
import { comments, users } from '@/db/schema'
import { getReactionSummaries, type ReactionSummary } from '@/lib/reactions'

export type CommentAuthor = {
  id: number
  handle: string
  displayName: string
  avatarPath: string | null
  role: 'admin' | 'creator' | 'supporter'
}

export type CommentView = {
  id: number
  postId: number
  parentId: number | null
  body: string | null // null when rendered as a deleted tombstone
  deleted: boolean
  createdAt: Date
  editedAt: Date | null
  author: CommentAuthor
  reactions: ReactionSummary
  replies: CommentView[]
}

const HIDDEN = new Set<number>()

/**
 * Load all comments for a set of posts as one-level threads.
 * Deleted comments are kept as tombstones only when they still have visible
 * replies (so the thread doesn't lose its shape); otherwise they're dropped.
 */
export function getCommentsForPosts(
  postIds: number[],
  viewerId: number,
  hiddenAuthorIds: Set<number> = HIDDEN,
): Map<number, CommentView[]> {
  const byPost = new Map<number, CommentView[]>()
  if (!postIds.length) return byPost

  const db = getDb()
  const rows = db
    .select({
      id: comments.id,
      postId: comments.postId,
      parentId: comments.parentId,
      body: comments.body,
      deletedAt: comments.deletedAt,
      createdAt: comments.createdAt,
      editedAt: comments.editedAt,
      authorId: users.id,
      handle: users.handle,
      displayName: users.displayName,
      avatarPath: users.avatarPath,
      role: users.role,
    })
    .from(comments)
    .innerJoin(users, eq(comments.authorId, users.id))
    .where(inArray(comments.postId, postIds))
    .orderBy(asc(comments.createdAt))
    .all()

  const reactionSummaries = getReactionSummaries(
    'comment',
    rows.map((r) => r.id),
    viewerId,
  )

  const nodes = new Map<number, CommentView>()
  for (const r of rows) {
    const hidden = hiddenAuthorIds.has(r.authorId)
    nodes.set(r.id, {
      id: r.id,
      postId: r.postId,
      parentId: r.parentId,
      body: r.deletedAt || hidden ? null : r.body,
      deleted: !!r.deletedAt || hidden,
      createdAt: r.createdAt,
      editedAt: r.editedAt,
      author: {
        id: r.authorId,
        handle: r.handle,
        displayName: r.displayName,
        avatarPath: r.avatarPath,
        role: r.role,
      },
      reactions: reactionSummaries.get(r.id) ?? { likeCount: 0, likedByMe: false },
      replies: [],
    })
  }

  // Build one-level trees: anything with a parent attaches to that parent.
  const tops: CommentView[] = []
  for (const node of nodes.values()) {
    if (node.parentId && nodes.has(node.parentId)) {
      nodes.get(node.parentId)!.replies.push(node)
    } else {
      tops.push(node)
    }
  }

  // Drop deleted tops that have no surviving replies.
  for (const top of tops) {
    if (top.deleted && top.replies.length === 0) continue
    const list = byPost.get(top.postId) ?? []
    list.push(top)
    byPost.set(top.postId, list)
  }
  return byPost
}

/** Resolve the top-level ancestor for a reply, enforcing one level of depth. */
export function topLevelAncestorId(commentId: number): number {
  const db = getDb()
  let current = db
    .select({ id: comments.id, parentId: comments.parentId })
    .from(comments)
    .where(eq(comments.id, commentId))
    .get()
  // At most one hop given we enforce single-level, but loop defensively.
  let guard = 0
  while (current?.parentId && guard < 5) {
    const parent = db
      .select({ id: comments.id, parentId: comments.parentId })
      .from(comments)
      .where(eq(comments.id, current.parentId))
      .get()
    if (!parent) break
    current = parent
    guard++
  }
  return current?.id ?? commentId
}

export function getCommentById(id: number) {
  return getDb().select().from(comments).where(eq(comments.id, id)).get()
}
