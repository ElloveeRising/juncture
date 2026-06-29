import Link from 'next/link'
import { notFound } from 'next/navigation'
import { requireUser } from '@/lib/auth'
import { getProfileByHandle, getPostsByAuthor } from '@/lib/posts'
import { toPostCardData } from '@/lib/post-serialize'
import { mediaUrl } from '@/lib/urls'
import { Avatar } from '@/components/Avatar'
import { PostCard } from '@/components/PostCard'

export const dynamic = 'force-dynamic'

function RoleBadge({ role }: { role: 'admin' | 'creator' | 'supporter' }) {
  const label = role === 'admin' ? 'Admin' : role === 'creator' ? 'Creator' : 'Supporter'
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
  const cards = getPostsByAuthor(profile.id, viewer.id).map(toPostCardData)

  return (
    <div className="space-y-4">
      <div className="vt-card p-4">
        <div className="flex gap-4">
          <Avatar displayName={profile.displayName} src={mediaUrl(profile.avatarPath)} size={72} />
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-xl font-bold">{profile.displayName}</h1>
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
              {/* Block / mute / report / message arrive in M8–M9. */}
            </div>
          </div>
        </div>
      </div>

      <h2 className="text-sm font-bold text-[#666] px-1">
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
