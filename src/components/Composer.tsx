'use client'

import { useActionState, useEffect, useRef } from 'react'
import { useFormStatus } from 'react-dom'
import { useRouter } from 'next/navigation'
import { createPostAction } from '@/app/(app)/feed/post-actions'
import { POST_MAX, type PostState } from '@/lib/post-constants'

function SubmitBtn() {
  const { pending } = useFormStatus()
  return (
    <button type="submit" className="vt-btn" disabled={pending}>
      {pending ? 'Sharing…' : 'Share'}
    </button>
  )
}

export function Composer({ displayName }: { displayName: string }) {
  const [state, action] = useActionState<PostState, FormData>(createPostAction, {})
  const formRef = useRef<HTMLFormElement>(null)
  const router = useRouter()

  // On a successful post, clear the box and pull the fresh feed in.
  useEffect(() => {
    if (state.ok) {
      formRef.current?.reset()
      router.refresh()
    }
  }, [state.ok, router])

  return (
    <div className="vt-card p-3">
      <form ref={formRef} action={action} className="space-y-2">
        {state.error && (
          <div className="text-sm text-red-700 bg-red-50 border border-red-200 rounded px-2 py-1">
            {state.error}
          </div>
        )}
        <textarea
          name="body"
          className="vt-textarea"
          placeholder={`What's on your mind, ${displayName}?`}
          maxLength={POST_MAX}
          required
        />
        <div className="flex justify-end">
          <SubmitBtn />
        </div>
      </form>
    </div>
  )
}
