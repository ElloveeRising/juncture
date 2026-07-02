import { sql } from 'drizzle-orm'
import {
  sqliteTable,
  text,
  integer,
  real,
  unique,
  primaryKey,
} from 'drizzle-orm/sqlite-core'

// ─── Users ───────────────────────────────────────────────────────────────────
export const users = sqliteTable('users', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  username: text('username').notNull().unique(),
  email: text('email').notNull().unique(),
  passwordHash: text('password_hash').notNull(),
  role: text('role', { enum: ['admin', 'creator', 'supporter'] })
    .notNull()
    .default('supporter'),
  displayName: text('display_name').notNull(),
  // Public-facing identity — decoupled from real identity (email/username)
  handle: text('handle').notNull().unique(),
  avatarPath: text('avatar_path'),
  bio: text('bio'),
  isAnonymous: integer('is_anonymous', { mode: 'boolean' }).notNull().default(false),
  allowSupporterDms: integer('allow_supporter_dms', { mode: 'boolean' })
    .notNull()
    .default(false),
  status: text('status', { enum: ['active', 'suspended'] }).notNull().default('active'),
  // "Your space" — MySpace-era profile customization. Song plays from the
  // auth-checked /media route; colors are keys into a curated palette (never
  // raw CSS from users).
  profileSongPath: text('profile_song_path'),
  profileSongTitle: text('profile_song_title'),
  profileAccent: text('profile_accent'),
  profileBg: text('profile_bg'),
  createdAt: integer('created_at', { mode: 'timestamp' })
    .notNull()
    .default(sql`(unixepoch())`),
})

// ─── Sessions ────────────────────────────────────────────────────────────────
export const sessions = sqliteTable('sessions', {
  id: text('id').primaryKey(),
  userId: integer('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  expiresAt: integer('expires_at', { mode: 'timestamp' }).notNull(),
  createdAt: integer('created_at', { mode: 'timestamp' })
    .notNull()
    .default(sql`(unixepoch())`),
})

// ─── Posts ───────────────────────────────────────────────────────────────────
export const posts = sqliteTable('posts', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  authorId: integer('author_id')
    .notNull()
    .references(() => users.id),
  body: text('body'),
  createdAt: integer('created_at', { mode: 'timestamp' })
    .notNull()
    .default(sql`(unixepoch())`),
  editedAt: integer('edited_at', { mode: 'timestamp' }),
  deletedAt: integer('deleted_at', { mode: 'timestamp' }),
})

// ─── Post media ──────────────────────────────────────────────────────────────
export const postMedia = sqliteTable('post_media', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  postId: integer('post_id')
    .notNull()
    .references(() => posts.id, { onDelete: 'cascade' }),
  kind: text('kind', { enum: ['image', 'audio'] }).notNull(),
  path: text('path').notNull(),
  thumbPath: text('thumb_path'), // images only; feed shows this, links to full
  mime: text('mime').notNull(),
  width: integer('width'),
  height: integer('height'),
  durationSec: real('duration_sec'),
  position: integer('position').notNull().default(0),
})

// ─── Link previews ───────────────────────────────────────────────────────────
export const linkPreviews = sqliteTable('link_previews', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  postId: integer('post_id')
    .notNull()
    .references(() => posts.id, { onDelete: 'cascade' }),
  url: text('url').notNull(),
  title: text('title'),
  description: text('description'),
  imagePath: text('image_path'),
  fetchedAt: integer('fetched_at', { mode: 'timestamp' })
    .notNull()
    .default(sql`(unixepoch())`),
})

// ─── Comments ────────────────────────────────────────────────────────────────
export const comments = sqliteTable('comments', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  postId: integer('post_id')
    .notNull()
    .references(() => posts.id, { onDelete: 'cascade' }),
  authorId: integer('author_id')
    .notNull()
    .references(() => users.id),
  body: text('body').notNull(),
  parentId: integer('parent_id'), // one level of threading; no FK to allow soft-delete parent
  createdAt: integer('created_at', { mode: 'timestamp' })
    .notNull()
    .default(sql`(unixepoch())`),
  editedAt: integer('edited_at', { mode: 'timestamp' }),
  deletedAt: integer('deleted_at', { mode: 'timestamp' }),
})

