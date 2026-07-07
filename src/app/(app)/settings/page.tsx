import Link from 'next/link'
import { requireUser } from '@/lib/auth'
import { mediaUrl } from '@/lib/urls'
import { ProfileForm } from './ProfileForm'

export default async function SettingsPage() {
  const user = await requireUser()
  return (
    <div className="space-y-4">
      <div className="vt-card p-4">
        <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
          <h1 className="text-lg">Settings</h1>
          <div className="flex gap-3 text-sm">
            <Link href={`/u/${user.handle}`}>View my public profile →</Link>
            <Link href="/settings/password">Change password</Link>
          </div>
        </div>
        <dl className="text-sm space-y-1">
          <div className="flex gap-2">
            <dt className="text-[#999] w-28">Account name</dt>
            <dd>{user.username} <span className="text-xs text-[#999]">(private)</span></dd>
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
      </div>

      <div className="vt-card p-4">
        <h2 className="text-base font-bold mb-3">Public profile</h2>
        <ProfileForm
          initial={{
            userId: user.id,
            displayName: user.displayName,
            handle: user.handle,
            bio: user.bio ?? '',
            avatarUrl: mediaUrl(user.avatarPath),
            bannerUrl: mediaUrl(user.bannerPath),
            isAnonymous: user.isAnonymous,
            allowSupporterDms: user.allowSupporterDms,
            role: user.role,
            profileAccent: user.profileAccent ?? 'classic',
            profileBg: user.profileBg ?? 'default',
            profileSongTitle: user.profileSongTitle ?? '',
            songTitleSaved: user.profileSongTitle,
            hasSong: !!user.profileSongPath,
          }}
        />
      </div>
    </div>
  )
}
