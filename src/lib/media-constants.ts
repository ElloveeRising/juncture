// Client-safe media constants (no sharp/fs imports), usable from the composer.
export const IMAGE_MIMES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'] as const
export const AUDIO_MIMES = [
  'audio/mpeg', // mp3
  'audio/ogg',
  'audio/wav',
  'audio/x-wav',
  'audio/wave',
  'audio/mp4', // m4a
  'audio/x-m4a',
  'audio/aac',
] as const

export const MAX_IMAGE_BYTES = 12 * 1024 * 1024 // 12 MB per image
export const MAX_AUDIO_BYTES = 30 * 1024 * 1024 // 30 MB per audio
export const MAX_IMAGES_PER_POST = 8
export const MAX_AUDIO_PER_POST = 1

// `accept` attribute values for the file inputs.
export const IMAGE_ACCEPT = IMAGE_MIMES.join(',')
export const AUDIO_ACCEPT = AUDIO_MIMES.join(',')
