import { getCurrentUser, canPost } from '@/lib/auth'

// M1 placeholder feed — the composer and real posts arrive in M2.
export default async function FeedPage() {
  const user = (await getCurrentUser())!
  return (
    <div className="space-y-4">
      {canPost(user) ? (
        <div className="vt-card p-4">
          <p className="text-sm text-[#666]">
            The post composer lands in M2. With your {user.role} privileges, you&apos;ll be
            able to share text, images, audio, and links here.
          </p>
        </div>
      ) : (
        <div className="vt-card p-4">
          <p className="text-sm text-[#666]">
            This is the feed. You can comment and react on posts. Posting is reserved for
            creators — contribute art to A Schell Company to be promoted.
          </p>
        </div>
      )}
      <div className="vt-card p-6 text-center text-[#999] text-sm">
        No posts yet. The room is quiet.
      </div>
    </div>
  )
}
