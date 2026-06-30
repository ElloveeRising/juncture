'use client'

import { useState, useTransition } from 'react'
import { reportTarget } from '@/app/(app)/safety-actions'

export function ReportButton({
  targetType,
  targetId,
  size = 'xs',
}: {
  targetType: 'post' | 'comment' | 'user'
  targetId: number
  size?: 'xs' | 'sm'
}) {
  const [open, setOpen] = useState(false)
  const [reason, setReason] = useState('')
  const [done, setDone] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [, startTransition] = useTransition()

  const cls = size === 'sm' ? 'text-sm' : 'text-xs'

  if (done) return <span className={`${cls} text-[#999]`}>Reported ✓</span>

  function submit() {
    setError(null)
    startTransition(async () => {
      const res = await reportTarget(targetType, targetId, reason)
      if (res.error) setError(res.error)
      else {
        setDone(true)
        setOpen(false)
      }
    })
  }

  if (!open) {
    return (
      <button className={`${cls} text-[#666] hover:underline`} onClick={() => setOpen(true)}>
        Report
      </button>
    )
  }

  return (
    <div className="inline-flex flex-col gap-1 align-top">
      {error && <span className="text-xs text-red-700">{error}</span>}
      <div className="flex gap-1">
        <input
          autoFocus
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          placeholder="What’s wrong?"
          className="vt-input text-xs py-0.5 w-40"
          maxLength={500}
          onKeyDown={(e) => {
            if (e.key === 'Enter') submit()
            if (e.key === 'Escape') setOpen(false)
          }}
        />
        <button className="vt-btn text-xs py-0.5" onClick={submit}>Send</button>
        <button className="text-xs text-[#666] hover:underline" onClick={() => setOpen(false)}>
          Cancel
        </button>
      </div>
    </div>
  )
}
