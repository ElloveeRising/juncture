import Link from 'next/link'
import { requireUser } from '@/lib/auth'
import { listNotifications, markAllNotificationsRead } from '@/lib/notifications'
import { TimeAgo } from '@/components/TimeAgo'

export const dynamic = 'force-dynamic'

export default async function NotificationsPage() {
  const user = await requireUser()
  const items = listNotifications(user.id)
  // Visiting the page clears the unread badge.
  markAllNotificationsRead(user.id)

  return (
    <div className="space-y-4">
      <div className="vt-card p-4">
        <h1 className="text-lg mb-1">Notifications</h1>
        <p className="text-sm text-[#666]">When people interact with your posts, it shows here.</p>
      </div>

      {items.length === 0 ? (
        <div className="vt-card p-6 text-center text-[#999] text-sm">Nothing yet.</div>
      ) : (
        <div className="vt-card divide-y divide-[#eee]">
          {items.map((n) => (
            <div
              key={n.id}
              className={`p-3 text-sm flex items-center gap-2 ${n.read ? '' : 'bg-[#eefaf4]'}`}
            >
              <span className="text-[#333]">
                {n.actorHandle ? (
                  <Link href={`/u/${n.actorHandle}`} className="font-bold">
                    {n.actorName ?? n.actorHandle}
                  </Link>
                ) : (
                  <span className="font-bold">Someone</span>
                )}{' '}
                {n.text}
                {n.postId && (
                  <>
                    {' — '}
                    <Link href="/feed" className="text-[#1f8a7d]">
                      view
                    </Link>
                  </>
                )}
              </span>
              <span className="ml-auto text-xs text-[#999]">
                <TimeAgo iso={n.createdAt.toISOString()} />
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
