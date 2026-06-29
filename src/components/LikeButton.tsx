'use client'

import { useState, useTransition } from 'react'
import { toggleReaction } from '@/app/(app)/feed/reaction-actions'

export function LikeButton({
  targetType,
  targetId,
  likeCount,
  likedByMe,
  size = 'sm',
}: {
  targetType: 'post' | 'comment'
  targetId: number
  likeCount: number
  likedByMe: boolean
  size?: 'sm' | 'xs'
}) {
  const [liked, setLiked] = useState(likedByMe)
  const [count, setCount] = useState(likeCount)
  const [, startTransition] = useTransition()

  function onClick() {
    const next = !liked
    // Optimistic update, reverted if the server disagrees.
    setLiked(next)
    setCount((c) => Math.max(0, c + (next ? 1 : -1)))
    startTransition(async () => {
      const res = await toggleReaction(targetType, targetId)
      if (res.error) {
        setLiked(!next)
        setCount((c) => Math.max(0, c + (next ? -1 : 1)))
      } else {
        setLiked(res.liked)
        setCount(res.count)
      }
    })
  }

  const cls = size === 'xs' ? 'text-xs' : 'text-sm'
  return (
    <button
      type="button"
      onClick={onClick}
      className={`${cls} hover:underline ${liked ? 'font-bold text-[#3b5998]' : 'text-[#666]'}`}
      aria-pressed={liked}
    >
      {liked ? '👍 Liked' : '👍 Like'}
      {count > 0 && <span className="ml-1 text-[#999]">({count})</span>}
    </button>
  )
}
