import { getCurrentUser, canPost } from '@/lib/auth'
import { getFeedPosts } from '@/lib/posts'
import { toPostCardData } from '@/lib/post-serialize'
import { Composer } from '@/components/Composer'
import { PostCard } from '@/components/PostCard'
import { FeedAutoRefresh } from '@/components/FeedAutoRefresh'

// Always render fresh — this is a near-live feed.
export const dynamic = 'force-dynamic'

export default async function FeedPage() {
  const user = (await getCurrentUser())!
  const cards = getFeedPosts(user.id).map(toPostCardData)

  return (
    <div className="space-y-4">
      <FeedAutoRefresh />

      {canPost(user) ? (
        <Composer displayName={user.displayName} />
      ) : (
        <div className="vt-card p-3">
          <p className="text-sm text-[#666]">
            You can comment and react on posts. Posting is reserved for creators —
            contribute art to A Schell Company to be promoted.
          </p>
        </div>
      )}

      {cards.length === 0 ? (
        <div className="vt-card p-6 text-center text-[#999] text-sm">
          No posts yet. The room is quiet.
        </div>
      ) : (
        cards.map((p) => (
          <PostCard key={p.id} post={p} viewerId={user.id} viewerRole={user.role} />
        ))
      )}
    </div>
  )
}
