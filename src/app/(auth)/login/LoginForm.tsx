'use client'

import { useActionState } from 'react'
import { useFormStatus } from 'react-dom'
import Link from 'next/link'
import { loginAction, type AuthState } from '../actions'

function SubmitBtn() {
  const { pending } = useFormStatus()
  return (
    <button type="submit" className="vt-btn w-full justify-center" disabled={pending}>
      {pending ? 'Signing in…' : 'Log In'}
    </button>
  )
}

export function LoginForm() {
  const [state, action] = useActionState<AuthState, FormData>(loginAction, {})
  return (
    <div className="vt-card p-5">
      <h1 className="text-lg mb-3">Log In</h1>
      <form action={action} className="space-y-3">
        {state.error && (
          <div className="text-sm text-red-700 bg-red-50 border border-red-200 rounded px-2 py-1">
            {state.error}
          </div>
        )}
        <div>
          <label className="block text-sm text-[#666] mb-1" htmlFor="identifier">
            Username or email
          </label>
          <input id="identifier" name="identifier" className="vt-input" autoComplete="username" required />
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
            autoComplete="current-password"
            required
          />
        </div>
        <SubmitBtn />
      </form>
      <p className="text-sm text-[#666] mt-4 pt-3 border-t border-[#eee]">
        New here? <Link href="/signup">Create a supporter account</Link>.
      </p>
    </div>
  )
}