// ─── Reactions ───────────────────────────────────────────────────────────────
export const reactions = sqliteTable(
  'reactions',
  {
    id: integer('id').primaryKey({ autoIncrement: true }),
    userId: integer('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    targetType: text('target_type', { enum: ['post', 'comment'] }).notNull(),
    targetId: integer('target_id').notNull(),
    kind: text('kind').notNull().default('like'),
    createdAt: integer('created_at', { mode: 'timestamp' })
      .notNull()
      .default(sql`(unixepoch())`),
  },
  (t) => [unique('uniq_reaction').on(t.userId, t.targetType, t.targetId, t.kind)],
)

// ─── Conversations (DMs) ─────────────────────────────────────────────────────
export const conversations = sqliteTable('conversations', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  createdAt: integer('created_at', { mode: 'timestamp' })
    .notNull()
    .default(sql`(unixepoch())`),
})

export const conversationParticipants = sqliteTable(
  'conversation_participants',
  {
    conversationId: integer('conversation_id')
      .notNull()
      .references(() => conversations.id, { onDelete: 'cascade' }),
    userId: integer('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
  },
  (t) => [primaryKey({ columns: [t.conversationId, t.userId] })],
)

export const messages = sqliteTable('messages', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  conversationId: integer('conversation_id')
    .notNull()
    .references(() => conversations.id, { onDelete: 'cascade' }),
  senderId: integer('sender_id')
    .notNull()
    .references(() => users.id),
  body: text('body').notNull(),
  createdAt: integer('created_at', { mode: 'timestamp' })
    .notNull()
    .default(sql`(unixepoch())`),
  readAt: integer('read_at', { mode: 'timestamp' }),
})

// ─── Safety ──────────────────────────────────────────────────────────────────
export const blocks = sqliteTable(
  'blocks',
  {
    blockerId: integer('blocker_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    blockedId: integer('blocked_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    createdAt: integer('created_at', { mode: 'timestamp' })
      .notNull()
      .default(sql`(unixepoch())`),
  },
  (t) => [primaryKey({ columns: [t.blockerId, t.blockedId] })],
)

export const mutes = sqliteTable(
  'mutes',
  {
    muterId: integer('muter_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    mutedId: integer('muted_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    createdAt: integer('created_at', { mode: 'timestamp' })
      .notNull()
      .default(sql`(unixepoch())`),
  },
  (t) => [primaryKey({ columns: [t.muterId, t.mutedId] })],
)

export const reports = sqliteTable('reports', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  reporterId: integer('reporter_id')
    .notNull()
    .references(() => users.id),
  targetType: text('target_type').notNull(),
  targetId: integer('target_id').notNull(),
  reason: text('reason').notNull(),
  status: text('status', { enum: ['open', 'resolved'] }).notNull().default('open'),
  createdAt: integer('created_at', { mode: 'timestamp' })
    .notNull()
    .default(sql`(unixepoch())`),
})

// ─── Admin ───────────────────────────────────────────────────────────────────
// Audit log for every creator promotion — the contribution-wall record
export const creatorGrants = sqliteTable('creator_grants', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  userId: integer('user_id')
    .notNull()
    .references(() => users.id),
  grantedBy: integer('granted_by')
    .notNull()
    .references(() => users.id),
  note: text('note'), // what art they contributed — required in practice, nullable for flexibility
  createdAt: integer('created_at', { mode: 'timestamp' })
    .notNull()
    .default(sql`(unixepoch())`),
})

// ─── Notifications ───────────────────────────────────────────────────────────
export const notifications = sqliteTable('notifications', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  userId: integer('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  type: text('type').notNull(), // 'comment', 'reaction', 'dm'
  sourceId: integer('source_id'), // ID of the triggering entity (comment, reaction, message)
  readAt: integer('read_at', { mode: 'timestamp' }),
  createdAt: integer('created_at', { mode: 'timestamp' })
    .notNull()
    .default(sql`(unixepoch())`),
})
