// Input validation — shared between signup, login, and profile editing.
// Returns a normalized value or an error string; keeps rules in one place.

export const USERNAME_RE = /^[a-z0-9_]{3,30}$/
export const HANDLE_RE = /^[a-z0-9_]{3,30}$/
export const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export const PASSWORD_MIN = 8
export const PASSWORD_MAX = 200

export function normalizeUsername(raw: string): { value?: string; error?: string } {
  const value = raw.trim().toLowerCase()
  if (!USERNAME_RE.test(value)) {
    return { error: 'Username must be 3–30 characters: lowercase letters, numbers, or underscore.' }
  }
  return { value }
}

export function normalizeEmail(raw: string): { value?: string; error?: string } {
  const value = raw.trim().toLowerCase()
  if (value.length > 254 || !EMAIL_RE.test(value)) {
    return { error: 'Please enter a valid email address.' }
  }
  return { value }
}

export function validatePassword(raw: string): { value?: string; error?: string } {
  if (raw.length < PASSWORD_MIN) {
    return { error: `Password must be at least ${PASSWORD_MIN} characters.` }
  }
  if (raw.length > PASSWORD_MAX) {
    return { error: `Password must be at most ${PASSWORD_MAX} characters.` }
  }
  return { value: raw }
}

export function normalizeDisplayName(raw: string): { value?: string; error?: string } {
  const value = raw.trim()
  if (value.length < 1 || value.length > 50) {
    return { error: 'Display name must be 1–50 characters.' }
  }
  return { value }
}

export function normalizeHandle(raw: string): { value?: string; error?: string } {
  const value = raw.trim().toLowerCase()
  if (!HANDLE_RE.test(value)) {
    return { error: 'Handle must be 3–30 characters: lowercase letters, numbers, or underscore.' }
  }
  return { value }
}
