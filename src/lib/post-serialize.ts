import type { FeedPost } from '@/lib/posts'
import type { CommentView } from '@/lib/comments'
import type { PostCardData } from '@/components/PostCard'
import type { CommentNode } from '@/components/CommentThread'
import { mediaUrl } from '@/lib/urls'

// Avatars render through <img src> directly, so they need the /media prefix
// here. Post media and link-preview images are prefixed by their own
// components, so their raw relative paths are passed through unchanged.

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
      avatarPath: mediaUrl(c.author.avatarPath),
      role: c.author.role,
    },
    reactions: c.reactions,
    replies: c.replies.map(serializeComment),
  }
}

export function toPostCardData(p: FeedPost): PostCardData {
  return {
    id: p.id,
    body: p.body,
    createdAtISO: p.createdAt.toISOString(),
    editedAtISO: p.editedAt ? p.editedAt.toISOString() : null,
    author: {
      id: p.author.id,
      handle: p.author.handle,
      displayName: p.author.displayName,
      avatarPath: mediaUrl(p.author.avatarPath),
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
  }
}
