'use server'

import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import { eq } from 'drizzle-orm'
import { getDb } from '@/db'
import { messages, users } from '@/db/schema'
import { requireUser } from '@/lib/auth'
import { rateLimit } from '@/lib/ratelimit'
import { notify } from '@/lib/notifications'
import {
  canInitiateDm,
  canSendInConversation,
  getOrCreateDirectConversation,
  isParticipant,
  otherParticipant,
} from '@/lib/dm'
import { MESSAGE_MAX, type SendState } from '@/lib/dm-constants'

type Role = 'admin' | 'creator' | 'supporter'
type DmUser = { id: number; role: Role; status: 'active' | 'suspended'; allowSupporterDms: boolean }

function loadDmUser(id: number): DmUser | null {
  const u = getDb()
    .select({
      id: users.id,
      role: users.role,
      status: users.status,
      allowSupporterDms: users.allowSupporterDms,
    })
    .from(users)
    .where(eq(users.id, id))
    .get()
  return u ?? null
}

/** Start (or reuse) a conversation with a user, then go to the thread. */
export async function startConversationAction(formData: FormData): Promise<void> {
  const me = await requireUser()
  const recipientId = Number(formData.get('recipientId'))
  if (!Number.isInteger(recipientId)) redirect('/messages')

  const sender = loadDmUser(me.id)
  const recipient = loadDmUser(recipientId)
  if (!sender || !recipient) redirect('/messages')

  // Enforce the DM matrix server-side. If not allowed, bounce back to their
  // profile rather than silently creating a conversation.
  const verdict = canInitiateDm(sender, recipient)
  if (!verdict.ok) {
    const u = getDb().select({ h: users.handle }).from(users).where(eq(users.id, recipientId)).get()
    redirect(u ? `/u/${u.h}` : '/messages')
  }

  const convoId = getOrCreateDirectConversation(me.id, recipientId)
  redirect(`/messages/${convoId}`)
}

export async function sendMessageAction(
  _prev: SendState,
  formData: FormData,
): Promise<SendState> {
  const me = await requireUser()
  const conversationId = Number(formData.get('conversationId'))
  const body = String(formData.get('body') ?? '').trim()

  if (!Number.isInteger(conversationId)) return { error: 'Invalid conversation.' }
  if (!body) return { error: 'Write a message first.' }
  if (body.length > MESSAGE_MAX) return { error: `Message is too long (max ${MESSAGE_MAX}).` }
  if (!isParticipant(conversationId, me.id)) return { error: 'You are not in this conversation.' }

  const rl = rateLimit(`dm:${me.id}`, 60, 5 * 60 * 1000)
  if (!rl.ok) return { error: 'You are sending messages too quickly.' }

  const other = otherParticipant(conversationId, me.id)
  if (!other) return { error: 'This conversation is unavailable.' }
  // A block (either direction) severs messaging.
  if (!canSendInConversation(me.id, other.id)) {
    return { error: 'You can no longer message this person.' }
  }
  if (other.status === 'suspended') return { error: 'This account is unavailable.' }

  const res = getDb()
    .insert(messages)
    .values({ conversationId, senderId: me.id, body })
    .run()
  notify(other.id, me.id, 'dm', Number(res.lastInsertRowid))

  revalidatePath(`/messages/${conversationId}`)
  revalidatePath('/messages')
  return { ok: true }
}
