/**
 * Unit tests for post-db.ts CRUD helpers using an in-memory SQLite mock.
 *
 * The mock DB is a tiny SQL-like engine backed by plain JS Maps.
 * It only implements the subset of SQLite operations that post-db.ts uses.
 */

import {
  migrateDb,
  insertLocalPost,
  getLocalPostsByUser,
  getLocalPostById,
  updateLocalPostStatus,
  deleteLocalPostRow,
  insertOutboxEntry,
  getDueOutboxEntries,
  updateOutboxEntry,
  deleteOutboxEntry,
  type LocalPost,
  type UploadOutboxEntry,
} from '../post-db';

// ---------------------------------------------------------------------------
// Re-export migrateDb so we can call it directly (it's not exported by default).
// We access it via the named export below.
// ---------------------------------------------------------------------------

// ---------------------------------------------------------------------------
// Minimal in-memory SQLite stub
// ---------------------------------------------------------------------------

type Row = Record<string, unknown>;

function buildInMemoryDb() {
  const tables: Record<string, Row[]> = {
    local_posts: [],
    upload_outbox: [],
  };

  /**
   * Extremely minimal SQL parser covering only the statements emitted by post-db.ts.
   * Supports: CREATE TABLE IF NOT EXISTS, CREATE INDEX IF NOT EXISTS,
   *           INSERT INTO/INSERT OR IGNORE INTO, SELECT *, UPDATE, DELETE FROM,
   *           PRAGMA (no-op), JOIN (for getDueOutboxEntries).
   */
  function exec(sql: string, params: unknown[] = []): Row[] {
    const trimmed = sql.trim().replace(/\s+/g, ' ');

    // PRAGMA – no-op
    if (/^PRAGMA/i.test(trimmed)) return [];

    // CREATE TABLE / INDEX – no-op (tables pre-created above)
    if (/^CREATE (TABLE|INDEX)/i.test(trimmed)) return [];

    // INSERT OR IGNORE / INSERT INTO
    if (/^INSERT (OR IGNORE )?INTO (\w+)/i.test(trimmed)) {
      const match = trimmed.match(/^INSERT (OR IGNORE )?INTO (\w+)\s*\(([^)]+)\)\s*VALUES\s*\(([^)]+)\)/i);
      if (!match) throw new Error(`Unsupported INSERT: ${sql}`);
      const orIgnore = !!match[1];
      const table = match[2];
      const cols = match[3].split(',').map((c) => c.trim());
      const rows = tables[table];

      // Bind '?' placeholders
      const values: unknown[] = [];
      let pi = 0;
      const rawValues = match[4].split(',').map((v) => v.trim());
      for (const rv of rawValues) {
        values.push(rv === '?' ? params[pi++] : rv.replace(/^'|'$/g, ''));
      }

      const row: Row = {};
      cols.forEach((c, i) => { row[c] = values[i]; });

      // OR IGNORE: check UNIQUE constraints
      if (orIgnore) {
        if (table === 'upload_outbox') {
          const dup = rows.find(
            (r) => r.idempotency_key === row.idempotency_key,
          );
          if (dup) return [];
        }
      }

      rows.push(row);
      return [];
    }

    // SELECT with JOIN (getDueOutboxEntries)
    if (/^SELECT o\.\* FROM upload_outbox o JOIN/i.test(trimmed)) {
      const now = params[0] as number;
      const posts = tables.local_posts;
      return tables.upload_outbox.filter((o) => {
        const p = posts.find((pp) => pp.id === o.local_post_id);
        if (!p) return false;
        return (
          (o.next_attempt_at as number) <= now &&
          ['queued', 'uploading', 'failed'].includes(p.status as string)
        );
      });
    }

    // SELECT * FROM <table> WHERE ...
    if (/^SELECT \* FROM (\w+)/i.test(trimmed)) {
      const tableMatch = trimmed.match(/^SELECT \* FROM (\w+)/i);
      if (!tableMatch) return [];
      const table = tableMatch[1];
      const rows = tables[table];

      // WHERE user_id = ? AND status != 'synced' ORDER BY created_at DESC
      if (/WHERE user_id = \? AND status != 'synced'/i.test(trimmed)) {
        return [...rows]
          .filter((r) => r.user_id === params[0] && r.status !== 'synced')
          .sort((a, b) => (b.created_at as number) - (a.created_at as number));
      }

      // WHERE id = ?
      if (/WHERE id = \?/i.test(trimmed)) {
        return rows.filter((r) => r.id === params[0]);
      }

      return rows;
    }

    // SELECT local_image_uri FROM local_posts WHERE id = ?
    if (/^SELECT local_image_uri FROM local_posts WHERE id = \?/i.test(trimmed)) {
      const row = tables.local_posts.find((r) => r.id === params[0]);
      return row ? [{ local_image_uri: row.local_image_uri }] : [];
    }

    // UPDATE local_posts SET ...
    if (/^UPDATE local_posts/i.test(trimmed)) {
      // status, remote_post_id (COALESCE), storage_object_path (COALESCE), error_message, updated_at WHERE id
      const [status, remotePostId, storagePath, errorMsg, updatedAt, id] = params as [
        string, string | null, string | null, string | null, number, string
      ];
      tables.local_posts.forEach((r) => {
        if (r.id === id) {
          r.status = status;
          if (remotePostId !== null) r.remote_post_id = remotePostId;
          if (storagePath !== null) r.storage_object_path = storagePath;
          r.error_message = errorMsg;
          r.updated_at = updatedAt;
        }
      });
      return [];
    }

    // UPDATE upload_outbox SET ...
    if (/^UPDATE upload_outbox/i.test(trimmed)) {
      const [attemptCount, nextAttemptAt, lastError, id] = params as [number, number, string | null, string];
      tables.upload_outbox.forEach((r) => {
        if (r.id === id) {
          r.attempt_count = attemptCount;
          r.next_attempt_at = nextAttemptAt;
          r.last_error = lastError;
        }
      });
      return [];
    }

    // DELETE FROM upload_outbox WHERE local_post_id = ?
    if (/^DELETE FROM upload_outbox WHERE local_post_id = \?/i.test(trimmed)) {
      tables.upload_outbox = tables.upload_outbox.filter(
        (r) => r.local_post_id !== params[0],
      );
      return [];
    }

    // DELETE FROM upload_outbox WHERE id = ?
    if (/^DELETE FROM upload_outbox WHERE id = \?/i.test(trimmed)) {
      tables.upload_outbox = tables.upload_outbox.filter(
        (r) => r.id !== params[0],
      );
      return [];
    }

    // DELETE FROM local_posts WHERE id = ?
    if (/^DELETE FROM local_posts WHERE id = \?/i.test(trimmed)) {
      tables.local_posts = tables.local_posts.filter(
        (r) => r.id !== params[0],
      );
      return [];
    }

    throw new Error(`Unhandled SQL: ${sql.substring(0, 80)}`);
  }

  return {
    execAsync: jest.fn(async (sql: string) => { exec(sql); }),
    runAsync: jest.fn(async (sql: string, ...params: unknown[]) => { exec(sql, params); }),
    getAllAsync: jest.fn(async <T>(sql: string, ...params: unknown[]): Promise<T[]> => {
      return exec(sql, params) as T[];
    }),
    getFirstAsync: jest.fn(async <T>(sql: string, ...params: unknown[]): Promise<T | null> => {
      const rows = exec(sql, params) as T[];
      return rows[0] ?? null;
    }),
    _tables: tables,
  };
}

