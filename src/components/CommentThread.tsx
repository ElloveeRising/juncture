'use client'

import { useActionState, useEffect, useState } from 'react'
import { useFormStatus } from 'react-dom'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Avatar } from './Avatar'
import { TimeAgo } from './TimeAgo'
import { LikeButton } from './LikeButton'
import { CommentComposer } from './CommentComposer'
import { editCommentAction, deleteCommentAction } from '@/app/(app)/feed/comment-actions'
import { COMMENT_MAX, type CommentState } from '@/lib/comment-constants'

export type CommentNode = {
  id: number
  parentId: number | null
  body: string | null
  deleted: boolean
  createdAtISO: string
  editedAtISO: string | null
  author: {
    id: number
    handle: string
    displayName: string
    avatarPath: string | null
    role: 'admin' | 'creator' | 'supporter'
  }
  reactions: { likeCount: number; likedByMe: boolean }
  replies: CommentNode[]
}

function SaveBtn() {
  const { pending } = useFormStatus()
  return (
    <button type="submit" className="vt-btn-ghost text-xs" disabled={pending}>
      {pending ? '…' : 'Save'}
    </button>
  )
}

function CommentItem({
  c,
  postId,
  viewerId,
  viewerRole,
  isReply,
}: {
  c: CommentNode
  postId: number
  viewerId: number
  viewerRole: 'admin' | 'creator' | 'supporter'
  isReply: boolean
}) {
  const router = useRouter()
  const [editing, setEditing] = useState(false)
  const [replying, setReplying] = useState(false)
  const [editState, editAction] = useActionState<CommentState, FormData>(editCommentAction, {})

  const isOwner = c.author.id === viewerId
  const canDelete = isOwner || viewerRole === 'admin'

  useEffect(() => {
    if (editState.ok) {
      setEditing(false)
      router.refresh()
    }
  }, [editState.ok, router])

  return (
    <div className="flex gap-2">
      <Link href={`/u/${c.author.handle}`} className="shrink-0 mt-0.5">
        <Avatar displayName={c.author.displayName} src={c.author.avatarPath} size={28} />
      </Link>
      <div className="min-w-0 flex-1">
        <div className="bg-[#f2f3f5] border border-[#e4e7ec] rounded px-2 py-1">
          <div className="flex items-center gap-2 flex-wrap">
            <Link href={`/u/${c.author.handle}`} className="text-sm font-bold text-[#333] hover:underline">
              {c.deleted ? 'Someone' : c.author.displayName}
            </Link>
            <span className="text-xs text-[#999]">
              <TimeAgo iso={c.createdAtISO} />
              {c.editedAtISO && <span className="ml-1 italic">(edited)</span>}
            </span>
          </div>
          {c.deleted ? (
            <p className="text-sm italic text-[#999]">[comment deleted]</p>
          ) : editing ? (
            <form action={editAction} className="mt-1 flex flex-col gap-1">
              <input type="hidden" name="commentId" value={c.id} />
              {editState.error && <div className="text-xs text-red-700">{editState.error}</div>}
              <textarea
                name="body"
                defaultValue={c.body ?? ''}
                className="vt-input text-sm py-1"
                rows={2}
                maxLength={COMMENT_MAX}
                required
              />
              <div className="flex gap-2 justify-end">
                <SaveBtn />
                <button type="button" className="text-xs text-[#666] hover:underline" onClick={() => setEditing(false)}>
                  Cancel
                </button>
              </div>
            </form>
          ) : (
            <p className="text-sm whitespace-pre-wrap break-words text-[#333]">{c.body}</p>
          )}
        </div>

        {!c.deleted && !editing && (
          <div className="flex items-center gap-3 mt-0.5 pl-1">
            <LikeButton
              targetType="comment"
              targetId={c.id}
              likeCount={c.reactions.likeCount}
              likedByMe={c.reactions.likedByMe}
              size="xs"
            />
            {!isReply && (
              <button className="text-xs text-[#666] hover:underline" onClick={() => setReplying((v) => !v)}>
                Reply
              </button>
            )}
            {isOwner && (
              <button className="text-xs text-[#666] hover:underline" onClick={() => setEditing(true)}>
                Edit
              </button>
            )}
            {canDelete && (
              <form
                action={deleteCommentAction}
                onSubmit={(e) => {
                  if (!confirm('Delete this comment?')) e.preventDefault()
                }}
              >
                <input type="hidden" name="commentId" value={c.id} />
                <button type="submit" className="text-xs text-[#8b1a1a] hover:underline">
                  Delete
                </button>
              </form>
            )}
          </div>
        )}

        {replying && (
          <div className="mt-1">
            <CommentComposer
              postId={postId}
              parentId={c.id}
              placeholder={`Reply to ${c.author.displayName}…`}
              submitLabel="Reply"
              autoFocus
              onDone={() => setReplying(false)}
            />
          </div>
        )}

        {c.replies.length > 0 && (
          <div className="mt-2 space-y-2 border-l-2 border-[#e4e7ec] pl-2">
            {c.replies.map((r) => (
              <CommentItem
                key={r.id}
                c={r}
                postId={postId}
                viewerId={viewerId}
                viewerRole={viewerRole}
                isReply
              />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

export function CommentThread({
  postId,
  comments,
  viewerId,
  viewerRole,
}: {
  postId: number
  comments: CommentNode[]
  viewerId: number
  viewerRole: 'admin' | 'creator' | 'supporter'
}) {
  return (
    <div className="mt-3 pt-2 border-t border-[#eee] space-y-2">
      {comments.map((c) => (
        <CommentItem
          key={c.id}
          c={c}
          postId={postId}
          viewerId={viewerId}
          viewerRole={viewerRole}
          isReply={false}
        />
      ))}
      <CommentComposer postId={postId} />
    </div>
  )
}
