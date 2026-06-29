import 'server-only'
import { and, desc, eq, isNull, sql } from 'drizzle-orm'
import { getDb } from '@/db'
import { notifications, comments, reactions, posts, users } from '@/db/schema'

export type NotificationType = 'comment' | 'reaction' | 'dm'

/**
 * Record a notification. `sourceId` points at the triggering entity
 * (comment id for 'comment', reaction id for 'reaction', message id for 'dm').
 * No-ops when the actor is the recipient (you don't get notified about yourself).
 */
export function notify(
  userId: number,
  actorId: number,
  type: NotificationType,
  sourceId: number,
): void {
  if (userId === actorId) return
  getDb().insert(notifications).values({ userId, type, sourceId }).run()
}

export function unreadNotificationCount(userId: number): number {
  const row = getDb()
    .select({ c: sql<number>`count(*)` })
    .from(notifications)
    .where(and(eq(notifications.userId, userId), isNull(notifications.readAt)))
    .get()
  return Number(row?.c ?? 0)
}

export type NotificationView = {
  id: number
  type: NotificationType
  read: boolean
  createdAt: Date
  actorName: string | null
  actorHandle: string | null
  text: string
  postId: number | null
}

export function listNotifications(userId: number, limit = 50): NotificationView[] {
  const db = getDb()
  const rows = db
    .select()
    .from(notifications)
    .where(eq(notifications.userId, userId))
    .orderBy(desc(notifications.createdAt))
    .limit(limit)
    .all()

  return rows.map((n): NotificationView => {
    const base = {
      id: n.id,
      type: n.type as NotificationType,
      read: !!n.readAt,
      createdAt: n.createdAt,
      actorName: null as string | null,
      actorHandle: null as string | null,
      text: 'did something',
      postId: null as number | null,
    }

    if (n.type === 'comment' && n.sourceId != null) {
      const c = db.select().from(comments).where(eq(comments.id, n.sourceId)).get()
      if (c) {
        const actor = db.select().from(users).where(eq(users.id, c.authorId)).get()
        base.actorName = actor?.displayName ?? null
        base.actorHandle = actor?.handle ?? null
        base.postId = c.postId
        base.text = c.parentId ? 'replied to a thread on your post' : 'commented on your post'
      }
    } else if (n.type === 'reaction' && n.sourceId != null) {
      const rx = db.select().from(reactions).where(eq(reactions.id, n.sourceId)).get()
      if (rx) {
        const actor = db.select().from(users).where(eq(users.id, rx.userId)).get()
        base.actorName = actor?.displayName ?? null
        base.actorHandle = actor?.handle ?? null
        if (rx.targetType === 'post') {
          base.postId = rx.targetId
          base.text = 'liked your post'
        } else {
          const c = db.select().from(comments).where(eq(comments.id, rx.targetId)).get()
          base.postId = c?.postId ?? null
          base.text = 'liked your comment'
        }
      }
    } else if (n.type === 'dm' && n.sourceId != null) {
      base.text = 'sent you a message'
    }
    return base
  })
}

export function markAllNotificationsRead(userId: number): void {
  getDb()
    .update(notifications)
    .set({ readAt: new Date() })
    .where(and(eq(notifications.userId, userId), isNull(notifications.readAt)))
    .run()
}

// Helper for resolving a post's author (used when creating notifications).
export function postAuthorId(postId: number): number | null {
  const p = getDb().select({ a: posts.authorId }).from(posts).where(eq(posts.id, postId)).get()
  return p?.a ?? null
}
