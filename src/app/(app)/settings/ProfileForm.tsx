'use client'

import { useActionState, useEffect, useRef, useState } from 'react'
import { useFormStatus } from 'react-dom'
import { useRouter } from 'next/navigation'
import { Avatar } from '@/components/Avatar'
import { updateProfileAction } from './profile-actions'
import { BIO_MAX, type ProfileState } from '@/lib/profile-constants'
import { IMAGE_ACCEPT, AUDIO_ACCEPT } from '@/lib/media-constants'
import { ACCENTS, BACKGROUNDS, type AccentKey, type BgKey } from '@/lib/profile-themes'

// Draft persistence: everything you type is kept (per tab, per account) until
// you save, so navigating away — or anything else — can never eat your words
// again. Keyed by user id so drafts never bleed across accounts on a shared
// browser.
const draftKey = (userId: number) => `juncture:profile-draft:${userId}`

type Draft = {
  displayName: string
  handle: string
  bio: string
  isAnonymous: boolean
  allowSupporterDms: boolean
  profileAccent: string
  profileBg: string
  profileSongTitle: string
}

function SaveBtn({ dirty }: { dirty: boolean }) {
  const { pending } = useFormStatus()
  return (
    <div className="flex items-center gap-2">
      <button type="submit" className="vt-btn" disabled={pending}>
        {pending ? 'Saving…' : 'Save profile'}
      </button>
      {dirty && !pending && (
        <span className="text-xs px-1.5 py-0.5 rounded border border-[#e0c56e] bg-[#fdf6dd] text-[#7a6215]">
          Unsaved changes
        </span>
      )}
    </div>
  )
}

function Swatches({
  options,
  value,
  onPick,
}: {
  options: Record<string, { label: string; color: string }>
  value: string
  onPick: (key: string) => void
}) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {Object.entries(options).map(([key, o]) => (
        <button
          key={key}
          type="button"
          title={o.label}
          aria-label={o.label}
          aria-pressed={value === key}
          onClick={() => onPick(key)}
          className="w-7 h-7 rounded border"
          style={{
            background: o.color,
            borderColor: value === key ? '#333' : '#cfe5dd',
            boxShadow: value === key ? '0 0 0 2px rgba(31,138,125,0.4)' : undefined,
          }}
        />
      ))}
    </div>
  )
}

