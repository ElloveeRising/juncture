'use server'

import { revalidatePath } from 'next/cache'
import { eq } from 'drizzle-orm'
import { getDb } from '@/db'
import { users } from '@/db/schema'
import { requireUser } from '@/lib/auth'
import { normalizeDisplayName, normalizeHandle } from '@/lib/validation'
import { isAllowedImage, processAndStoreAvatar, MAX_IMAGE_BYTES } from '@/lib/media'
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

  // Optional avatar upload.
  const avatarRaw = formData.get('avatar')
  const avatarFile =
    avatarRaw instanceof File && avatarRaw.size > 0 ? avatarRaw : null
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

  try {
    getDb()
      .update(users)
      .set({
        displayName: dn.value!,
        handle: h.value!,
        bio: bio || null,
        isAnonymous,
        allowSupporterDms,
        ...(avatarPath !== undefined ? { avatarPath } : {}),
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
