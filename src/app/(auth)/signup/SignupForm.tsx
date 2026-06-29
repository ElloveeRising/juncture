'use client'

import { useActionState } from 'react'
import { useFormStatus } from 'react-dom'
import Link from 'next/link'
import { signupAction, type AuthState } from '../actions'

function SubmitBtn() {
  const { pending } = useFormStatus()
  return (
    <button type="submit" className="vt-btn w-full justify-center" disabled={pending}>
      {pending ? 'Creating account…' : 'Sign Up'}
    </button>
  )
}

export function SignupForm() {
  const [state, action] = useActionState<AuthState, FormData>(signupAction, {})
  return (
    <div className="vt-card p-5">
      <h1 className="text-lg mb-1">Create your account</h1>
      <p className="text-sm text-[#666] mb-3">
        You&apos;ll join as a <strong>supporter</strong> — you can read, comment, and react.
        Posting is reserved for creators.
      </p>
      <form action={action} className="space-y-3">
        {state.error && (
          <div className="text-sm text-red-700 bg-red-50 border border-red-200 rounded px-2 py-1">
            {state.error}
          </div>
        )}
        <div>
          <label className="block text-sm text-[#666] mb-1" htmlFor="username">
            Username
          </label>
          <input id="username" name="username" className="vt-input" autoComplete="username" required />
          <p className="text-xs text-[#999] mt-1">3–30 chars: lowercase letters, numbers, underscore.</p>
        </div>
        <div>
          <label className="block text-sm text-[#666] mb-1" htmlFor="email">
            Email
          </label>
          <input id="email" name="email" type="email" className="vt-input" autoComplete="email" required />
          <p className="text-xs text-[#999] mt-1">Private — never shown to other members.</p>
        </div>
        <div>
          <label className="block text-sm text-[#666] mb-1" htmlFor="password">
            Password
          </label>
          <input
            id="password"
            name="password"
            type="password"
            className="vt-input"
            autoComplete="new-password"
            required
            minLength={8}
          />
          <p className="text-xs text-[#999] mt-1">At least 8 characters.</p>
        </div>
        <SubmitBtn />
      </form>
      <p className="text-sm text-[#666] mt-4 pt-3 border-t border-[#eee]">
        Already a member? <Link href="/login">Log in</Link>.
      </p>
    </div>
  )
}
