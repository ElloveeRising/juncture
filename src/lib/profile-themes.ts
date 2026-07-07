// "Your space" — curated profile themes. Users pick keys from these maps;
// raw CSS never comes from user input, so every combination stays readable
// and on-skin. Client-safe (no server imports).

export type AccentKey = keyof typeof ACCENTS
export type BgKey = keyof typeof BACKGROUNDS

export const ACCENTS = {
  classic: { label: 'Seafoam', color: '#1f8a7d' },
  forest: { label: 'Forest', color: '#2d7d5a' },
  wine: { label: 'Coral clay', color: '#c0503c' },
  violet: { label: 'Violet', color: '#5b3a8b' },
  sunset: { label: 'Sunset', color: '#b45f2a' },
  hotpink: { label: 'Hot pink', color: '#c2185b' },
  teal: { label: 'Turquoise', color: '#1a7a74' },
  charcoal: { label: 'Charcoal', color: '#444444' },
} as const

export const BACKGROUNDS = {
  default: { label: 'Paper', color: '#f6f2ea', dark: false },
  sky: { label: 'Sea glass', color: '#ddf0e8', dark: false },
  mint: { label: 'Mint', color: '#ddeedd', dark: false },
  blush: { label: 'Blush', color: '#f5dfe4', dark: false },
  lavender: { label: 'Lavender', color: '#e6e0f0', dark: false },
  cream: { label: 'Cream', color: '#f3edda', dark: false },
  navy: { label: 'Deep sea', color: '#1f3d38', dark: true },
  black: { label: 'Void', color: '#1a1a1a', dark: true },
} as const

export function resolveAccent(key: string | null | undefined) {
  return (key && key in ACCENTS ? ACCENTS[key as AccentKey] : ACCENTS.classic)
}

export function resolveBg(key: string | null | undefined) {
  return (key && key in BACKGROUNDS ? BACKGROUNDS[key as BgKey] : BACKGROUNDS.default)
}

export function isValidAccent(key: string): key is AccentKey {
  return key in ACCENTS
}

export function isValidBg(key: string): key is BgKey {
  return key in BACKGROUNDS
}
