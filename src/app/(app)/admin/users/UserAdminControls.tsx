'use client'

import { useActionState, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  promoteUserAction,
  demoteUserAction,
  setSuspendedAction,
  makeArbiterAction,
  removeArbiterAction,
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
  const [arbiterState, makeArbiter] = useActionState<AdminActionState, FormData>(makeArbiterAction, {})
  const [unArbiterState, removeArbiter] = useActionState<AdminActionState, FormData>(removeArbiterAction, {})
  const [showArbiterForm, setShowArbiterForm] = useState(false)

  useEffect(() => {
    if (promoteState.ok || demoteState.ok || suspendState.ok || arbiterState.ok || unArbiterState.ok) {
      router.refresh()
    }
  }, [promoteState.ok, demoteState.ok, suspendState.ok, arbiterState.ok, unArbiterState.ok, router])

  const err =
    promoteState.error ||
    demoteState.error ||
    suspendState.error ||
    arbiterState.error ||
    unArbiterState.error

  if (role === 'admin') {
    if (isSelf) return <span className="text-xs text-[#999]">— you —</span>
    return (
      <div className="flex flex-col gap-1">
        {err && <div className="text-xs text-red-700">{err}</div>}
        <form
          action={removeArbiter}
          onSubmit={(e) => {
            if (!confirm('Remove their arbiter powers? They stay a creator.')) e.preventDefault()
          }}
        >
          <input type="hidden" name="userId" value={userId} />
          <button type="submit" className="vt-btn-ghost text-xs py-0.5" style={{ color: '#8b1a1a' }}>
            Remove arbiter
          </button>
        </form>
      </div>
    )
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

      {/* Arbiter grant — for co-founders (Jesse, Ali). Tucked behind a toggle
          so the everyday promote flow stays uncluttered. */}
      {showArbiterForm ? (
        <form action={makeArbiter} className="flex flex-wrap items-center gap-1">
          <input type="hidden" name="userId" value={userId} />
          <input
            name="note"
            placeholder="who is this? (logged)"
            className="vt-input text-xs py-0.5 w-44"
            required
          />
          <button
            type="submit"
            className="vt-btn text-xs py-0.5"
            style={{
              background: 'linear-gradient(to bottom, #a54545 0%, #8b1a1a 100%)',
              borderColor: '#7a2a2a',
            }}
          >
            Make arbiter
          </button>
          <button
            type="button"
            className="text-xs text-[#666] hover:underline"
            onClick={() => setShowArbiterForm(false)}
          >
            Cancel
          </button>
        </form>
      ) : (
        <button
          type="button"
          className="text-xs text-[#999] hover:underline self-start"
          onClick={() => setShowArbiterForm(true)}
        >
          Make arbiter…
        </button>
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
