import Link from 'next/link'
import { notFound } from 'next/navigation'
import { requireUser } from '@/lib/auth'
import { getProfileByHandle, getPostsByAuthor } from '@/lib/posts'
import { toPostCardData } from '@/lib/post-serialize'
import { canInitiateDm } from '@/lib/dm'
import { hasBlocked, hasMuted } from '@/lib/relationships'
import { resolveAccent, resolveBg } from '@/lib/profile-themes'
import { mediaUrl } from '@/lib/urls'
import { Avatar } from '@/components/Avatar'
import { PostCard } from '@/components/PostCard'
import { ProfileSafetyControls } from '@/components/ProfileSafetyControls'
import { startConversationAction } from '@/app/(app)/messages/dm-actions'

export const dynamic = 'force-dynamic'

function RoleBadge({ role }: { role: 'admin' | 'creator' | 'supporter' }) {
  const label = role === 'admin' ? 'Arbiter' : role === 'creator' ? 'Creator' : 'Supporter'
  const bg = role === 'admin' ? '#8b1a1a' : role === 'creator' ? '#2d5a2d' : '#555'
  return (
    <span className="text-xs px-1.5 py-0.5 rounded text-white" style={{ background: bg }}>
      {label}
    </span>
  )
}

export default async function ProfilePage({
  params,
}: {
  params: Promise<{ handle: string }>
}) {
  const viewer = await requireUser()
  const { handle } = await params
  const profile = getProfileByHandle(handle.toLowerCase())
  if (!profile) notFound()

  const isSelf = profile.id === viewer.id

  // If this member has blocked the viewer, the profile simply doesn't exist
  // for them — a block severs visibility both directions, and a 404 discloses
  // nothing about whether a block is the reason.
  if (!isSelf && hasBlocked(profile.id, viewer.id)) notFound()

  const cards = getPostsByAuthor(profile.id, viewer.id).map(toPostCardData)
  const blocked = !isSelf && hasBlocked(viewer.id, profile.id)
  const muted = !isSelf && hasMuted(viewer.id, profile.id)

  const accent = resolveAccent(profile.profileAccent)
  const bg = resolveBg(profile.profileBg)
  const onBgText = bg.dark ? 'rgba(255,255,255,0.75)' : '#666'

  // Show a Message button only when the DM matrix permits it.
  const canMessage =
    !isSelf &&
    canInitiateDm(
      { id: viewer.id, role: viewer.role, status: 'active', allowSupporterDms: viewer.allowSupporterDms },
      { id: profile.id, role: profile.role, status: 'active', allowSupporterDms: profile.allowSupporterDms },
    ).ok

  return (
    // Their space: the member's chosen backdrop wraps everything on their page.
    <div
      className="space-y-4 rounded border border-[#d8dfea] p-3 -m-1"
      style={{ background: bg.color }}
    >
      <div className="vt-card p-4" style={{ borderTop: `3px solid ${accent.color}` }}>
        <div className="flex gap-4">
          <Avatar displayName={profile.displayName} src={mediaUrl(profile.avatarPath)} size={72} />
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-xl font-bold" style={{ color: accent.color }}>
                {profile.displayName}
              </h1>
              <RoleBadge role={profile.role} />
              {profile.isAnonymous && (
                <span className="text-xs text-[#666]" title="This member keeps their real identity private">
                  🕶 anonymous
                </span>
              )}
            </div>
            <div className="text-sm text-[#999]">@{profile.handle}</div>
            {profile.bio && (
              <p className="mt-2 text-sm whitespace-pre-wrap break-words text-[#333]">{profile.bio}</p>
            )}
            {/* Join date is omitted for anonymous members as a correlation guard. */}
            {!profile.isAnonymous && (
              <div className="mt-2 text-xs text-[#999]">
                Member since {profile.createdAt.toLocaleDateString()}
              </div>
            )}
            <div className="mt-3 flex gap-2">
              {isSelf && (
                <Link href="/settings" className="vt-btn-ghost text-xs">
                  Edit profile
                </Link>
              )}
              {canMessage && (
                <form action={startConversationAction}>
                  <input type="hidden" name="recipientId" value={profile.id} />
                  <button type="submit" className="vt-btn text-xs">
                    Message
                  </button>
                </form>
              )}
            </div>
            {!isSelf && (
              <div className="mt-3 pt-2 border-t border-[#eee]">
                <ProfileSafetyControls
                  targetId={profile.id}
                  initialBlocked={blocked}
                  initialMuted={muted}
                />
              </div>
            )}
          </div>
        </div>

        {profile.profileSongPath && (
          <div className="mt-3 pt-3 border-t border-[#eee]">
            <div className="text-xs font-bold mb-1" style={{ color: accent.color }}>
              ♫ {profile.profileSongTitle || 'Profile song'}
            </div>
            <audio
              controls
              preload="none"
              className="w-full max-w-md"
              src={`/media/${profile.profileSongPath}`}
            >
              Your browser does not support audio playback.
            </audio>
          </div>
        )}
      </div>

      {blocked && (
        <div className="vt-card p-4 text-sm text-[#666]">
          You’ve blocked this person. Their posts are hidden and you can’t message each other.
          Unblock above to restore.
        </div>
      )}

      <h2 className="text-sm font-bold px-1" style={{ color: onBgText }}>
        {isSelf ? 'Your posts' : `Posts by ${profile.displayName}`}
      </h2>

      {cards.length === 0 ? (
        <div className="vt-card p-6 text-center text-[#999] text-sm">No posts yet.</div>
      ) : (
        cards.map((p) => (
          <PostCard key={p.id} post={p} viewerId={viewer.id} viewerRole={viewer.role} />
        ))
      )}
    </div>
  )
}
