'use client'

import { useActionState, useEffect, useRef } from 'react'
import { useFormStatus } from 'react-dom'
import { useRouter } from 'next/navigation'
import { sendMessageAction } from '@/app/(app)/messages/dm-actions'
import { MESSAGE_MAX, type SendState } from '@/lib/dm-constants'

function SendBtn() {
  const { pending } = useFormStatus()
  return (
    <button type="submit" className="vt-btn" disabled={pending}>
      {pending ? '…' : 'Send'}
    </button>
  )
}

export function MessageComposer({ conversationId }: { conversationId: number }) {
  const [state, action] = useActionState<SendState, FormData>(sendMessageAction, {})
  const formRef = useRef<HTMLFormElement>(null)
  const router = useRouter()

  useEffect(() => {
    if (state.ok) {
      formRef.current?.reset()
      router.refresh()
    }
  }, [state.ok, router])

  return (
    <form ref={formRef} action={action} className="flex flex-col gap-1">
      <input type="hidden" name="conversationId" value={conversationId} />
      {state.error && <div className="text-xs text-red-700">{state.error}</div>}
      <div className="flex gap-2 items-end">
        <textarea
          name="body"
          className="vt-input text-sm flex-1 min-h-[40px]"
          rows={1}
          placeholder="Write a message…"
          maxLength={MESSAGE_MAX}
          required
        />
        <SendBtn />
      </div>
    </form>
  )
}
