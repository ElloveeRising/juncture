import Link from 'next/link'
import { requireUser } from '@/lib/auth'
import { listConversations } from '@/lib/dm'
import { mediaUrl } from '@/lib/urls'
import { Avatar } from '@/components/Avatar'
import { TimeAgo } from '@/components/TimeAgo'

export const dynamic = 'force-dynamic'

export default async function MessagesPage() {
  const me = await requireUser()
  const convos = listConversations(me.id)

  return (
    <div className="space-y-4">
      <div className="vt-card p-3">
        <h1 className="text-lg">Messages</h1>
        <p className="text-xs text-[#999]">
          Direct messages are private between you and the other person.
        </p>
      </div>

      {convos.length === 0 ? (
        <div className="vt-card p-6 text-center text-[#999] text-sm">
          No conversations yet. Start one from someone’s profile.
        </div>
      ) : (
        <div className="vt-card divide-y divide-[#eee]">
          {convos.map((c) => (
            <Link
              key={c.id}
              href={`/messages/${c.id}`}
              className="flex items-center gap-3 p-3 hover:bg-[#f7f7f7] no-underline"
            >
              <Avatar
                displayName={c.other?.displayName ?? '?'}
                src={mediaUrl(c.other?.avatarPath ?? null)}
                size={36}
              />
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="font-bold text-[#333]">
                    {c.other?.displayName ?? 'Unknown'}
                  </span>
                  {c.lastAt && (
                    <span className="text-xs text-[#999]">
                      <TimeAgo iso={c.lastAt.toISOString()} />
                    </span>
                  )}
                  {c.unread > 0 && (
                    <span
                      className="ml-auto text-xs font-bold rounded-full px-1.5 text-white"
                      style={{ background: '#e53935' }}
                    >
                      {c.unread}
                    </span>
                  )}
                </div>
                <div className="text-sm text-[#666] truncate">
                  {c.lastBody ?? 'No messages yet'}
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
