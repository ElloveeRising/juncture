import Link from 'next/link'
import { APP_NAME } from '@/lib/config'
import type { CurrentUser } from '@/lib/auth'
import { logoutAction } from '@/app/(app)/account-actions'

function RoleBadge({ role }: { role: CurrentUser['role'] }) {
  const label = role === 'admin' ? 'Admin' : role === 'creator' ? 'Creator' : 'Supporter'
  const bg = role === 'admin' ? '#8b1a1a' : role === 'creator' ? '#2d5a2d' : '#555'
  return (
    <span
      className="text-xs px-1.5 py-0.5 rounded text-white whitespace-nowrap"
      style={{ background: bg }}
      title={`You are a ${label.toLowerCase()}`}
    >
      {label}
    </span>
  )
}

function Badge({ n }: { n: number }) {
  if (n <= 0) return null
  return (
    <span
      className="ml-1 inline-flex items-center justify-center text-xs font-bold rounded-full px-1.5"
      style={{ background: '#e53935', color: '#fff', minWidth: 18 }}
    >
      {n > 99 ? '99+' : n}
    </span>
  )
}

export function NavBar({
  user,
  unread = 0,
  unreadDms = 0,
}: {
  user: CurrentUser
  unread?: number
  unreadDms?: number
}) {
  return (
    <header
      style={{ background: 'linear-gradient(to bottom, #4a69a0, #3b5998)' }}
      className="border-b border-[#2b4a8b]"
    >
      <div className="max-w-5xl mx-auto px-3 flex items-center gap-3 h-11">
        <Link
          href="/feed"
          className="font-bold text-white text-lg hover:no-underline shrink-0"
        >
          {APP_NAME}
        </Link>

        {/* Primary nav — scrolls horizontally on small screens so every link
            stays reachable without crowding the bar. */}
        <nav
          className="flex-1 flex items-center gap-3 text-white text-sm overflow-x-auto whitespace-nowrap"
          style={{ scrollbarWidth: 'none' }}
        >
          <Link href="/feed" className="text-white hover:underline shrink-0">
            Feed
          </Link>
          <Link href="/messages" className="text-white hover:underline shrink-0">
            Messages
            <Badge n={unreadDms} />
          </Link>
          <Link href="/notifications" className="text-white hover:underline shrink-0">
            Notifications
            <Badge n={unread} />
          </Link>
          <Link href={`/u/${user.handle}`} className="text-white hover:underline shrink-0">
            Profile
          </Link>
          <Link href="/settings" className="text-white hover:underline shrink-0">
            Settings
          </Link>
          {user.role === 'admin' && (
            <Link href="/admin" className="text-white hover:underline shrink-0">
              Admin
            </Link>
          )}
        </nav>

        <div className="ml-auto flex items-center gap-2 text-white text-sm shrink-0">
          <span className="hidden md:inline opacity-90 max-w-[120px] truncate">
            {user.displayName}
          </span>
          <span className="hidden sm:inline">
            <RoleBadge role={user.role} />
          </span>
          <form action={logoutAction}>
            <button type="submit" className="text-white hover:underline whitespace-nowrap">
              Log&nbsp;out
            </button>
          </form>
        </div>
      </div>
    </header>
  )
}
