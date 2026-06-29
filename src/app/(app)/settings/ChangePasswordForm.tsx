'use client'

import { useActionState } from 'react'
import { useFormStatus } from 'react-dom'
import { changePasswordAction, type ChangePwState } from '../account-actions'

function SubmitBtn() {
  const { pending } = useFormStatus()
  return (
    <button type="submit" className="vt-btn" disabled={pending}>
      {pending ? 'Saving…' : 'Change Password'}
    </button>
  )
}

export function ChangePasswordForm() {
  const [state, action] = useActionState<ChangePwState, FormData>(changePasswordAction, {})
  return (
    <form action={action} className="space-y-3 max-w-sm">
      {state.error && (
        <div className="text-sm text-red-700 bg-red-50 border border-red-200 rounded px-2 py-1">
          {state.error}
        </div>
      )}
      {state.ok && (
        <div className="text-sm text-green-800 bg-green-50 border border-green-200 rounded px-2 py-1">
          Password updated.
        </div>
      )}
      <div>
        <label className="block text-sm text-[#666] mb-1" htmlFor="current">
          Current password
        </label>
        <input id="current" name="current" type="password" className="vt-input" autoComplete="current-password" required />
      </div>
      <div>
        <label className="block text-sm text-[#666] mb-1" htmlFor="next">
          New password
        </label>
        <input id="next" name="next" type="password" className="vt-input" autoComplete="new-password" required minLength={8} />
      </div>
      <div>
        <label className="block text-sm text-[#666] mb-1" htmlFor="confirm">
          Confirm new password
        </label>
        <input id="confirm" name="confirm" type="password" className="vt-input" autoComplete="new-password" required minLength={8} />
      </div>
      <SubmitBtn />
    </form>
  )
}
