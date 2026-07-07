'use client'

import { useState } from 'react'
import Link from 'next/link'
import { mediaUrl } from '@/lib/urls'
import { Avatar } from './Avatar'
import { OttoSwim, type OttoAct } from './OttoSwim'

type RailUser = {
  displayName: string
  handle: string
  avatarPath: string | null
}

function Badge({
  bg,
  color,
  onPress,
  children,
}: {
  bg: string
  color: string
  onPress: () => void
  children: React.ReactNode
}) {
  return (
    <button
      type="button"
      className="vt-badge88 cursor-pointer active:translate-y-px"
      style={{ background: bg, color }}
      onClick={onPress}
      title="…?"
    >
      {children}
    </button>
  )
}

// The portal's left column: you, then the badge wall. The badges do something
// when pressed. It doesn't matter. That's the point.
export function FeedLeftRail({ user }: { user: RailUser }) {
  const [act, setAct] = useState<OttoAct | null>(null)

  return (
    <aside className="hidden lg:flex flex-col gap-3">
      {act && <OttoSwim act={act} onDone={() => setAct(null)} />}

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
        <Badge bg="linear-gradient(to bottom, #35a893, #1f8a7d)" color="#fff" onPress={() => setAct('swim')}>
          JUNCTURE
        </Badge>
        <Badge bg="linear-gradient(to bottom, #e07a58, #c0503c)" color="#fff" onPress={() => setAct('drift')}>
          A SCHELL CO.
        </Badge>
        <Badge bg="linear-gradient(to bottom, #b39ddb, #9b7fd4)" color="#fff" onPress={() => setAct('flower')}>
          100% HANDMADE
        </Badge>
        <Badge bg="#1a1f16" color="#8aff5a" onPress={() => setAct('jet')}>
          NO ALGORITHM
        </Badge>
        <div className="text-[10px] text-[#999] vt-pixel text-center">est. 2026</div>
      </div>
    </aside>
  )
}
