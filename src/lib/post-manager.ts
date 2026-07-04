import * as FileSystem from 'expo-file-system/legacy';
import type { SQLiteDatabase } from 'expo-sqlite';
import {
  deleteLocalPostRow,
  deleteOutboxEntry,
  getDb,
  getLocalPostsByUser,
  insertLocalPost,
  insertOutboxEntry,
  updateLocalPostStatus,
  type LocalPost,
} from '@/lib/post-db';

function randomUuid(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    return (c === 'x' ? r : (r & 0x3) | 0x8).toString(16);
  });
}

const LOCAL_POSTS_DIR = `${FileSystem.documentDirectory}local-posts/`;

async function ensureLocalPostsDir(): Promise<void> {
  const info = await FileSystem.getInfoAsync(LOCAL_POSTS_DIR);
  if (!info.exists) {
    await FileSystem.makeDirectoryAsync(LOCAL_POSTS_DIR, { intermediates: true });
  }
}

async function copyImageToDocuments(sourceUri: string): Promise<string> {
  await ensureLocalPostsDir();
  const destPath = `${LOCAL_POSTS_DIR}${randomUuid()}.jpg`;
  await FileSystem.copyAsync({ from: sourceUri, to: destPath });
  return destPath;
}

export type SaveLocalPostInput = {
  userId: string;
  localImageUri: string;
  capturedAt: string;
  caption?: string | null;
  privacyScope: string;
  latitude?: number;
  longitude?: number;
};

export type SaveLocalPostResult = {
  localPost: LocalPost;
  error: null;
} | {
  localPost: null;
  error: string;
};

export async function saveLocalPost(input: SaveLocalPostInput): Promise<SaveLocalPostResult> {
  try {
    const db = await getDb();
    const persistedUri = await copyImageToDocuments(input.localImageUri);
    const id = randomUuid();
    const post: Omit<LocalPost, 'created_at' | 'updated_at'> = {
      id,
      user_id: input.userId,
      local_image_uri: persistedUri,
      captured_at: input.capturedAt,
      caption: input.caption ?? null,
      privacy_scope: input.privacyScope,
      latitude: input.latitude ?? null,
      longitude: input.longitude ?? null,
      status: 'local',
      remote_post_id: null,
      storage_object_path: null,
      error_message: null,
    };
    await insertLocalPost(db, post);
    const now = Date.now();
    return { localPost: { ...post, created_at: now, updated_at: now }, error: null };
  } catch (err) {
    return { localPost: null, error: err instanceof Error ? err.message : 'Failed to save post' };
  }
}

export async function queuePostForUpload(
  localPostId: string,
  db?: SQLiteDatabase,
): Promise<{ error: string | null }> {
  try {
    const resolvedDb = db ?? (await getDb());
    const entryId = randomUuid();
    await insertOutboxEntry(resolvedDb, {
      id: entryId,
      local_post_id: localPostId,
      idempotency_key: localPostId,
      attempt_count: 0,
      next_attempt_at: Date.now(),
      last_error: null,
    });
    await updateLocalPostStatus(resolvedDb, localPostId, 'queued');
    return { error: null };
  } catch (err) {
    return { error: err instanceof Error ? err.message : 'Failed to queue post' };
  }
}

export async function getLocalPosts(userId: string): Promise<LocalPost[]> {
  const db = await getDb();
  return getLocalPostsByUser(db, userId);
}

export async function markSynced(
  localPostId: string,
  remotePostId: string,
  storageObjectPath: string,
): Promise<{ error: string | null }> {
  try {
    const db = await getDb();
    await updateLocalPostStatus(db, localPostId, 'synced', {
      remote_post_id: remotePostId,
      storage_object_path: storageObjectPath,
    });
    await deleteOutboxEntry(db, localPostId);

    const post = await db.getFirstAsync<{ local_image_uri: string }>(
      'SELECT local_image_uri FROM local_posts WHERE id = ?',
      localPostId,
    );
    if (post?.local_image_uri) {
      const info = await FileSystem.getInfoAsync(post.local_image_uri);
      if (info.exists) {
        await FileSystem.deleteAsync(post.local_image_uri, { idempotent: true });
      }
    }
    return { error: null };
  } catch (err) {
    return { error: err instanceof Error ? err.message : 'Failed to mark post synced' };
  }
}

export async function deleteLocalPost(localPostId: string): Promise<{ error: string | null }> {
  try {
    const db = await getDb();
    const post = await db.getFirstAsync<{ local_image_uri: string }>(
      'SELECT local_image_uri FROM local_posts WHERE id = ?',
      localPostId,
    );
    if (post?.local_image_uri) {
      const info = await FileSystem.getInfoAsync(post.local_image_uri);
      if (info.exists) {
        await FileSystem.deleteAsync(post.local_image_uri, { idempotent: true });
      }
    }
    await deleteLocalPostRow(db, localPostId);
    return { error: null };
  } catch (err) {
    return { error: err instanceof Error ? err.message : 'Failed to delete post' };
  }
}

export type { LocalPost };
