'use client'

import { useActionState, useEffect, useRef, useState } from 'react'
import { useFormStatus } from 'react-dom'
import { useRouter } from 'next/navigation'
import { Avatar } from '@/components/Avatar'
import { updateProfileAction } from './profile-actions'
import { BIO_MAX, type ProfileState } from '@/lib/profile-constants'
import { IMAGE_ACCEPT } from '@/lib/media-constants'

function SaveBtn() {
  const { pending } = useFormStatus()
  return (
    <button type="submit" className="vt-btn" disabled={pending}>
      {pending ? 'Saving…' : 'Save profile'}
    </button>
  )
}

export function ProfileForm({
  initial,
}: {
  initial: {
    displayName: string
    handle: string
    bio: string
    avatarUrl: string | null
    isAnonymous: boolean
    allowSupporterDms: boolean
    role: 'admin' | 'creator' | 'supporter'
  }
}) {
  const [state, action] = useActionState<ProfileState, FormData>(updateProfileAction, {})
  const router = useRouter()
  const fileRef = useRef<HTMLInputElement>(null)
  const [avatarPreview, setAvatarPreview] = useState<string | null>(initial.avatarUrl)
  const [removeAvatar, setRemoveAvatar] = useState(false)

  useEffect(() => {
    if (state.ok) router.refresh()
  }, [state.ok, router])

  function onAvatar(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0]
    if (f) {
      setAvatarPreview(URL.createObjectURL(f))
      setRemoveAvatar(false)
    }
  }

  return (
    <form action={action} className="space-y-3">
      {state.error && (
        <div className="text-sm text-red-700 bg-red-50 border border-red-200 rounded px-2 py-1">
          {state.error}
        </div>
      )}
      {state.ok && (
        <div className="text-sm text-green-800 bg-green-50 border border-green-200 rounded px-2 py-1">
          Profile saved.
        </div>
      )}

      <div className="flex items-center gap-3">
        <Avatar displayName={initial.displayName} src={removeAvatar ? null : avatarPreview} size={56} />
        <div className="flex flex-col gap-1">
          <input
            ref={fileRef}
            type="file"
            name="avatar"
            accept={IMAGE_ACCEPT}
            className="hidden"
            onChange={onAvatar}
          />
          <button type="button" className="vt-btn-ghost text-xs" onClick={() => fileRef.current?.click()}>
            Choose avatar
          </button>
          {(avatarPreview || initial.avatarUrl) && (
            <label className="text-xs text-[#666] flex items-center gap-1">
              <input
                type="checkbox"
                name="removeAvatar"
                checked={removeAvatar}
                onChange={(e) => setRemoveAvatar(e.target.checked)}
              />
              Remove avatar
            </label>
          )}
        </div>
      </div>

      <div>
        <label className="block text-sm text-[#666] mb-1" htmlFor="displayName">Display name</label>
        <input id="displayName" name="displayName" className="vt-input" defaultValue={initial.displayName} required />
      </div>
      <div>
        <label className="block text-sm text-[#666] mb-1" htmlFor="handle">Handle (public @name)</label>
        <input id="handle" name="handle" className="vt-input" defaultValue={initial.handle} required />
        <p className="text-xs text-[#999] mt-1">
          Your public identity. You can decouple this entirely from your real name.
        </p>
      </div>
      <div>
        <label className="block text-sm text-[#666] mb-1" htmlFor="bio">Bio</label>
        <textarea id="bio" name="bio" className="vt-textarea min-h-[60px]" defaultValue={initial.bio} maxLength={BIO_MAX} />
      </div>

      <label className="flex items-start gap-2 text-sm">
        <input type="checkbox" name="isAnonymous" defaultChecked={initial.isAnonymous} className="mt-0.5" />
        <span>
          <strong>Stay anonymous.</strong>{' '}
          <span className="text-[#666]">
            Your email and account name are never shown to anyone. Only your handle,
            display name, and avatar are public.
          </span>
        </span>
      </label>

      {(initial.role === 'creator' || initial.role === 'admin') && (
        <label className="flex items-start gap-2 text-sm">
          <input type="checkbox" name="allowSupporterDms" defaultChecked={initial.allowSupporterDms} className="mt-0.5" />
          <span>
            <strong>Let supporters message me.</strong>{' '}
            <span className="text-[#666]">
              Off by default. When off, only other creators can DM you.
            </span>
          </span>
        </label>
      )}

      <SaveBtn />
    </form>
  )
}
