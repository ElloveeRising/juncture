// Plain constants/types shared by the post server actions and the client
// components. Kept out of the 'use server' file, which may only export async fns.
export const POST_MAX = 5000

export type PostState = { error?: string; ok?: boolean }
