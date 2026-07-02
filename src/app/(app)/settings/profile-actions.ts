'use server'

import { revalidatePath } from 'next/cache'
import { eq } from 'drizzle-orm'
import { getDb } from '@/db'
import { users } from '@/db/schema'
import { requireUser } from '@/lib/auth'
import { normalizeDisplayName, normalizeHandle } from '@/lib/validation'
import {
  isAllowedImage,
  isAllowedAudio,
  processAndStoreAvatar,
  storeAudio,
  MAX_IMAGE_BYTES,
  MAX_AUDIO_BYTES,
} from '@/lib/media'
import { isValidAccent, isValidBg } from '@/lib/profile-themes'
import { BIO_MAX, type ProfileState } from '@/lib/profile-constants'

export async function updateProfileAction(
  _prev: ProfileState,
  formData: FormData,
): Promise<ProfileState> {
  const user = await requireUser()

  const dn = normalizeDisplayName(String(formData.get('displayName') ?? ''))
  if (dn.error) return { error: dn.error }

  const h = normalizeHandle(String(formData.get('handle') ?? ''))
  if (h.error) return { error: h.error }

  const bio = String(formData.get('bio') ?? '').trim()
  if (bio.length > BIO_MAX) return { error: `Bio is too long (max ${BIO_MAX} characters).` }

  // Checkboxes: present in formData only when checked.
  const isAnonymous = formData.get('isAnonymous') != null
  const allowSupporterDms = formData.get('allowSupporterDms') != null
  const removeAvatar = formData.get('removeAvatar') != null
  const removeSong = formData.get('removeSong') != null

  // Theme keys — validated against the curated palette; anything else ignored.
  const accentRaw = String(formData.get('profileAccent') ?? '')
  const bgRaw = String(formData.get('profileBg') ?? '')
  const profileAccent = isValidAccent(accentRaw) ? accentRaw : 'classic'
  const profileBg = isValidBg(bgRaw) ? bgRaw : 'default'

  // Optional avatar upload.
  const avatarRaw = formData.get('avatar')
  const avatarFile = avatarRaw instanceof File && avatarRaw.size > 0 ? avatarRaw : null
  let avatarPath: string | null | undefined = undefined // undefined = leave unchanged
  if (avatarFile) {
    if (!isAllowedImage(avatarFile)) {
      return { error: 'Avatar must be a JPEG, PNG, WebP, or GIF.' }
    }
    if (avatarFile.size > MAX_IMAGE_BYTES) {
      return { error: `Avatar must be under ${MAX_IMAGE_BYTES / 1024 / 1024} MB.` }
    }
    const stored = await processAndStoreAvatar(avatarFile)
    if (!stored) return { error: 'Could not process that image. Try another.' }
    avatarPath = stored.path
  } else if (removeAvatar) {
    avatarPath = null
  }

  // Optional profile song upload.
  const songRaw = formData.get('profileSong')
  const songFile = songRaw instanceof File && songRaw.size > 0 ? songRaw : null
  let profileSongPath: string | null | undefined = undefined
  if (songFile) {
    if (!isAllowedAudio(songFile)) {
      return { error: 'Profile song must be MP3, OGG, WAV, or M4A.' }
    }
    if (songFile.size > MAX_AUDIO_BYTES) {
      return { error: `Profile song must be under ${MAX_AUDIO_BYTES / 1024 / 1024} MB.` }
    }
    try {
      const stored = await storeAudio(songFile)
      profileSongPath = stored.path
    } catch {
      return { error: 'Could not store that audio file. Try another.' }
    }
  } else if (removeSong) {
    profileSongPath = null
  }

  const songTitle = String(formData.get('profileSongTitle') ?? '').trim().slice(0, 120)
  const profileSongTitle = removeSong ? null : songTitle || null

  try {
    getDb()
      .update(users)
      .set({
        displayName: dn.value!,
        handle: h.value!,
        bio: bio || null,
        isAnonymous,
        allowSupporterDms,
        profileAccent,
        profileBg,
        profileSongTitle,
        ...(avatarPath !== undefined ? { avatarPath } : {}),
        ...(profileSongPath !== undefined ? { profileSongPath } : {}),
      })
      .where(eq(users.id, user.id))
      .run()
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    if (msg.includes('UNIQUE') && msg.includes('users.handle')) {
      return { error: 'That handle is already taken.' }
    }
    throw err
  }

  revalidatePath('/settings')
  revalidatePath(`/u/${h.value}`)
  return { ok: true }
}