export function ProfileForm({
  initial,
}: {
  initial: Draft & {
    userId: number
    avatarUrl: string | null
    bannerUrl: string | null
    songTitleSaved: string | null
    hasSong: boolean
    role: 'admin' | 'creator' | 'supporter'
  }
}) {
  const DRAFT_KEY = draftKey(initial.userId)
  const [state, action] = useActionState<ProfileState, FormData>(updateProfileAction, {})
  const router = useRouter()
  const avatarInputRef = useRef<HTMLInputElement>(null)
  const bannerInputRef = useRef<HTMLInputElement>(null)
  const songInputRef = useRef<HTMLInputElement>(null)

  const [form, setForm] = useState<Draft>({
    displayName: initial.displayName,
    handle: initial.handle,
    bio: initial.bio,
    isAnonymous: initial.isAnonymous,
    allowSupporterDms: initial.allowSupporterDms,
    profileAccent: initial.profileAccent,
    profileBg: initial.profileBg,
    profileSongTitle: initial.profileSongTitle,
  })
  const [baseline, setBaseline] = useState<Draft>(form)
  const [restored, setRestored] = useState(false)
  const [avatarPreview, setAvatarPreview] = useState<string | null>(initial.avatarUrl)
  const [avatarFileName, setAvatarFileName] = useState<string | null>(null)
  const [bannerPreview, setBannerPreview] = useState<string | null>(initial.bannerUrl)
  const [bannerFileName, setBannerFileName] = useState<string | null>(null)
  const [songFileName, setSongFileName] = useState<string | null>(null)
  const [removeAvatar, setRemoveAvatar] = useState(false)
  const [removeBanner, setRemoveBanner] = useState(false)
  const [removeSong, setRemoveSong] = useState(false)

  // Restore a draft from this tab, if one exists.
  useEffect(() => {
    try {
      const raw = sessionStorage.getItem(DRAFT_KEY)
      if (raw) {
        const draft = JSON.parse(raw) as Draft
        setForm(draft)
        setRestored(true)
      }
    } catch {
      /* corrupt draft — ignore */
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Persist the draft on every change (files can't be persisted — the chips
  // below make it obvious whether one is attached).
  function update<K extends keyof Draft>(key: K, value: Draft[K]) {
    setForm((prev) => {
      const next = { ...prev, [key]: value }
      try {
        sessionStorage.setItem(DRAFT_KEY, JSON.stringify(next))
      } catch {
        /* storage full/blocked — typing still works, just unpersisted */
      }
      return next
    })
  }

  useEffect(() => {
    if (state.ok) {
      try {
        sessionStorage.removeItem(DRAFT_KEY)
      } catch {}
      const saved = { ...form, handle: form.handle.trim().toLowerCase() }
      setBaseline(saved)
      setForm(saved)
      setRestored(false)
      setAvatarFileName(null)
      setBannerFileName(null)
      setSongFileName(null)
      setRemoveAvatar(false)
      setRemoveBanner(false)
      setRemoveSong(false)
      router.refresh()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.ok, router])

  const dirty =
    JSON.stringify(form) !== JSON.stringify(baseline) ||
    !!avatarFileName ||
    !!bannerFileName ||
    !!songFileName ||
    removeAvatar ||
    removeBanner ||
    removeSong

  function onAvatarPick(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0]
    if (f) {
      setAvatarPreview(URL.createObjectURL(f))
      setAvatarFileName(f.name)
      setRemoveAvatar(false)
    }
  }
  function onBannerPick(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0]
    if (f) {
      setBannerPreview(URL.createObjectURL(f))
      setBannerFileName(f.name)
      setRemoveBanner(false)
    }
  }
  function onSongPick(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0]
    if (f) {
      setSongFileName(f.name)
      setRemoveSong(false)
    }
  }

  return (
    <form action={action} className="space-y-4">
      {state.error && (
        <div className="text-sm text-red-700 bg-red-50 border border-red-200 rounded px-2 py-1">
          {state.error}
        </div>
      )}
      {state.ok && !dirty && (
        <div className="text-sm text-green-800 bg-green-50 border border-green-200 rounded px-2 py-1">
          Profile saved.
        </div>
      )}
      {restored && (
        <div className="text-sm text-[#7a6215] bg-[#fdf6dd] border border-[#e0c56e] rounded px-2 py-1">
          Restored your unsaved edits from earlier. Hit Save when you&apos;re ready — or refresh
          the page to discard them.
        </div>
      )}

      {/* ── Identity ── */}
      <div className="flex items-center gap-3">
        <Avatar
          displayName={form.displayName || '?'}
          src={removeAvatar ? null : avatarPreview}
          size={56}
        />
        <div className="flex flex-col gap-1">
          <input
            ref={avatarInputRef}
            type="file"
            name="avatar"
            accept={IMAGE_ACCEPT}
            className="hidden"
            onChange={onAvatarPick}
          />
          <button
            type="button"
            className="vt-btn-ghost text-xs"
            onClick={() => avatarInputRef.current?.click()}
          >
            Choose avatar
          </button>
          {avatarFileName && (
            <span className="text-xs px-1.5 py-0.5 rounded border border-[#b5ddd0] bg-[#dff2ea] text-[#1f8a7d]">
              📎 {avatarFileName} — uploads when you save
            </span>
          )}
          {(avatarPreview || initial.avatarUrl) && !avatarFileName && (
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
        <input
          id="displayName"
          name="displayName"
          className="vt-input"
          value={form.displayName}
          onChange={(e) => update('displayName', e.target.value)}
          maxLength={50}
          required
        />
        <p className="text-xs text-[#999] mt-1">Anything you like, up to 50 characters. This is the name people see.</p>
      </div>
      <div>
        <label className="block text-sm text-[#666] mb-1" htmlFor="handle">Handle (your @name)</label>
        <input
          id="handle"
          name="handle"
          className="vt-input"
          value={form.handle}
          onChange={(e) => update('handle', e.target.value)}
          autoCapitalize="off"
          autoCorrect="off"
          spellCheck={false}
          required
        />
        <p className="text-xs text-[#999] mt-1">
          3–30 characters: lowercase letters, numbers, or underscore — no spaces.
          Capitals are lowercased automatically. Fully decoupled from your real name.
        </p>
      </div>
      <div>
        <label className="block text-sm text-[#666] mb-1" htmlFor="bio">Bio</label>
        <textarea
          id="bio"
          name="bio"
          className="vt-textarea min-h-[60px]"
          value={form.bio}
          onChange={(e) => update('bio', e.target.value)}
          maxLength={BIO_MAX}
        />
      </div>

      {/* ── Your space ── */}
      <div className="border-t border-[#eee] pt-3 space-y-3">
        <h3 className="text-sm font-bold text-[#333]">Your space</h3>

        <div>
          <span className="block text-sm text-[#666] mb-1">Banner</span>
          {bannerPreview && !removeBanner && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={bannerPreview}
              alt=""
              className="w-full h-20 object-cover rounded border border-[#cfe5dd] mb-1"
            />
          )}
          <input
            ref={bannerInputRef}
            type="file"
            name="banner"
            accept={IMAGE_ACCEPT}
            className="hidden"
            onChange={onBannerPick}
          />
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              className="vt-btn-ghost text-xs"
              onClick={() => bannerInputRef.current?.click()}
            >
              {initial.bannerUrl || bannerFileName ? 'Replace banner' : 'Choose banner'}
            </button>
            {bannerFileName && (
              <span className="text-xs px-1.5 py-0.5 rounded border border-[#b5ddd0] bg-[#dff2ea] text-[#1f8a7d]">
                📎 {bannerFileName} — uploads when you save
              </span>
            )}
            {initial.bannerUrl && !bannerFileName && (
              <label className="text-xs text-[#666] flex items-center gap-1">
                <input
                  type="checkbox"
                  name="removeBanner"
                  checked={removeBanner}
                  onChange={(e) => setRemoveBanner(e.target.checked)}
                />
                Remove banner
              </label>
            )}
          </div>
          <p className="text-xs text-[#999] mt-1">
            Wide header image across the top of your page (cropped to 1600×400).
          </p>
        </div>

        <div>
          <span className="block text-sm text-[#666] mb-1">Accent color</span>
          <Swatches
            options={ACCENTS}
            value={form.profileAccent}
            onPick={(k) => update('profileAccent', k as AccentKey)}
          />
          <input type="hidden" name="profileAccent" value={form.profileAccent} />
        </div>
        <div>
          <span className="block text-sm text-[#666] mb-1">Page background</span>
          <Swatches
            options={BACKGROUNDS}
            value={form.profileBg}
            onPick={(k) => update('profileBg', k as BgKey)}
          />
          <input type="hidden" name="profileBg" value={form.profileBg} />
        </div>

        <div>
          <span className="block text-sm text-[#666] mb-1">Profile song</span>
          <input
            ref={songInputRef}
            type="file"
            name="profileSong"
            accept={AUDIO_ACCEPT}
            className="hidden"
            onChange={onSongPick}
          />
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              className="vt-btn-ghost text-xs"
              onClick={() => songInputRef.current?.click()}
            >
              ♪ {initial.hasSong ? 'Replace song' : 'Choose song'}
            </button>
            {songFileName && (
              <span className="text-xs px-1.5 py-0.5 rounded border border-[#b5ddd0] bg-[#dff2ea] text-[#1f8a7d]">
                📎 {songFileName} — uploads when you save
              </span>
            )}
            {initial.hasSong && !songFileName && (
              <label className="text-xs text-[#666] flex items-center gap-1">
                <input
                  type="checkbox"
                  name="removeSong"
                  checked={removeSong}
                  onChange={(e) => setRemoveSong(e.target.checked)}
                />
                Remove song
              </label>
            )}
          </div>
          {!removeSong && (initial.hasSong || songFileName) && (
            <div className="mt-2">
              <label className="block text-xs text-[#999] mb-0.5" htmlFor="profileSongTitle">
                Song title (shown on your profile)
              </label>
              <input
                id="profileSongTitle"
                name="profileSongTitle"
                className="vt-input max-w-xs"
                value={form.profileSongTitle}
                onChange={(e) => update('profileSongTitle', e.target.value)}
                maxLength={120}
                placeholder="Artist — Track"
              />
            </div>
          )}
          <p className="text-xs text-[#999] mt-1">
            MP3, OGG, WAV, or M4A. Plays on your profile for anyone who hits play.
          </p>
        </div>
      </div>

      {/* ── Privacy ── */}
      <div className="border-t border-[#eee] pt-3 space-y-2">
        <label className="flex items-start gap-2 text-sm">
          <input
            type="checkbox"
            name="isAnonymous"
            checked={form.isAnonymous}
            onChange={(e) => update('isAnonymous', e.target.checked)}
            className="mt-0.5"
          />
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
            <input
              type="checkbox"
              name="allowSupporterDms"
              checked={form.allowSupporterDms}
              onChange={(e) => update('allowSupporterDms', e.target.checked)}
              className="mt-0.5"
            />
            <span>
              <strong>Let supporters message me.</strong>{' '}
              <span className="text-[#666]">
                Off by default. When off, only other creators can DM you.
              </span>
            </span>
          </label>
        )}
      </div>

      <SaveBtn dirty={dirty} />
    </form>
  )
}
