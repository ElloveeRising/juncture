'use client'

import { useActionState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import {
  promoteUserAction,
  demoteUserAction,
  setSuspendedAction,
  type AdminActionState,
} from '../admin-actions'

export function UserAdminControls({
  userId,
  role,
  status,
  isSelf,
}: {
  userId: number
  role: 'admin' | 'creator' | 'supporter'
  status: 'active' | 'suspended'
  isSelf: boolean
}) {
  const router = useRouter()
  const [promoteState, promote] = useActionState<AdminActionState, FormData>(promoteUserAction, {})
  const [demoteState, demote] = useActionState<AdminActionState, FormData>(demoteUserAction, {})
  const [suspendState, suspend] = useActionState<AdminActionState, FormData>(setSuspendedAction, {})

  useEffect(() => {
    if (promoteState.ok || demoteState.ok || suspendState.ok) router.refresh()
  }, [promoteState.ok, demoteState.ok, suspendState.ok, router])

  const err = promoteState.error || demoteState.error || suspendState.error

  if (role === 'admin') {
    return <span className="text-xs text-[#999]">— admin —</span>
  }

  return (
    <div className="flex flex-col gap-1">
      {err && <div className="text-xs text-red-700">{err}</div>}

      {role === 'supporter' && (
        <form action={promote} className="flex flex-wrap items-center gap-1">
          <input type="hidden" name="userId" value={userId} />
          <input
            name="note"
            placeholder="art contributed (logged)"
            className="vt-input text-xs py-0.5 w-44"
            required
          />
          <button type="submit" className="vt-btn text-xs py-0.5">Promote → creator</button>
        </form>
      )}

      {role === 'creator' && (
        <form action={demote}>
          <input type="hidden" name="userId" value={userId} />
          <button type="submit" className="vt-btn-ghost text-xs py-0.5" disabled={isSelf}>
            Demote → supporter
          </button>
        </form>
      )}

      <form action={suspend}>
        <input type="hidden" name="userId" value={userId} />
        <input type="hidden" name="suspend" value={status === 'suspended' ? '0' : '1'} />
        <button
          type="submit"
          className="vt-btn-ghost text-xs py-0.5"
          disabled={isSelf}
          style={status === 'suspended' ? { color: '#2d5a2d' } : { color: '#8b1a1a' }}
        >
          {status === 'suspended' ? 'Reinstate' : 'Suspend'}
        </button>
      </form>
    </div>
  )
}
