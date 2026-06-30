import 'server-only'
import { desc, eq, sql } from 'drizzle-orm'
import { getDb } from '@/db'
import { users, posts, reports, comments, creatorGrants } from '@/db/schema'

export type AdminUserRow = {
  id: number
  username: string
  email: string
  displayName: string
  handle: string
  role: 'admin' | 'creator' | 'supporter'
  status: 'active' | 'suspended'
  isAnonymous: boolean
  createdAt: Date
  postCount: number
}

// Full user list WITH emails — admin-only surface (the one place real
// identity is visible, and only to Ryan).
export function listAllUsers(): AdminUserRow[] {
  const db = getDb()
  const rows = db.select().from(users).orderBy(desc(users.createdAt)).all()
  const counts = db
    .select({ authorId: posts.authorId, c: sql<number>`count(*)` })
    .from(posts)
    .groupBy(posts.authorId)
    .all()
  const countMap = new Map(counts.map((r) => [r.authorId, Number(r.c)]))
  return rows.map((u) => ({
    id: u.id,
    username: u.username,
    email: u.email,
    displayName: u.displayName,
    handle: u.handle,
    role: u.role,
    status: u.status,
    isAnonymous: u.isAnonymous,
    createdAt: u.createdAt,
    postCount: countMap.get(u.id) ?? 0,
  }))
}

export type ReportRow = {
  id: number
  reporterName: string | null
  targetType: string
  targetId: number
  reason: string
  status: 'open' | 'resolved'
  createdAt: Date
  targetExcerpt: string | null
  targetDeleted: boolean
}

export function listReports(onlyOpen = true): ReportRow[] {
  const db = getDb()
  const rows = onlyOpen
    ? db.select().from(reports).where(eq(reports.status, 'open')).orderBy(desc(reports.createdAt)).all()
    : db.select().from(reports).orderBy(desc(reports.createdAt)).all()

  return rows.map((r) => {
    const reporter = db.select({ h: users.handle }).from(users).where(eq(users.id, r.reporterId)).get()
    let excerpt: string | null = null
    let deleted = false
    if (r.targetType === 'post') {
      const p = db.select().from(posts).where(eq(posts.id, r.targetId)).get()
      excerpt = p?.body?.slice(0, 140) ?? (p ? '(media post)' : '(missing)')
      deleted = !!p?.deletedAt
    } else if (r.targetType === 'comment') {
      const c = db.select().from(comments).where(eq(comments.id, r.targetId)).get()
      excerpt = c?.body?.slice(0, 140) ?? '(missing)'
      deleted = !!c?.deletedAt
    }
    return {
      id: r.id,
      reporterName: reporter?.h ?? null,
      targetType: r.targetType,
      targetId: r.targetId,
      reason: r.reason,
      status: r.status,
      createdAt: r.createdAt,
      targetExcerpt: excerpt,
      targetDeleted: deleted,
    }
  })
}

export function adminCounts() {
  const db = getDb()
  const userCount = db.select({ c: sql<number>`count(*)` }).from(users).get()
  const creatorCount = db
    .select({ c: sql<number>`count(*)` })
    .from(users)
    .where(eq(users.role, 'creator'))
    .get()
  const openReports = db
    .select({ c: sql<number>`count(*)` })
    .from(reports)
    .where(eq(reports.status, 'open'))
    .get()
  const postCount = db.select({ c: sql<number>`count(*)` }).from(posts).get()
  return {
    users: Number(userCount?.c ?? 0),
    creators: Number(creatorCount?.c ?? 0),
    openReports: Number(openReports?.c ?? 0),
    posts: Number(postCount?.c ?? 0),
  }
}

export function grantsForUser(userId: number) {
  return getDb()
    .select()
    .from(creatorGrants)
    .where(eq(creatorGrants.userId, userId))
    .orderBy(desc(creatorGrants.createdAt))
    .all()
}
