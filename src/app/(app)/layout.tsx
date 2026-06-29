import { requireUser } from '@/lib/auth'
import { unreadNotificationCount } from '@/lib/notifications'
import { NavBar } from '@/components/NavBar'
import { RightRail } from '@/components/RightRail'

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const user = await requireUser()
  const unread = unreadNotificationCount(user.id)
  return (
    <div className="min-h-screen">
      <NavBar user={user} unread={unread} />
      <div className="max-w-5xl mx-auto px-3 py-4 grid grid-cols-1 md:grid-cols-[1fr_240px] gap-4">
        <main className="min-w-0">{children}</main>
        <div className="hidden md:block">
          <RightRail user={user} />
        </div>
      </div>
    </div>
  )
}
