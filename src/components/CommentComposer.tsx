'use client'

import { useActionState, useEffect, useRef } from 'react'
import { useFormStatus } from 'react-dom'
import { useRouter } from 'next/navigation'
import { addCommentAction } from '@/app/(app)/feed/comment-actions'
import { COMMENT_MAX, type CommentState } from '@/lib/comment-constants'

function SubmitBtn({ label }: { label: string }) {
  const { pending } = useFormStatus()
  return (
    <button type="submit" className="vt-btn-ghost text-xs" disabled={pending}>
      {pending ? '…' : label}
    </button>
  )
}

export function CommentComposer({
  postId,
  parentId,
  placeholder = 'Write a comment…',
  submitLabel = 'Comment',
  onDone,
  autoFocus,
}: {
  postId: number
  parentId?: number
  placeholder?: string
  submitLabel?: string
  onDone?: () => void
  autoFocus?: boolean
}) {
  const [state, action] = useActionState<CommentState, FormData>(addCommentAction, {})
  const formRef = useRef<HTMLFormElement>(null)
  const router = useRouter()

  useEffect(() => {
    if (state.ok) {
      formRef.current?.reset()
      router.refresh()
      onDone?.()
    }
  }, [state.ok, router, onDone])

  return (
    <form ref={formRef} action={action} className="flex flex-col gap-1">
      <input type="hidden" name="postId" value={postId} />
      {parentId != null && <input type="hidden" name="parentId" value={parentId} />}
      {state.error && <div className="text-xs text-red-700">{state.error}</div>}
      <textarea
        name="body"
        className="vt-input text-sm min-h-[34px] py-1"
        rows={1}
        placeholder={placeholder}
        maxLength={COMMENT_MAX}
        autoFocus={autoFocus}
        required
      />
      <div className="flex justify-end">
        <SubmitBtn label={submitLabel} />
      </div>
    </form>
  )
}
