import { supabase } from '@/lib/supabase';
import { createPost } from '@/lib/posts';
import { getDb, getDueOutboxEntries, updateLocalPostStatus, updateOutboxEntry, deleteOutboxEntry } from '@/lib/post-db';
import { markSynced } from '@/lib/post-manager';
import { startUpload } from '../../modules/background-upload/src';

const POST_IMAGES_BUCKET = 'post-images';

const MAX_ATTEMPTS = 6;

function backoffMs(attempt: number): number {
  // Exponential backoff: 30s, 1m, 2m, 4m, 8m, 16m (capped at 20 min)
  const base = 30_000;
  const cap = 20 * 60_000;
  return Math.min(base * Math.pow(2, attempt), cap);
}

// Simple mutex – prevents concurrent sync runs
let running = false;

export type SyncManagerListener = () => void;
const listeners = new Set<SyncManagerListener>();

export function addSyncListener(fn: SyncManagerListener): () => void {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

function notifyListeners() {
  for (const fn of listeners) fn();
}

export async function runSync(): Promise<void> {
  if (running) return;
  running = true;

  try {
    const db = await getDb();
    const entries = await getDueOutboxEntries(db);

    for (const entry of entries) {
      const post = await db.getFirstAsync<{
        id: string;
        user_id: string;
        local_image_uri: string;
        captured_at: string;
        caption: string | null;
        privacy_scope: string;
        latitude: number | null;
        longitude: number | null;
        status: string;
      }>('SELECT * FROM local_posts WHERE id = ?', entry.local_post_id);

      if (!post) {
        await deleteOutboxEntry(db, entry.id);
        continue;
      }

      // Skip if already synced (race condition guard)
      if (post.status === 'synced') {
        await deleteOutboxEntry(db, entry.id);
        continue;
      }

      await updateLocalPostStatus(db, post.id, 'uploading');
      notifyListeners();

      try {
        // Request a presigned upload URL from Supabase Storage
        const storagePath = `${post.user_id}/${post.id}.jpg`;
        const { data: signedData, error: signedError } = await supabase.storage
          .from(POST_IMAGES_BUCKET)
          .createSignedUploadUrl(storagePath);

        if (signedError || !signedData) {
          throw new Error(signedError?.message ?? 'Failed to get presigned upload URL');
        }

        const { signedUrl, token, path } = signedData;

        // Attempt native background upload; fall back to JS XHR on web or
        // if the module is unavailable (simulator without rebuild).
        let uploadError: string | null = null;
        try {
          await startUpload(post.local_image_uri, signedUrl, token, 'image/jpeg');
        } catch {
          // Native module unavailable – fall through to JS upload via the
          // standard supabase path so the flow still works in dev/web.
          uploadError = await jsUploadFallback(post.local_image_uri, path);
        }

        if (uploadError) throw new Error(uploadError);

        // Insert remote post row
        const { data: remotePost, error: insertError } = await createPost({
          storagePath: path,
          capturedAt: post.captured_at,
          caption: post.caption,
          privacyScope: post.privacy_scope as Parameters<typeof createPost>[0]['privacyScope'],
          latitude: post.latitude ?? undefined,
          longitude: post.longitude ?? undefined,
        });

        if (insertError || !remotePost) {
          throw new Error(insertError ?? 'Failed to create remote post');
        }

        await markSynced(post.id, remotePost.id, path);
        notifyListeners();
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Unknown upload error';
        const nextAttempt = entry.attempt_count + 1;

        if (nextAttempt >= MAX_ATTEMPTS) {
          await updateLocalPostStatus(db, post.id, 'failed', { error_message: errorMessage });
          await updateOutboxEntry(db, entry.id, {
            attempt_count: nextAttempt,
            next_attempt_at: Date.now() + backoffMs(nextAttempt),
            last_error: errorMessage,
          });
        } else {
          await updateLocalPostStatus(db, post.id, 'queued', { error_message: errorMessage });
          await updateOutboxEntry(db, entry.id, {
            attempt_count: nextAttempt,
            next_attempt_at: Date.now() + backoffMs(nextAttempt),
            last_error: errorMessage,
          });
        }
        notifyListeners();
      }
    }
  } finally {
    running = false;
  }
}

async function jsUploadFallback(localUri: string, storagePath: string): Promise<string | null> {
  try {
    const arrayBuffer = await new Promise<ArrayBuffer>((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      xhr.responseType = 'arraybuffer';
      xhr.onload = () => resolve(xhr.response as ArrayBuffer);
      xhr.onerror = () => reject(new Error('Failed to read image file'));
      xhr.open('GET', localUri);
      xhr.send();
    });

    const { error } = await supabase.storage
      .from(POST_IMAGES_BUCKET)
      .upload(storagePath, arrayBuffer, { contentType: 'image/jpeg', upsert: true });

    return error?.message ?? null;
  } catch (err) {
    return err instanceof Error ? err.message : 'JS upload fallback failed';
  }
}
