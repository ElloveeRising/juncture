'use client'

import { useActionState, useEffect, useState } from 'react'
import { useFormStatus } from 'react-dom'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Avatar } from './Avatar'
import { TimeAgo } from './TimeAgo'
import { PostMedia, type PostMediaView } from './PostMedia'
import { editPostAction, deletePostAction } from '@/app/(app)/feed/post-actions'
import { POST_MAX, type PostState } from '@/lib/post-constants'

export type PostCardData = {
  id: number
  body: string | null
  createdAtISO: string
  editedAtISO: string | null
  author: {
    id: number
    handle: string
    displayName: string
    avatarPath: string | null
    role: 'admin' | 'creator' | 'supporter'
  }
  media: PostMediaView[]
}

function SaveBtn() {
  const { pending } = useFormStatus()
  return (
    <button type="submit" className="vt-btn" disabled={pending}>
      {pending ? 'Saving…' : 'Save'}
    </button>
  )
}

export function PostCard({
  post,
  viewerId,
  viewerRole,
}: {
  post: PostCardData
  viewerId: number
  viewerRole: 'admin' | 'creator' | 'supporter'
}) {
  const router = useRouter()
  const [editing, setEditing] = useState(false)
  const [editState, editAction] = useActionState<PostState, FormData>(editPostAction, {})

  const isOwner = post.author.id === viewerId
  const canDelete = isOwner || viewerRole === 'admin'

  useEffect(() => {
    if (editState.ok) {
      setEditing(false)
      router.refresh()
    }
  }, [editState.ok, router])

  return (
    <div className="vt-card p-3">
      <div className="flex gap-3">
        <Link href={`/u/${post.author.handle}`}>
          <Avatar displayName={post.author.displayName} src={post.author.avatarPath} />
        </Link>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <Link href={`/u/${post.author.handle}`} className="font-bold text-[#333] hover:underline">
              {post.author.displayName}
            </Link>
            <span className="text-xs text-[#999]">@{post.author.handle}</span>
            <span className="text-xs text-[#999]">·</span>
            <span className="text-xs text-[#999]">
              <TimeAgo iso={post.createdAtISO} />
              {post.editedAtISO && <span className="ml-1 italic">(edited)</span>}
            </span>
          </div>

          {editing ? (
            <form action={editAction} className="mt-2 space-y-2">
              <input type="hidden" name="postId" value={post.id} />
              {editState.error && (
                <div className="text-sm text-red-700 bg-red-50 border border-red-200 rounded px-2 py-1">
                  {editState.error}
                </div>
              )}
              <textarea
                name="body"
                defaultValue={post.body ?? ''}
                className="vt-textarea"
                maxLength={POST_MAX}
                required
              />
              <div className="flex gap-2">
                <SaveBtn />
                <button
                  type="button"
                  className="vt-btn-ghost"
                  onClick={() => setEditing(false)}
                >
                  Cancel
                </button>
              </div>
            </form>
          ) : (
            <>
              {post.body && (
                <p className="mt-1 text-base whitespace-pre-wrap break-words text-[#333]">
                  {post.body}
                </p>
              )}
              {post.media.length > 0 && <PostMedia media={post.media} />}
            </>
          )}

          {(isOwner || canDelete) && !editing && (
            <div className="mt-2 flex gap-3 text-xs">
              {isOwner && (
                <button className="text-[#3b5998] hover:underline" onClick={() => setEditing(true)}>
                  Edit
                </button>
              )}
              {canDelete && (
                <form
                  action={deletePostAction}
                  onSubmit={(e) => {
                    if (!confirm('Delete this post?')) e.preventDefault()
                  }}
                >
                  <input type="hidden" name="postId" value={post.id} />
                  <button type="submit" className="text-[#8b1a1a] hover:underline">
                    Delete
                  </button>
                </form>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