type InMemoryDb = ReturnType<typeof buildInMemoryDb>;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makePost(
  overrides: Partial<Omit<LocalPost, 'created_at' | 'updated_at'>> = {},
): Omit<LocalPost, 'created_at' | 'updated_at'> {
  return {
    id: 'post-1',
    user_id: 'user-a',
    local_image_uri: 'file:///local/img.jpg',
    captured_at: '2024-01-01T12:00:00Z',
    caption: null,
    privacy_scope: 'friends_only',
    latitude: null,
    longitude: null,
    status: 'local',
    remote_post_id: null,
    storage_object_path: null,
    error_message: null,
    ...overrides,
  };
}

function makeOutboxEntry(
  overrides: Partial<Omit<UploadOutboxEntry, 'created_at'>> = {},
): Omit<UploadOutboxEntry, 'created_at'> {
  return {
    id: 'entry-1',
    local_post_id: 'post-1',
    idempotency_key: 'post-1',
    attempt_count: 0,
    next_attempt_at: Date.now() - 1000,
    last_error: null,
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('post-db', () => {
  let db: InMemoryDb;

  beforeEach(async () => {
    db = buildInMemoryDb();
    await migrateDb(db as never);
  });

  // -------------------------------------------------------------------------
  // migrateDb
  // -------------------------------------------------------------------------
  describe('migrateDb', () => {
    it('creates tables idempotently – calling twice does not throw', async () => {
      await expect(migrateDb(db as never)).resolves.toBeUndefined();
    });
  });

  // -------------------------------------------------------------------------
  // insertLocalPost / getLocalPostsByUser
  // -------------------------------------------------------------------------
  describe('insertLocalPost + getLocalPostsByUser', () => {
    it('stores a post and retrieves it (excludes synced)', async () => {
      await insertLocalPost(db as never, makePost());
      const posts = await getLocalPostsByUser(db as never, 'user-a');
      expect(posts).toHaveLength(1);
      expect(posts[0].id).toBe('post-1');
    });

    it('excludes posts with status synced', async () => {
      await insertLocalPost(db as never, makePost({ status: 'synced' }));
      const posts = await getLocalPostsByUser(db as never, 'user-a');
      expect(posts).toHaveLength(0);
    });

    it('only returns posts for the requested userId', async () => {
      await insertLocalPost(db as never, makePost({ user_id: 'user-b' }));
      const posts = await getLocalPostsByUser(db as never, 'user-a');
      expect(posts).toHaveLength(0);
    });
  });

  // -------------------------------------------------------------------------
  // getLocalPostById
  // -------------------------------------------------------------------------
  describe('getLocalPostById', () => {
    it('returns the post when it exists', async () => {
      await insertLocalPost(db as never, makePost());
      const post = await getLocalPostById(db as never, 'post-1');
      expect(post).not.toBeNull();
      expect(post!.id).toBe('post-1');
    });

    it('returns null for a missing id', async () => {
      const post = await getLocalPostById(db as never, 'no-such-id');
      expect(post).toBeNull();
    });
  });

  // -------------------------------------------------------------------------
  // updateLocalPostStatus
  // -------------------------------------------------------------------------
  describe('updateLocalPostStatus', () => {
    beforeEach(async () => {
      await insertLocalPost(db as never, makePost());
    });

    it('transitions status', async () => {
      await updateLocalPostStatus(db as never, 'post-1', 'queued');
      const post = await getLocalPostById(db as never, 'post-1');
      expect(post!.status).toBe('queued');
    });

    it('sets extra fields', async () => {
      await updateLocalPostStatus(db as never, 'post-1', 'synced', {
        remote_post_id: 'remote-1',
        storage_object_path: 'user-a/post-1.jpg',
      });
      const post = await getLocalPostById(db as never, 'post-1');
      expect(post!.remote_post_id).toBe('remote-1');
      expect(post!.storage_object_path).toBe('user-a/post-1.jpg');
    });

    it('COALESCE leaves existing remote_post_id intact when not provided', async () => {
      await updateLocalPostStatus(db as never, 'post-1', 'synced', {
        remote_post_id: 'original-remote',
      });
      await updateLocalPostStatus(db as never, 'post-1', 'failed');
      const post = await getLocalPostById(db as never, 'post-1');
      expect(post!.remote_post_id).toBe('original-remote');
    });
  });

  // -------------------------------------------------------------------------
  // deleteLocalPostRow
  // -------------------------------------------------------------------------
  describe('deleteLocalPostRow', () => {
    it('removes the post and its outbox entries', async () => {
      await insertLocalPost(db as never, makePost());
      await insertOutboxEntry(db as never, makeOutboxEntry());
      await deleteLocalPostRow(db as never, 'post-1');
      const post = await getLocalPostById(db as never, 'post-1');
      const entries = db._tables.upload_outbox;
      expect(post).toBeNull();
      expect(entries).toHaveLength(0);
    });
  });

  // -------------------------------------------------------------------------
  // insertOutboxEntry (idempotency)
  // -------------------------------------------------------------------------
  describe('insertOutboxEntry', () => {
    beforeEach(async () => {
      await insertLocalPost(db as never, makePost());
    });

    it('inserts an entry', async () => {
      await insertOutboxEntry(db as never, makeOutboxEntry());
      expect(db._tables.upload_outbox).toHaveLength(1);
    });

    it('INSERT OR IGNORE: duplicate idempotency_key is a no-op', async () => {
      await insertOutboxEntry(db as never, makeOutboxEntry());
      await insertOutboxEntry(db as never, makeOutboxEntry({ id: 'entry-2' }));
      expect(db._tables.upload_outbox).toHaveLength(1);
    });
  });

  // -------------------------------------------------------------------------
  // getDueOutboxEntries
  // -------------------------------------------------------------------------
  describe('getDueOutboxEntries', () => {
    beforeEach(async () => {
      await insertLocalPost(db as never, makePost({ status: 'queued' }));
    });

    it('returns entries whose next_attempt_at <= now for eligible statuses', async () => {
      await insertOutboxEntry(db as never, makeOutboxEntry({ next_attempt_at: Date.now() - 1 }));
      const entries = await getDueOutboxEntries(db as never);
      expect(entries).toHaveLength(1);
    });

    it('does not return future-scheduled entries', async () => {
      await insertOutboxEntry(db as never, makeOutboxEntry({ next_attempt_at: Date.now() + 60_000 }));
      const entries = await getDueOutboxEntries(db as never);
      expect(entries).toHaveLength(0);
    });

    it('does not return entries for posts with status local', async () => {
      // Override the post to have status 'local'
      db._tables.local_posts[0].status = 'local';
      await insertOutboxEntry(db as never, makeOutboxEntry());
      const entries = await getDueOutboxEntries(db as never);
      expect(entries).toHaveLength(0);
    });
  });

  // -------------------------------------------------------------------------
  // updateOutboxEntry
  // -------------------------------------------------------------------------
  describe('updateOutboxEntry', () => {
    it('updates attempt_count, next_attempt_at, last_error', async () => {
      await insertLocalPost(db as never, makePost());
      await insertOutboxEntry(db as never, makeOutboxEntry());
      const future = Date.now() + 30_000;
      await updateOutboxEntry(db as never, 'entry-1', {
        attempt_count: 1,
        next_attempt_at: future,
        last_error: 'network error',
      });
      const entry = db._tables.upload_outbox[0];
      expect(entry.attempt_count).toBe(1);
      expect(entry.next_attempt_at).toBe(future);
      expect(entry.last_error).toBe('network error');
    });
  });

  // -------------------------------------------------------------------------
  // deleteOutboxEntry
  // -------------------------------------------------------------------------
  describe('deleteOutboxEntry', () => {
    it('removes the outbox entry', async () => {
      await insertLocalPost(db as never, makePost());
      await insertOutboxEntry(db as never, makeOutboxEntry());
      await deleteOutboxEntry(db as never, 'entry-1');
      expect(db._tables.upload_outbox).toHaveLength(0);
    });
  });
});

// Make migrateDb accessible for tests – it's used above via named import.
// This line is intentionally blank to satisfy the linter (no unused import).
export {};
