import { getCurrentUser, canPost } from '@/lib/auth'
import { getFeedPosts } from '@/lib/posts'
import type { CommentView } from '@/lib/comments'
import { Composer } from '@/components/Composer'
import { PostCard, type PostCardData } from '@/components/PostCard'
import type { CommentNode } from '@/components/CommentThread'
import { FeedAutoRefresh } from '@/components/FeedAutoRefresh'

function serializeComment(c: CommentView): CommentNode {
  return {
    id: c.id,
    parentId: c.parentId,
    body: c.body,
    deleted: c.deleted,
    createdAtISO: c.createdAt.toISOString(),
    editedAtISO: c.editedAt ? c.editedAt.toISOString() : null,
    author: {
      id: c.author.id,
      handle: c.author.handle,
      displayName: c.author.displayName,
      avatarPath: c.author.avatarPath,
      role: c.author.role,
    },
    reactions: c.reactions,
    replies: c.replies.map(serializeComment),
  }
}

// Always render fresh — this is a near-live feed.
export const dynamic = 'force-dynamic'

export default async function FeedPage() {
  const user = (await getCurrentUser())!
  const posts = getFeedPosts(user.id)

  const cards: PostCardData[] = posts.map((p) => ({
    id: p.id,
    body: p.body,
    createdAtISO: p.createdAt.toISOString(),
    editedAtISO: p.editedAt ? p.editedAt.toISOString() : null,
    author: {
      id: p.author.id,
      handle: p.author.handle,
      displayName: p.author.displayName,
      avatarPath: p.author.avatarPath,
      role: p.author.role,
    },
    media: p.media.map((m) => ({
      id: m.id,
      kind: m.kind,
      path: m.path,
      thumbPath: m.thumbPath,
      width: m.width,
      height: m.height,
    })),
    linkPreview: p.linkPreview,
    reactions: p.reactions,
    comments: p.comments.map(serializeComment),
  }))

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
