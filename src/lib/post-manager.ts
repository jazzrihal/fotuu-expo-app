import * as FileSystem from 'expo-file-system/legacy';
import { randomUUID } from 'expo-crypto';
import type { SQLiteDatabase } from 'expo-sqlite';
import {
  deleteLocalPostRow,
  deleteOutboxByLocalPostId,
  getDb,
  getLocalImageUri,
  getLocalPostsByUser,
  insertLocalPost,
  insertOutboxEntry,
  updateLocalPostStatus,
  type LocalPost,
} from '@/lib/post-db';

const LOCAL_POSTS_DIR = `${FileSystem.documentDirectory}local-posts/`;

async function ensureLocalPostsDir(): Promise<void> {
  const info = await FileSystem.getInfoAsync(LOCAL_POSTS_DIR);
  if (!info.exists) {
    await FileSystem.makeDirectoryAsync(LOCAL_POSTS_DIR, { intermediates: true });
  }
}

async function copyImageToDocuments(sourceUri: string): Promise<string> {
  await ensureLocalPostsDir();
  const destPath = `${LOCAL_POSTS_DIR}${randomUUID()}.jpg`;
  await FileSystem.copyAsync({ from: sourceUri, to: destPath });
  return destPath;
}

async function deleteLocalImage(db: SQLiteDatabase, localPostId: string): Promise<void> {
  const uri = await getLocalImageUri(db, localPostId);
  if (uri) {
    const info = await FileSystem.getInfoAsync(uri);
    if (info.exists) {
      await FileSystem.deleteAsync(uri, { idempotent: true });
    }
  }
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
    const id = randomUUID();
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
    const now = Date.now();
    await insertLocalPost(db, post, now);
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
    const entryId = randomUUID();
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
    await deleteOutboxByLocalPostId(db, localPostId);
    await deleteLocalImage(db, localPostId);
    return { error: null };
  } catch (err) {
    return { error: err instanceof Error ? err.message : 'Failed to mark post synced' };
  }
}

export async function deleteLocalPost(localPostId: string): Promise<{ error: string | null }> {
  try {
    const db = await getDb();
    await deleteLocalImage(db, localPostId);
    await deleteLocalPostRow(db, localPostId);
    return { error: null };
  } catch (err) {
    return { error: err instanceof Error ? err.message : 'Failed to delete post' };
  }
}

export type { LocalPost };
