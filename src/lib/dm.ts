import 'server-only'
import { and, desc, eq, inArray, isNull, ne, sql } from 'drizzle-orm'
import { getDb } from '@/db'
import { conversations, conversationParticipants, messages, users } from '@/db/schema'
import { blockedEitherWay } from '@/lib/relationships'

type Role = 'admin' | 'creator' | 'supporter'
type DmUser = { id: number; role: Role; status: 'active' | 'suspended'; allowSupporterDms: boolean }

function isCreatorish(role: Role): boolean {
  return role === 'creator' || role === 'admin'
}

/**
 * Can `sender` START a DM conversation with `recipient`? Encodes the matrix:
 *  - creator/admin <-> creator/admin: always
 *  - creator/admin -> supporter: allowed (the supporter can block)
 *  - supporter -> creator/admin: only if the recipient opted in (allow_supporter_dms)
 *  - supporter -> supporter: never
 *  - any direction: blocked if suspended or a block exists either way
 */
export function canInitiateDm(
  sender: DmUser,
  recipient: DmUser,
): { ok: boolean; reason?: string } {
  if (sender.id === recipient.id) return { ok: false, reason: 'You cannot message yourself.' }
  if (sender.status === 'suspended' || recipient.status === 'suspended') {
    return { ok: false, reason: 'This account is unavailable.' }
  }
  if (blockedEitherWay(sender.id, recipient.id)) {
    return { ok: false, reason: 'You cannot message this person.' }
  }

  const sC = isCreatorish(sender.role)
  const rC = isCreatorish(recipient.role)
  if (sC) return { ok: true } // creator/admin can reach creators and supporters
  if (rC) {
    return recipient.allowSupporterDms
      ? { ok: true }
      : { ok: false, reason: 'This creator isn’t accepting messages from supporters.' }
  }
  return { ok: false, reason: 'Supporters can’t message each other.' }
}

/** Can `sender` send within an EXISTING conversation right now? */
export function canSendInConversation(senderId: number, otherId: number): boolean {
  return !blockedEitherWay(senderId, otherId)
}

/** Find the existing 1:1 conversation between two users, or null. */
export function findDirectConversation(aId: number, bId: number): number | null {
  const db = getDb()
  // Conversations where `a` participates...
  const aConvos = db
    .select({ c: conversationParticipants.conversationId })
    .from(conversationParticipants)
    .where(eq(conversationParticipants.userId, aId))
    .all()
    .map((r) => r.c)
  if (!aConvos.length) return null
  // ...that `b` also participates in, with exactly two participants.
  const shared = db
    .select({ c: conversationParticipants.conversationId })
    .from(conversationParticipants)
    .where(
      and(
        eq(conversationParticipants.userId, bId),
        inArray(conversationParticipants.conversationId, aConvos),
      ),
    )
    .all()
    .map((r) => r.c)
  for (const c of shared) {
    const count = db
      .select({ n: sql<number>`count(*)` })
      .from(conversationParticipants)
      .where(eq(conversationParticipants.conversationId, c))
      .get()
    if (Number(count?.n ?? 0) === 2) return c
  }
  return null
}

export function getOrCreateDirectConversation(aId: number, bId: number): number {
  const existing = findDirectConversation(aId, bId)
  if (existing) return existing
  const db = getDb()
  const res = db.insert(conversations).values({}).run()
  const convoId = Number(res.lastInsertRowid)
  db.insert(conversationParticipants).values([
    { conversationId: convoId, userId: aId },
    { conversationId: convoId, userId: bId },
  ]).run()
  return convoId
}

export function isParticipant(conversationId: number, userId: number): boolean {
  return !!getDb()
    .select({ x: conversationParticipants.userId })
    .from(conversationParticipants)
    .where(
      and(
        eq(conversationParticipants.conversationId, conversationId),
        eq(conversationParticipants.userId, userId),
      ),
    )
    .get()
}

export function otherParticipant(conversationId: number, userId: number) {
  const db = getDb()
  const row = db
    .select({
      id: users.id,
      handle: users.handle,
      displayName: users.displayName,
      avatarPath: users.avatarPath,
      role: users.role,
      status: users.status,
      allowSupporterDms: users.allowSupporterDms,
    })
    .from(conversationParticipants)
    .innerJoin(users, eq(conversationParticipants.userId, users.id))
    .where(
      and(
        eq(conversationParticipants.conversationId, conversationId),
        ne(conversationParticipants.userId, userId),
      ),
    )
    .get()
  return row ?? null
}

export type ConversationSummary = {
  id: number
  other: {
    id: number
    handle: string
    displayName: string
    avatarPath: string | null
  } | null
  lastBody: string | null
  lastAt: Date | null
  unread: number
}

export function listConversations(userId: number): ConversationSummary[] {
  const db = getDb()
  const myConvos = db
    .select({ c: conversationParticipants.conversationId })
    .from(conversationParticipants)
    .where(eq(conversationParticipants.userId, userId))
    .all()
    .map((r) => r.c)
  if (!myConvos.length) return []

  const summaries: ConversationSummary[] = []
  for (const cId of myConvos) {
    const other = otherParticipant(cId, userId)
    // Hide conversations with someone who is now blocked either way.
    if (other && blockedEitherWay(userId, other.id)) continue

    const last = db
      .select()
      .from(messages)
      .where(eq(messages.conversationId, cId))
      .orderBy(desc(messages.createdAt))
      .limit(1)
      .get()
    const unreadRow = db
      .select({ n: sql<number>`count(*)` })
      .from(messages)
      .where(
        and(
          eq(messages.conversationId, cId),
          ne(messages.senderId, userId),
          isNull(messages.readAt),
        ),
      )
      .get()

    summaries.push({
      id: cId,
      other: other
        ? {
            id: other.id,
            handle: other.handle,
            displayName: other.displayName,
            avatarPath: other.avatarPath,
          }
        : null,
      lastBody: last?.body ?? null,
      lastAt: last?.createdAt ?? null,
      unread: Number(unreadRow?.n ?? 0),
    })
  }
  // Most recent activity first.
  summaries.sort((a, b) => (b.lastAt?.getTime() ?? 0) - (a.lastAt?.getTime() ?? 0))
  return summaries
}

export type ThreadMessage = {
  id: number
  senderId: number
  body: string
  createdAt: Date
  mine: boolean
}

export function getThread(conversationId: number, userId: number): ThreadMessage[] {
  const rows = getDb()
    .select()
    .from(messages)
    .where(eq(messages.conversationId, conversationId))
    .orderBy(messages.createdAt)
    .all()
  return rows.map((m) => ({
    id: m.id,
    senderId: m.senderId,
    body: m.body,
    createdAt: m.createdAt,
    mine: m.senderId === userId,
  }))
}

export function markConversationRead(conversationId: number, userId: number): void {
  getDb()
    .update(messages)
    .set({ readAt: new Date() })
    .where(
      and(
        eq(messages.conversationId, conversationId),
        ne(messages.senderId, userId),
        isNull(messages.readAt),
      ),
    )
    .run()
}

export function unreadDmCount(userId: number): number {
  const db = getDb()
  const myConvos = db
    .select({ c: conversationParticipants.conversationId })
    .from(conversationParticipants)
    .where(eq(conversationParticipants.userId, userId))
    .all()
    .map((r) => r.c)
  if (!myConvos.length) return 0
  const row = db
    .select({ n: sql<number>`count(*)` })
    .from(messages)
    .where(
      and(
        inArray(messages.conversationId, myConvos),
        ne(messages.senderId, userId),
        isNull(messages.readAt),
      ),
    )
    .get()
  return Number(row?.n ?? 0)
}
