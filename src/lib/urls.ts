// Client-safe URL helpers. Avatars and media are stored as paths relative to
// the media dir and always served through the auth-checked /media route.
export function mediaUrl(path: string | null | undefined): string | null {
  return path ? `/media/${path}` : null
}
