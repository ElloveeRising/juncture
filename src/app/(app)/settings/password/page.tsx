import Link from 'next/link'
import { requireUser } from '@/lib/auth'
import { ChangePasswordForm } from '../ChangePasswordForm'

// Password lives on its own page so a password change can never disturb
// unsaved profile edits (and vice versa).
export default async function PasswordPage() {
  await requireUser()
  return (
    <div className="space-y-4">
      <div className="vt-card p-4">
        <div className="flex items-center justify-between mb-3">
          <h1 className="text-lg">Change password</h1>
          <Link href="/settings" className="text-sm">← Back to settings</Link>
        </div>
        <ChangePasswordForm />
        <p className="text-xs text-[#999] mt-3">
          Changing your password signs out every other device — only this one stays in.
        </p>
      </div>
    </div>
  )
}
