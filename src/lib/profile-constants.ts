// Client-safe profile constants/types (kept out of 'use server' files).
export const BIO_MAX = 500

export type ProfileState = { error?: string; ok?: boolean }
