import { hash, verify, type Algorithm } from '@node-rs/argon2'
import crypto from 'crypto'

// @node-rs/argon2's `Algorithm` is an ambient const enum, which can't be
// accessed by value under Next's required `isolatedModules`. Argon2id === 2.
const ARGON2ID = 2 as Algorithm

// argon2id with sensible defaults — memory-hard, resistant to GPU cracking.
const OPTS = {
  algorithm: ARGON2ID,
  memoryCost: 19456, // 19 MiB — OWASP-recommended floor
  timeCost: 2,
  parallelism: 1,
}

export async function hashPassword(plain: string): Promise<string> {
  return hash(plain, OPTS)
}

export async function verifyPassword(stored: string, plain: string): Promise<boolean> {
  try {
    return await verify(stored, plain)
  } catch {
    // Malformed hash or verification error — treat as a failed login, never throw.
    return false
  }
}

// A guaranteed-valid argon2id hash of a random value, computed once. Login uses
// this to run a real verify when no account matches, so the response time for a
// nonexistent username matches that of a wrong password — no account enumeration
// via timing. Computing it (rather than hardcoding a literal) ensures the format
// is always valid, so verify does real work instead of throwing early.
let dummyHashPromise: Promise<string> | null = null
export function getDummyHash(): Promise<string> {
  if (!dummyHashPromise) {
    dummyHashPromise = hashPassword(crypto.randomUUID() + crypto.randomUUID())
  }
  return dummyHashPromise
}
