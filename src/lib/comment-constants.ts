// Client-safe constants/types for comments (kept out of 'use server' files).
export const COMMENT_MAX = 2000

export type CommentState = { error?: string; ok?: boolean }
