import Link from 'next/link'
import type { CurrentUser } from '@/lib/auth'
import { mediaUrl } from '@/lib/urls'
import { Avatar } from './Avatar'

function Badge({ bg, color, children }: { bg: string; color: string; children: React.ReactNode }) {
  return (
    <div className="vt-badge88" style={{ background: bg, color }}>
      {children}
    </div>
  )
}

// The portal's left column: you, then the badge wall. Desktop only.
export function FeedLeftRail({ user }: { user: CurrentUser }) {
  return (
    <aside className="hidden lg:flex flex-col gap-3">
      <div className="vt-card p-3 text-center">
        <Link href={`/u/${user.handle}`} className="inline-block">
          <Avatar displayName={user.displayName} src={mediaUrl(user.avatarPath)} size={48} />
        </Link>
        <div className="mt-1 font-bold text-[#333] truncate">{user.displayName}</div>
        <div className="text-xs text-[#999] truncate">@{user.handle}</div>
        <Link href={`/u/${user.handle}`} className="text-xs">
          your space →
        </Link>
      </div>

      <div className="vt-card p-3 flex flex-col items-center gap-2">
        <Badge bg="linear-gradient(to bottom, #6d84b4, #3b5998)" color="#fff">
          JUNCTURE
        </Badge>
        <Badge bg="linear-gradient(to bottom, #a54545, #8b1a1a)" color="#fff">
          A SCHELL CO.
        </Badge>
        <Badge bg="linear-gradient(to bottom, #4a8a4a, #2d5a2d)" color="#fff">
          100% HANDMADE
        </Badge>
        <Badge bg="#1a1f16" color="#8aff5a">
          NO ALGORITHM
        </Badge>
        <div className="text-[10px] text-[#999] vt-pixel text-center">est. 2026</div>
      </div>
    </aside>
  )
}
