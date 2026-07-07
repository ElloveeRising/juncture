'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { toggleBlock, toggleMute } from '@/app/(app)/safety-actions'
import { ReportButton } from './ReportButton'

export function ProfileSafetyControls({
  targetId,
  initialBlocked,
  initialMuted,
}: {
  targetId: number
  initialBlocked: boolean
  initialMuted: boolean
}) {
  const router = useRouter()
  const [blocked, setBlocked] = useState(initialBlocked)
  const [muted, setMuted] = useState(initialMuted)
  const [, startTransition] = useTransition()

  function onBlock() {
    startTransition(async () => {
      const res = await toggleBlock(targetId)
      if (!res.error) {
        setBlocked(res.blocked)
        if (res.blocked) setMuted(false) // block supersedes mute
        router.refresh()
      }
    })
  }
  function onMute() {
    startTransition(async () => {
      const res = await toggleMute(targetId)
      if (!res.error) {
        setMuted(res.muted)
        router.refresh()
      }
    })
  }

  return (
    <div className="flex items-center gap-3">
      <button
        className="vt-btn-ghost text-xs"
        onClick={onBlock}
        style={blocked ? { color: '#2d7d5a' } : { color: '#c0503c' }}
      >
        {blocked ? 'Unblock' : 'Block'}
      </button>
      {!blocked && (
        <button className="vt-btn-ghost text-xs" onClick={onMute}>
          {muted ? 'Unmute' : 'Mute'}
        </button>
      )}
      <ReportButton targetType="user" targetId={targetId} />
    </div>
  )
}
