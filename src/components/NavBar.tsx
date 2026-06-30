import Link from 'next/link'
import { APP_NAME } from '@/lib/config'
import type { CurrentUser } from '@/lib/auth'
import { logoutAction } from '@/app/(app)/account-actions'

function RoleBadge({ role }: { role: CurrentUser['role'] }) {
  const label = role === 'admin' ? 'Admin' : role === 'creator' ? 'Creator' : 'Supporter'
  const bg = role === 'admin' ? '#8b1a1a' : role === 'creator' ? '#2d5a2d' : '#555'
  return (
    <span
      className="text-xs px-1.5 py-0.5 rounded text-white"
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
    <header style={{ background: 'var(--chrome)' }} className="border-b border-[#2b4a8b]">
      <div className="max-w-5xl mx-auto px-3 flex items-center gap-4 h-11">
        <Link href="/feed" className="font-bold text-white text-lg hover:no-underline">
          {APP_NAME}
        </Link>
        <nav className="flex items-center gap-3 text-white text-sm">
          <Link href="/feed" className="text-white hover:underline">
            Feed
          </Link>
          <Link href="/messages" className="text-white hover:underline">
            Messages
            <Badge n={unreadDms} />
          </Link>
          <Link href="/notifications" className="text-white hover:underline">
            Notifications
            <Badge n={unread} />
          </Link>
          <Link href={`/u/${user.handle}`} className="text-white hover:underline">
            Profile
          </Link>
          {user.role === 'admin' && (
            <Link href="/admin" className="text-white hover:underline">
              Admin
            </Link>
          )}
        </nav>
        <div className="ml-auto flex items-center gap-3 text-white text-sm">
          <span className="hidden sm:inline opacity-90">{user.displayName}</span>
          <RoleBadge role={user.role} />
          <Link href="/settings" className="text-white hover:underline">
            Settings
          </Link>
          <form action={logoutAction}>
            <button type="submit" className="text-white hover:underline">
              Log out
            </button>
          </form>
        </div>
      </div>
    </header>
  )
}
