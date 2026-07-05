import * as SQLite from 'expo-sqlite';

export type LocalPostStatus = 'local' | 'queued' | 'uploading' | 'synced' | 'failed';

export type LocalPost = {
  id: string;
  user_id: string;
  local_image_uri: string;
  captured_at: string;
  caption: string | null;
  privacy_scope: string;
  latitude: number | null;
  longitude: number | null;
  status: LocalPostStatus;
  remote_post_id: string | null;
  storage_object_path: string | null;
  error_message: string | null;
  created_at: number;
  updated_at: number;
};

export type UploadOutboxEntry = {
  id: string;
  local_post_id: string;
  idempotency_key: string;
  attempt_count: number;
  next_attempt_at: number;
  last_error: string | null;
  created_at: number;
};

const DB_NAME = 'fotuu-posts.db';

let _db: SQLite.SQLiteDatabase | null = null;

export async function getDb(): Promise<SQLite.SQLiteDatabase> {
  if (_db) return _db;
  _db = await SQLite.openDatabaseAsync(DB_NAME);
  await _db.execAsync('PRAGMA journal_mode = WAL;');
  await migrateDb(_db);
  return _db;
}

export async function migrateDb(db: SQLite.SQLiteDatabase): Promise<void> {
  await db.execAsync(`
    CREATE TABLE IF NOT EXISTS local_posts (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      local_image_uri TEXT NOT NULL,
      captured_at TEXT NOT NULL,
      caption TEXT,
      privacy_scope TEXT NOT NULL DEFAULT 'friends_only',
      latitude REAL,
      longitude REAL,
      status TEXT NOT NULL DEFAULT 'local',
      remote_post_id TEXT,
      storage_object_path TEXT,
      error_message TEXT,
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS upload_outbox (
      id TEXT PRIMARY KEY,
      local_post_id TEXT NOT NULL REFERENCES local_posts(id),
      idempotency_key TEXT NOT NULL UNIQUE,
      attempt_count INTEGER NOT NULL DEFAULT 0,
      next_attempt_at INTEGER NOT NULL,
      last_error TEXT,
      created_at INTEGER NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_local_posts_user_status
      ON local_posts(user_id, status);

    CREATE INDEX IF NOT EXISTS idx_upload_outbox_next_attempt
      ON upload_outbox(next_attempt_at);
  `);
}

export async function insertLocalPost(
  db: SQLite.SQLiteDatabase,
  post: Omit<LocalPost, 'created_at' | 'updated_at'>,
): Promise<void> {
  const now = Date.now();
  await db.runAsync(
    `INSERT INTO local_posts
       (id, user_id, local_image_uri, captured_at, caption, privacy_scope,
        latitude, longitude, status, remote_post_id, storage_object_path,
        error_message, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    post.id,
    post.user_id,
    post.local_image_uri,
    post.captured_at,
    post.caption ?? null,
    post.privacy_scope,
    post.latitude ?? null,
    post.longitude ?? null,
    post.status,
    post.remote_post_id ?? null,
    post.storage_object_path ?? null,
    post.error_message ?? null,
    now,
    now,
  );
}

export async function updateLocalPostStatus(
  db: SQLite.SQLiteDatabase,
  id: string,
  status: LocalPostStatus,
  extra?: {
    remote_post_id?: string;
    storage_object_path?: string;
    error_message?: string | null;
  },
): Promise<void> {
  await db.runAsync(
    `UPDATE local_posts
     SET status = ?, remote_post_id = COALESCE(?, remote_post_id),
         storage_object_path = COALESCE(?, storage_object_path),
         error_message = ?, updated_at = ?
     WHERE id = ?`,
    status,
    extra?.remote_post_id ?? null,
    extra?.storage_object_path ?? null,
    extra?.error_message ?? null,
    Date.now(),
    id,
  );
}

export async function getLocalPostsByUser(
  db: SQLite.SQLiteDatabase,
  userId: string,
): Promise<LocalPost[]> {
  return db.getAllAsync<LocalPost>(
    `SELECT * FROM local_posts
     WHERE user_id = ? AND status != 'synced'
     ORDER BY created_at DESC`,
    userId,
  );
}

export async function getLocalPostById(
  db: SQLite.SQLiteDatabase,
  id: string,
): Promise<LocalPost | null> {
  return db.getFirstAsync<LocalPost>(
    'SELECT * FROM local_posts WHERE id = ?',
    id,
  );
}

export async function deleteLocalPostRow(
  db: SQLite.SQLiteDatabase,
  id: string,
): Promise<void> {
  await db.runAsync('DELETE FROM upload_outbox WHERE local_post_id = ?', id);
  await db.runAsync('DELETE FROM local_posts WHERE id = ?', id);
}

export async function insertOutboxEntry(
  db: SQLite.SQLiteDatabase,
  entry: Omit<UploadOutboxEntry, 'created_at'>,
): Promise<void> {
  const now = Date.now();
  await db.runAsync(
    `INSERT OR IGNORE INTO upload_outbox
       (id, local_post_id, idempotency_key, attempt_count, next_attempt_at, last_error, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    entry.id,
    entry.local_post_id,
    entry.idempotency_key,
    entry.attempt_count,
    entry.next_attempt_at,
    entry.last_error ?? null,
    now,
  );
}

export async function getDueOutboxEntries(
  db: SQLite.SQLiteDatabase,
): Promise<UploadOutboxEntry[]> {
  return db.getAllAsync<UploadOutboxEntry>(
    `SELECT o.* FROM upload_outbox o
     JOIN local_posts p ON p.id = o.local_post_id
     WHERE o.next_attempt_at <= ? AND p.status IN ('queued', 'uploading', 'failed')
     ORDER BY o.created_at ASC`,
    Date.now(),
  );
}

export async function updateOutboxEntry(
  db: SQLite.SQLiteDatabase,
  id: string,
  patch: { attempt_count: number; next_attempt_at: number; last_error: string | null },
): Promise<void> {
  await db.runAsync(
    `UPDATE upload_outbox
     SET attempt_count = ?, next_attempt_at = ?, last_error = ?
     WHERE id = ?`,
    patch.attempt_count,
    patch.next_attempt_at,
    patch.last_error,
    id,
  );
}

export async function deleteOutboxEntry(
  db: SQLite.SQLiteDatabase,
  id: string,
): Promise<void> {
  await db.runAsync('DELETE FROM upload_outbox WHERE id = ?', id);
}
