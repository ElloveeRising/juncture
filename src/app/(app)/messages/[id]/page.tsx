import Link from 'next/link'
import { notFound } from 'next/navigation'
import { requireUser } from '@/lib/auth'
import { isParticipant, otherParticipant, getThread, markConversationRead } from '@/lib/dm'
import { blockedEitherWay } from '@/lib/relationships'
import { mediaUrl } from '@/lib/urls'
import { Avatar } from '@/components/Avatar'
import { TimeAgo } from '@/components/TimeAgo'
import { MessageComposer } from '@/components/MessageComposer'
import { FeedAutoRefresh } from '@/components/FeedAutoRefresh'

export const dynamic = 'force-dynamic'

export default async function ThreadPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const me = await requireUser()
  const { id } = await params
  const conversationId = Number(id)
  if (!Number.isInteger(conversationId) || !isParticipant(conversationId, me.id)) {
    notFound()
  }

  markConversationRead(conversationId, me.id)
  const other = otherParticipant(conversationId, me.id)
  const thread = getThread(conversationId, me.id)
  const blocked = other ? blockedEitherWay(me.id, other.id) : true

  return (
    <div className="space-y-3">
      <FeedAutoRefresh intervalMs={15000} />

      <div className="vt-card p-2 flex items-center gap-2">
        <Link href="/messages" className="text-sm text-[#3b5998] px-1">←</Link>
        {other && (
          <Link href={`/u/${other.handle}`} className="flex items-center gap-2 no-underline">
            <Avatar displayName={other.displayName} src={mediaUrl(other.avatarPath)} size={32} />
            <div>
              <div className="font-bold text-[#333] text-sm">{other.displayName}</div>
              <div className="text-xs text-[#999]">@{other.handle}</div>
            </div>
          </Link>
        )}
      </div>

      <div className="vt-card p-3 space-y-2 min-h-[200px]">
        {thread.length === 0 ? (
          <p className="text-center text-[#999] text-sm py-6">
            No messages yet. Say hello.
          </p>
        ) : (
          thread.map((m) => (
            <div key={m.id} className={`flex ${m.mine ? 'justify-end' : 'justify-start'}`}>
              <div
                className={`max-w-[75%] px-3 py-1.5 rounded border text-sm whitespace-pre-wrap break-words ${
                  m.mine
                    ? 'bg-[#dce3ef] border-[#c3d0e8]'
                    : 'bg-[#f2f3f5] border-[#e4e7ec]'
                }`}
              >
                {m.body}
                <div className="text-[10px] text-[#999] mt-0.5 text-right">
                  <TimeAgo iso={m.createdAt.toISOString()} />
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {blocked ? (
        <div className="vt-card p-3 text-center text-sm text-[#999]">
          You can’t message this person.
        </div>
      ) : (
        <div className="vt-card p-3">
          <MessageComposer conversationId={conversationId} />
        </div>
      )}
    </div>
  )
}
