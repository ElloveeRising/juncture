import { requireUser } from '@/lib/auth'
import { ChangePasswordForm } from './ChangePasswordForm'

export default async function SettingsPage() {
  const user = await requireUser()
  return (
    <div className="space-y-4">
      <div className="vt-card p-4">
        <h1 className="text-lg mb-3">Settings</h1>
        <dl className="text-sm space-y-1">
          <div className="flex gap-2">
            <dt className="text-[#999] w-28">Username</dt>
            <dd>{user.username}</dd>
          </div>
          <div className="flex gap-2">
            <dt className="text-[#999] w-28">Display name</dt>
            <dd>{user.displayName}</dd>
          </div>
          <div className="flex gap-2">
            <dt className="text-[#999] w-28">Handle</dt>
            <dd>@{user.handle}</dd>
          </div>
          <div className="flex gap-2">
            <dt className="text-[#999] w-28">Role</dt>
            <dd className="capitalize">{user.role}</dd>
          </div>
          <div className="flex gap-2">
            <dt className="text-[#999] w-28">Email</dt>
            <dd className="text-[#666]">{user.email} <span className="text-xs text-[#999]">(private)</span></dd>
          </div>
        </dl>
        <p className="text-xs text-[#999] mt-2">
          Profile editing (display name, handle, bio, avatar, anonymity) arrives in M6.
        </p>
      </div>

      <div className="vt-card p-4">
        <h2 className="text-base font-bold mb-3">Change password</h2>
        <ChangePasswordForm />
      </div>
    </div>
  )
}
